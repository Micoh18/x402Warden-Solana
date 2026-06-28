import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  buildBlockedPaymentReceiptV1,
  buildPaymentReceiptV1,
  signBlockedPaymentReceiptV1,
  type BlockedPaymentReasonCode,
  type BlockedPaymentReceiptV1,
  deliveryFailureCodeToOnChainCode,
  deliveryFailureCodeToReasonCode,
  evaluateDelivery,
  evidenceHashToReasonUri,
  findAgentAccountPda,
  findDisputeAccountPda,
  findPaymentEvidencePda,
  findPaymentEscrowPda,
  hexToBytes32,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, paid, policyBlock, protectionFailure, error } from "../output";
import {
  type Parsed402,
  parse402Response,
  buildPaymentHeader,
  generateRequestHash,
  generateRequestHashHex,
  hashJson,
} from "../x402-flow";

function formatMicroUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(6);
}

function humanizePolicyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("per call")) return "Payment exceeds per-call policy";
  if (lower.includes("period")) return "Payment exceeds period budget";
  if (lower.includes("paused")) return "Agent is paused";
  if (lower.includes("allowlist") || lower.includes("merchant")) {
    return "Merchant is not allowed by policy";
  }
  if (lower.includes("exceeds")) return msg;
  return msg;
}

function classifyBlockedReason(message: string): BlockedPaymentReasonCode {
  const lower = message.toLowerCase();
  if (lower.includes("max-amount") || lower.includes("maxamount")) {
    return "MAX_AMOUNT_EXCEEDED";
  }
  if (lower.includes("per-call") || lower.includes("per call")) {
    return "PER_CALL_LIMIT";
  }
  if (lower.includes("period")) return "PERIOD_LIMIT";
  if (lower.includes("paused")) return "AGENT_PAUSED";
  if (lower.includes("allowlist") || lower.includes("merchant")) {
    return "MERCHANT_NOT_ALLOWED";
  }
  if (lower.includes("policy") || lower.includes("exceeds")) {
    return "POLICY_BLOCK";
  }
  return "OTHER";
}

function buildSignedBlockedReceipt(args: {
  signer: PublicKey;
  secretKey: Uint8Array;
  agentPda?: PublicKey;
  agentId?: number;
  endpoint: string;
  method: string;
  merchant?: string;
  amountRequested?: number;
  maxAllowed?: number;
  reason: string;
  reasonCode?: BlockedPaymentReasonCode;
  requestContextHash?: string;
  x402RequestHash?: string;
}): BlockedPaymentReceiptV1 {
  return signBlockedPaymentReceiptV1(
    buildBlockedPaymentReceiptV1({
      signer: args.signer,
      agentPda: args.agentPda,
      agentId: args.agentId,
      endpoint: args.endpoint,
      method: args.method,
      merchant: args.merchant,
      amountRequested: args.amountRequested,
      maxAllowed: args.maxAllowed,
      reasonCode: args.reasonCode ?? classifyBlockedReason(args.reason),
      reason: args.reason,
      requestContextHash: args.requestContextHash,
      x402RequestHash: args.x402RequestHash,
    }),
    args.secretKey
  );
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs?: number
): Promise<Response> {
  if (!timeoutMs || timeoutMs <= 0) return fetch(url, opts);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function parseOptionalInteger(value: string | undefined, name: string): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} exceeds safe integer range`);
  }
  return parsed;
}

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  timeoutMs?: number,
  retries = 0
): Promise<Response> {
  const attempts = Math.floor(retries) + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchWithTimeout(url, opts, timeoutMs);
    } catch (err) {
      lastError = err;
      if (attempt === attempts - 1) break;
    }
  }

  throw lastError;
}

async function readResponseBody(
  response: Response,
  expectJson: boolean
): Promise<{ rawBody: string; body: unknown; parseError: boolean; parsedJson?: unknown }> {
  const rawBody = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const shouldParseJson = expectJson || contentType.includes("application/json");

  if (!shouldParseJson) {
    return { rawBody, body: rawBody, parseError: false };
  }

  if (rawBody.trim().length === 0) {
    return { rawBody, body: rawBody, parseError: true };
  }

  try {
    const parsedJson = JSON.parse(rawBody);
    return { rawBody, body: parsedJson, parseError: false, parsedJson };
  } catch {
    return { rawBody, body: rawBody, parseError: true };
  }
}

export const payCommand = new Command("pay")
  .description("Make an HTTP request, automatically handling x402 payments")
  .argument("<url>", "Target URL")
  .option("-m, --method <method>", "HTTP method", "GET")
  .option("-b, --body <body>", "Request body (JSON string)")
  .option("-H, --headers <headers>", "Request headers (JSON string)")
  .option("--max-amount <amount>", "Maximum payment amount (micro-USDC)")
  .option("--agent-id <id>", "Agent ID override")
  .option("--auto-dispute-on-fail", "Open an on-chain dispute if objective delivery checks fail")
  .option("--record-evidence-on-chain", "Persist receipt and delivery evidence hashes on-chain")
  .option(
    "--require-evidence-on-chain",
    "Fail the command if on-chain evidence persistence is requested but not recorded"
  )
  .option("--expect-json", "Require the paid response body to be valid JSON")
  .option("--expect-non-empty", "Require the paid response body to be non-empty")
  .option("--timeout-ms <ms>", "Timeout for HTTP requests in milliseconds")
  .option("--retries <count>", "Additional retry attempts for transport failures/timeouts", "0")
  .action(async (url: string, opts) => {
    let parsedPayment: Parsed402 | undefined;
    let signer: PublicKey | undefined;
    let secretKey: Uint8Array | undefined;
    let agentPdaForReceipt: PublicKey | undefined;
    let agentIdForReceipt: number | undefined;
    let requestContextHash: string | undefined;
    let x402RequestHash: string | undefined;
    const method = String(opts.method || "GET").toUpperCase();
    const maxAllowed = parseOptionalInteger(opts.maxAmount, "--max-amount");
    const timeoutMs = parseOptionalInteger(opts.timeoutMs, "--timeout-ms");
    const retries = parseOptionalInteger(opts.retries, "--retries") ?? 0;
    const expectJson = Boolean(opts.expectJson);
    const expectNonEmpty = Boolean(opts.expectNonEmpty);
    const autoDisputeOnFail = Boolean(opts.autoDisputeOnFail);
    const recordEvidenceOnChain = Boolean(opts.recordEvidenceOnChain);
    const requireEvidenceOnChain = Boolean(opts.requireEvidenceOnChain);

    try {
      if (requireEvidenceOnChain && !recordEvidenceOnChain) {
        throw new Error(
          "--require-evidence-on-chain requires --record-evidence-on-chain"
        );
      }

      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);
      signer = config.wallet.publicKey;
      secretKey = config.keypair.secretKey;
      agentIdForReceipt = config.agentId;

      const headers: Record<string, string> = opts.headers
        ? JSON.parse(opts.headers)
        : {};
      requestContextHash = hashJson({
        url,
        method,
        bodyHash: opts.body ? hashJson(opts.body) : undefined,
        headersHash: Object.keys(headers).length > 0 ? hashJson(headers) : undefined,
      });
      x402RequestHash = generateRequestHashHex(url, method);

      const fetchOpts: RequestInit = {
        method,
        headers,
      };
      if (opts.body) {
        fetchOpts.body = opts.body;
        if (!headers["content-type"] && !headers["Content-Type"]) {
          (fetchOpts.headers as Record<string, string>)["Content-Type"] = "application/json";
        }
      }

      const response = await fetchWithRetry(url, fetchOpts, timeoutMs, retries);

      if (response.ok) {
        const { body } = await readResponseBody(response, false);
        return success({ statusCode: response.status, body });
      }

      if (response.status !== 402) {
        const text = await response.text();
        return error(`HTTP ${response.status}: ${text}`);
      }

      const responseBody = await response.json();
      const payment = parse402Response(responseBody);
      parsedPayment = payment;

      const [agentPda] = findAgentAccountPda(
        config.wallet.publicKey,
        config.agentId,
        config.programId
      );
      agentPdaForReceipt = agentPda;

      if (maxAllowed != null && payment.price > maxAllowed) {
        const reason = `Price ${payment.price} exceeds max-amount ${maxAllowed}`;
        return policyBlock(
          reason,
          {
            endpoint: url,
            amountRequested: payment.price,
            maxAllowed,
            merchant: payment.payTo,
            usdcBlocked: formatMicroUsdc(payment.price),
            blockedSource: "signed_off_chain_record",
            blockedReceipt: buildSignedBlockedReceipt({
              signer,
              secretKey,
              agentPda,
              agentId: config.agentId,
              endpoint: url,
              method,
              merchant: payment.payTo,
              amountRequested: payment.price,
              maxAllowed,
              reason,
              reasonCode: "MAX_AMOUNT_EXCEEDED",
              requestContextHash,
              x402RequestHash,
            }),
          }
        );
      }

      const client = new X402WardenClient({
        connection: config.connection,
        wallet: config.wallet,
        programId: config.programId,
      });

      const agentData = await client.getAgent(agentPda);
      const userTokenAccount = agentData.usdcTokenAccount;
      const paymentId = agentData.paymentCount;
      const [paymentEscrowPda] = findPaymentEscrowPda(
        agentPda,
        paymentId,
        config.programId
      );

      const requestHash = generateRequestHash(url, method);

      const txSignature = await client.processPayment(
        agentPda,
        new BN(payment.price),
        new PublicKey(payment.payTo),
        requestHash,
        userTokenAccount,
        config.usdcMint
      );

      const paymentHeader = buildPaymentHeader(txSignature);

      const retryHeaders = { ...headers, "X-PAYMENT": paymentHeader };
      const retryOpts: RequestInit = {
        method,
        headers: retryHeaders,
      };
      if (opts.body) {
        retryOpts.body = opts.body;
      }

      let retryResponse: Response | undefined;
      let retryBody: unknown = null;
      let rawRetryBody = "";
      let parsedRetryJson: unknown;
      let retryParseError = false;
      let retryTimedOut = false;
      let retryError: string | undefined;

      try {
        retryResponse = await fetchWithRetry(url, retryOpts, timeoutMs, retries);
        const bodyResult = await readResponseBody(retryResponse, expectJson);
        retryBody = bodyResult.body;
        rawRetryBody = bodyResult.rawBody;
        parsedRetryJson = bodyResult.parsedJson;
        retryParseError = bodyResult.parseError;
      } catch (err: any) {
        const message = err?.message || String(err);
        retryError = message;
        retryTimedOut = message.toLowerCase().includes("timed out");
      }

      const responseHash =
        retryResponse != null ? hashJson(rawRetryBody) : undefined;
      const deliveryCheck = evaluateDelivery(
        {
          paymentEscrow: paymentEscrowPda.toBase58(),
          statusCode: retryResponse?.status,
          responseHash,
          bodyText: rawRetryBody,
          parsedJson: parsedRetryJson,
          parseError: retryParseError,
          timedOut: retryTimedOut,
        },
        {
          expectJson,
          expectNonEmpty,
        }
      );
      let deliveryEvidence = {
        ...deliveryCheck.evidence,
        evidenceHash: hashJson(deliveryCheck.evidence),
      };

      let onChainEvidence:
        | {
            recorded: boolean;
            txSignature?: string;
            evidencePda?: string;
            error?: string;
          }
        | undefined;

      if (recordEvidenceOnChain) {
        const [paymentEvidencePda] = findPaymentEvidencePda(
          paymentEscrowPda,
          config.programId
        );

        try {
          const evidenceTxSignature = await client.recordPaymentEvidence(
            agentPda,
            paymentEscrowPda,
            {
              paymentRequirementsHash: hexToBytes32(hashJson(responseBody)),
              requestContextHash: hexToBytes32(requestContextHash),
              responseHash: hexToBytes32(responseHash),
              evidenceHash: hexToBytes32(deliveryEvidence.evidenceHash),
              failureCode: deliveryFailureCodeToOnChainCode(
                deliveryEvidence.failureCode
              ),
              statusCode: retryResponse?.status ?? 0,
            }
          );
          deliveryEvidence = {
            ...deliveryEvidence,
            source: "on_chain_account",
          };
          onChainEvidence = {
            recorded: true,
            txSignature: evidenceTxSignature,
            evidencePda: paymentEvidencePda.toBase58(),
          };
        } catch (err: any) {
          onChainEvidence = {
            recorded: false,
            evidencePda: paymentEvidencePda.toBase58(),
            error: err?.message || String(err),
          };
        }
      }

      let autoDispute:
        | {
            opened: boolean;
            txSignature?: string;
            disputePda?: string;
            reasonCode?: number;
            reasonUri?: string;
            error?: string;
          }
        | undefined;

      if (!deliveryCheck.delivered && autoDisputeOnFail) {
        const reasonCode = deliveryFailureCodeToReasonCode(
          deliveryEvidence.failureCode
        );
        const reasonUri = evidenceHashToReasonUri(deliveryEvidence.evidenceHash);
        const [disputePda] = findDisputeAccountPda(
          paymentEscrowPda,
          config.programId
        );

        try {
          const disputeTxSignature = await client.openDispute(
            agentPda,
            paymentEscrowPda,
            reasonCode,
            reasonUri
          );
          autoDispute = {
            opened: true,
            txSignature: disputeTxSignature,
            disputePda: disputePda.toBase58(),
            reasonCode,
            reasonUri: deliveryEvidence.evidenceHash,
          };
        } catch (err: any) {
          autoDispute = {
            opened: false,
            error: err?.message || String(err),
            disputePda: disputePda.toBase58(),
            reasonCode,
            reasonUri: deliveryEvidence.evidenceHash,
          };
        }
      }

      const escrowAccount = await client.getPayment(paymentEscrowPda);
      const receipt = buildPaymentReceiptV1({
        paymentEscrow: paymentEscrowPda,
        account: escrowAccount,
        paymentRequirementsHash: hashJson(responseBody),
        requestContextHash,
        txSignature,
        deliveryEvidence,
      });

      if (
        requireEvidenceOnChain &&
        (!onChainEvidence || !onChainEvidence.recorded)
      ) {
        return protectionFailure("On-chain evidence recording failed", {
          error:
            onChainEvidence?.error ||
            "recordEvidenceOnChain did not produce a PaymentEvidenceAccount transaction.",
          statusCode: retryResponse?.status,
          txSignature,
          amountPaid: payment.price,
          receipt,
          delivery: {
            delivered: deliveryCheck.delivered,
            decision: deliveryCheck.decision,
            evidence: deliveryEvidence,
            retryError,
          },
          onChainEvidence,
          autoDispute,
          body: retryBody,
        });
      }

      return paid({
        statusCode: retryResponse?.status,
        txSignature,
        amountPaid: payment.price,
        receipt,
        delivery: {
          delivered: deliveryCheck.delivered,
          decision: deliveryCheck.decision,
          evidence: deliveryEvidence,
          retryError,
        },
        onChainEvidence,
        autoDispute,
        body: retryBody,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("policy") ||
        msg.includes("Policy") ||
        msg.includes("exceeds") ||
        msg.includes("paused")
      ) {
        const blockedReceipt =
          signer && secretKey
            ? buildSignedBlockedReceipt({
                signer,
                secretKey,
                agentPda: agentPdaForReceipt,
                agentId: agentIdForReceipt,
                endpoint: url,
                method,
                merchant: parsedPayment?.payTo,
                amountRequested: parsedPayment?.price,
                maxAllowed,
                reason: humanizePolicyError(msg),
                requestContextHash,
                x402RequestHash,
              })
            : undefined;

        return policyBlock(humanizePolicyError(msg), {
          endpoint: url,
          amountRequested: parsedPayment?.price,
          maxAllowed,
          merchant: parsedPayment?.payTo,
          usdcBlocked:
            parsedPayment?.price != null
              ? formatMicroUsdc(parsedPayment.price)
              : undefined,
          blockedSource: blockedReceipt
            ? "signed_off_chain_record"
            : "caller_provided",
          blockedReceipt,
        });
      }
      return error(msg);
    }
  });
