import { PublicKey } from "@solana/web3.js";
import {
  X402WardenClient,
  buildBlockedPaymentReceiptV1,
  buildPaymentReceiptV1,
  deliveryFailureCodeToOnChainCode,
  deliveryFailureCodeToReasonCode,
  evaluateDelivery,
  evidenceHashToReasonUri,
  findDisputeAccountPda,
  findPaymentEvidencePda,
  findPaymentEscrowPda,
  hexToBytes32,
  signBlockedPaymentReceiptV1,
  type BlockedPaymentReasonCode,
  type BlockedPaymentReceiptV1,
  type DeliveryEvidenceV1,
  type PaymentDecision,
  type PaymentReceiptV1,
} from "@x402warden/sdk";
import * as crypto from "crypto";
import { paymentLog, errorLog, log } from "./logger";

export interface InterceptResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
  paymentMade: boolean;
  txSignature?: string;
  amountPaid?: number;
  receipt?: PaymentReceiptV1;
  delivery?: {
    delivered: boolean;
    decision: PaymentDecision;
    evidence: DeliveryEvidenceV1;
    retryError?: string;
  };
  autoDispute?: {
    opened: boolean;
    txSignature?: string;
    disputePda?: string;
    reasonCode?: number;
    reasonUri?: string;
    error?: string;
  };
  onChainEvidence?: {
    recorded: boolean;
    txSignature?: string;
    evidencePda?: string;
    error?: string;
  };
  blockedSource?: "signed_off_chain_record" | "caller_provided";
  blockedReceipt?: BlockedPaymentReceiptV1;
  blockReason?: string;
}

export interface InterceptOptions {
  signer?: PublicKey;
  secretKey?: Uint8Array;
  agentId?: number;
  maxAmount?: number;
  autoDisputeOnFail?: boolean;
  expectJson?: boolean;
  expectNonEmpty?: boolean;
  timeoutMs?: number;
  retries?: number;
  recordEvidenceOnChain?: boolean;
  requireEvidenceOnChain?: boolean;
}

interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
}

interface Parsed402Body {
  payment: Parsed402;
  paymentRequirements: unknown;
}

function parseRequiredMicroUsdc(value: unknown): number {
  const raw = String(value ?? "0");
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid 402 response: maxAmountRequired must be a non-negative integer");
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Invalid 402 response: maxAmountRequired exceeds safe integer range");
  }
  return parsed;
}

function parse402Body(body: Buffer): Parsed402Body {
  const json = JSON.parse(body.toString("utf-8"));
  const accepts = json?.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("Invalid 402 response: missing accepts array");
  }

  const req = accepts[0];
  return {
    payment: {
      price: parseRequiredMicroUsdc(req.maxAmountRequired),
      payTo: req.payTo || "",
      network: req.network || "",
      description: req.description || "",
    },
    paymentRequirements: json,
  };
}

function generateRequestHash(url: string, method: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(`${method}:${url}`);
  return Array.from(hash.digest());
}

function generateRequestHashHex(url: string, method: string): string {
  return crypto.createHash("sha256").update(`${method}:${url}`).digest("hex");
}

function hashBuffer(value: Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashJson(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value ?? null))
    .digest("hex");
}

function buildPaymentHeader(txSignature: string): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { signature: txSignature },
  });
}

function extractHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isTimeoutError(err: unknown): boolean {
  const anyErr = err as { name?: string; message?: string };
  return (
    anyErr?.name === "AbortError" ||
    String(anyErr?.message || err).toLowerCase().includes("timed out")
  );
}

function isPolicyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("policy") ||
    lower.includes("exceeds") ||
    lower.includes("paused") ||
    lower.includes("allowlist") ||
    lower.includes("per call") ||
    lower.includes("period")
  );
}

function humanizePolicyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("per call")) return "Payment exceeds per-call policy";
  if (lower.includes("period")) return "Payment exceeds period budget";
  if (lower.includes("paused")) return "Agent is paused";
  if (lower.includes("allowlist") || lower.includes("merchant")) {
    return "Merchant is not allowed by policy";
  }
  return message;
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

function requestContextHash(args: {
  targetUrl: string;
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
}): string {
  return hashJson({
    url: args.targetUrl,
    method: args.method,
    bodyHash: args.body ? hashBuffer(args.body) : undefined,
    headersHash:
      Object.keys(args.headers).length > 0 ? hashJson(args.headers) : undefined,
  });
}

function tryBuildSignedBlockedReceipt(args: {
  options: InterceptOptions;
  agentPda: PublicKey;
  endpoint: string;
  method: string;
  merchant?: string;
  amountRequested?: number;
  maxAllowed?: number;
  reason: string;
  reasonCode?: BlockedPaymentReasonCode;
  requestContextHash?: string;
  x402RequestHash?: string;
}): BlockedPaymentReceiptV1 | undefined {
  if (!args.options.signer || !args.options.secretKey) return undefined;

  try {
    return signBlockedPaymentReceiptV1(
      buildBlockedPaymentReceiptV1({
        signer: args.options.signer,
        agentPda: args.agentPda,
        agentId: args.options.agentId,
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
      args.options.secretKey
    );
  } catch (err) {
    log("WARN", `Failed to sign blocked payment receipt: ${getErrorMessage(err)}`);
    return undefined;
  }
}

function blockedResult(args: {
  targetUrl: string;
  payment?: Parsed402;
  maxAllowed?: number;
  reason: string;
  blockedReceipt?: BlockedPaymentReceiptV1;
  originalStatusCode?: number;
}): InterceptResult {
  const blockedSource = args.blockedReceipt
    ? "signed_off_chain_record"
    : "caller_provided";
  const payload = {
    status: "blocked",
    blockedBy: "x402warden_payment_firewall",
    reason: args.reason,
    endpoint: args.targetUrl,
    amountRequested: args.payment?.price,
    maxAllowed: args.maxAllowed,
    merchant: args.payment?.payTo,
    blockedSource,
    blockedReceipt: args.blockedReceipt,
  };

  return {
    statusCode: args.originalStatusCode ?? 402,
    headers: { "content-type": "application/json" },
    body: Buffer.from(JSON.stringify(payload)),
    paymentMade: false,
    blockedSource,
    blockedReceipt: args.blockedReceipt,
    blockReason: args.reason,
  };
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
  } catch (err) {
    if (isTimeoutError(err)) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeRetries(retries?: number): number {
  if (retries == null) return 0;
  if (!Number.isFinite(retries) || retries < 0) return 0;
  return Math.floor(retries);
}

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  timeoutMs?: number,
  retries?: number
): Promise<Response> {
  const attempts = normalizeRetries(retries) + 1;
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
): Promise<{
  rawBuffer: Buffer;
  rawBody: string;
  parseError: boolean;
  parsedJson?: unknown;
}> {
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const rawBody = rawBuffer.toString("utf-8");
  const contentType = response.headers.get("content-type") || "";
  const shouldParseJson = expectJson || contentType.includes("application/json");

  if (!shouldParseJson) {
    return { rawBuffer, rawBody, parseError: false };
  }

  if (rawBody.trim().length === 0) {
    return { rawBuffer, rawBody, parseError: true };
  }

  try {
    return {
      rawBuffer,
      rawBody,
      parseError: false,
      parsedJson: JSON.parse(rawBody),
    };
  } catch {
    return { rawBuffer, rawBody, parseError: true };
  }
}

let paymentLock = Promise.resolve();

function withPaymentLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = paymentLock.then(fn);
  paymentLock = result.then(
    () => {},
    () => {}
  );
  return result;
}

export async function interceptRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
  client: X402WardenClient,
  agentPda: PublicKey,
  usdcMint: PublicKey,
  options: InterceptOptions = {}
): Promise<InterceptResult> {
  const fetchOpts: RequestInit = {
    method,
    headers: { ...headers },
    body: method !== "GET" && method !== "HEAD" && body ? Uint8Array.from(body) : undefined,
  };

  delete (fetchOpts.headers as Record<string, string>)["host"];
  delete (fetchOpts.headers as Record<string, string>)["connection"];
  delete (fetchOpts.headers as Record<string, string>)["transfer-encoding"];

  const cleanHeaders = fetchOpts.headers as Record<string, string>;
  const reqContextHash = requestContextHash({
    targetUrl,
    method,
    headers: cleanHeaders,
    body,
  });
  const x402RequestHash = generateRequestHashHex(targetUrl, method);

  if (options.requireEvidenceOnChain && !options.recordEvidenceOnChain) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: Buffer.from(
        JSON.stringify({
          error: "Invalid protection configuration",
          details:
            "requireEvidenceOnChain requires recordEvidenceOnChain to be enabled.",
        })
      ),
      paymentMade: false,
    };
  }

  let response: Response;
  try {
    response = await fetchWithRetry(
      targetUrl,
      fetchOpts,
      options.timeoutMs,
      options.retries
    );
  } catch (err) {
    errorLog(targetUrl, err);
    const errMsg = getErrorMessage(err);
    return {
      statusCode: isTimeoutError(err) ? 504 : 502,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify({ error: "Bad Gateway", details: errMsg })),
      paymentMade: false,
    };
  }

  const responseBody = Buffer.from(await response.arrayBuffer());
  const responseHeaders = extractHeaders(response.headers);

  if (response.ok) {
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  if (response.status !== 402) {
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  log("INFO", `402 received from ${targetUrl}, processing payment...`);

  let parsed: Parsed402;
  let paymentRequirements: unknown;
  try {
    const parsedBody = parse402Body(responseBody);
    parsed = parsedBody.payment;
    paymentRequirements = parsedBody.paymentRequirements;
  } catch (err) {
    errorLog(targetUrl, `Failed to parse 402 body: ${err}`);
    return {
      statusCode: 402,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  if (options.maxAmount != null && parsed.price > options.maxAmount) {
    const reason = `Price ${parsed.price} exceeds max-amount ${options.maxAmount}`;
    const blockedReceipt = tryBuildSignedBlockedReceipt({
      options,
      agentPda,
      endpoint: targetUrl,
      method,
      merchant: parsed.payTo,
      amountRequested: parsed.price,
      maxAllowed: options.maxAmount,
      reason,
      reasonCode: "MAX_AMOUNT_EXCEEDED",
      requestContextHash: reqContextHash,
      x402RequestHash,
    });
    return blockedResult({
      targetUrl,
      payment: parsed,
      maxAllowed: options.maxAmount,
      reason,
      blockedReceipt,
    });
  }

  const startTime = Date.now();

  try {
    const paymentResult = await withPaymentLock(async () => {
      const requestHash = generateRequestHash(targetUrl, method);
      const merchant = new PublicKey(parsed.payTo);

      const agentData = await client.getAgent(agentPda);
      const userTokenAccount = agentData.usdcTokenAccount;
      const [paymentEscrowPda] = findPaymentEscrowPda(
        agentPda,
        agentData.paymentCount,
        client.programId
      );

      const txSignature = await client.processPayment(
        agentPda,
        parsed.price,
        merchant,
        requestHash,
        userTokenAccount,
        usdcMint
      );

      return { paymentEscrowPda, txSignature };
    });

    const duration = Date.now() - startTime;
    paymentLog(targetUrl, parsed.price, paymentResult.txSignature, duration);

    const retryHeaders = {
      ...(fetchOpts.headers as Record<string, string>),
      "X-PAYMENT": buildPaymentHeader(paymentResult.txSignature),
    };

    let retryResponse: Response | undefined;
    let retryBody: Buffer = Buffer.alloc(0);
    let retryBodyText = "";
    let parsedRetryJson: unknown;
    let retryParseError = false;
    let retryTimedOut = false;
    let retryError: string | undefined;
    let retryResponseHeaders: Record<string, string> = {
      "content-type": "application/json",
    };

    try {
      retryResponse = await fetchWithRetry(
        targetUrl,
        {
          method,
          headers: retryHeaders,
          body:
            method !== "GET" && method !== "HEAD" && body
              ? Uint8Array.from(body)
              : undefined,
        },
        options.timeoutMs,
        options.retries
      );
      const retryBodyResult = await readResponseBody(
        retryResponse,
        Boolean(options.expectJson)
      );
      retryBody = retryBodyResult.rawBuffer;
      retryBodyText = retryBodyResult.rawBody;
      parsedRetryJson = retryBodyResult.parsedJson;
      retryParseError = retryBodyResult.parseError;
      retryResponseHeaders = extractHeaders(retryResponse.headers);
    } catch (err) {
      retryError = getErrorMessage(err);
      retryTimedOut = isTimeoutError(err);
      errorLog(targetUrl, `Paid retry failed: ${retryError}`);
    }

    const responseHash = retryBody.length > 0 ? hashBuffer(retryBody) : undefined;
    const deliveryCheck = evaluateDelivery(
      {
        paymentEscrow: paymentResult.paymentEscrowPda.toBase58(),
        statusCode: retryResponse?.status,
        responseHash,
        bodyText: retryBodyText,
        parsedJson: parsedRetryJson,
        parseError: retryParseError,
        timedOut: retryTimedOut,
      },
      {
        expectJson: Boolean(options.expectJson),
        expectNonEmpty: Boolean(options.expectNonEmpty),
      }
    );
    let deliveryEvidence: DeliveryEvidenceV1 = {
      ...deliveryCheck.evidence,
      evidenceHash: hashJson(deliveryCheck.evidence),
    };

    let onChainEvidence: InterceptResult["onChainEvidence"];
    if (options.recordEvidenceOnChain) {
      const [paymentEvidencePda] = findPaymentEvidencePda(
        paymentResult.paymentEscrowPda,
        client.programId
      );

      try {
        const evidenceTxSignature = await client.recordPaymentEvidence(
          agentPda,
          paymentResult.paymentEscrowPda,
          {
            paymentRequirementsHash: hexToBytes32(hashJson(paymentRequirements)),
            requestContextHash: hexToBytes32(reqContextHash),
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
      } catch (err) {
        onChainEvidence = {
          recorded: false,
          evidencePda: paymentEvidencePda.toBase58(),
          error: getErrorMessage(err),
        };
      }
    }

    let autoDispute: InterceptResult["autoDispute"];
    if (!deliveryCheck.delivered && options.autoDisputeOnFail) {
      const reasonCode = deliveryFailureCodeToReasonCode(
        deliveryEvidence.failureCode
      );
      const reasonUri = evidenceHashToReasonUri(deliveryEvidence.evidenceHash!);
      const [disputePda] = findDisputeAccountPda(
        paymentResult.paymentEscrowPda,
        client.programId
      );

      try {
        const disputeTxSignature = await client.openDispute(
          agentPda,
          paymentResult.paymentEscrowPda,
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
      } catch (err) {
        autoDispute = {
          opened: false,
          error: getErrorMessage(err),
          disputePda: disputePda.toBase58(),
          reasonCode,
          reasonUri: deliveryEvidence.evidenceHash,
        };
      }
    }

    const escrowAccount = await client.getPayment(paymentResult.paymentEscrowPda);
    const receipt = buildPaymentReceiptV1({
      paymentEscrow: paymentResult.paymentEscrowPda,
      account: escrowAccount,
      paymentRequirementsHash: hashJson(paymentRequirements),
      requestContextHash: reqContextHash,
      txSignature: paymentResult.txSignature,
      deliveryEvidence,
    });

    if (
      options.requireEvidenceOnChain &&
      (!onChainEvidence || !onChainEvidence.recorded)
    ) {
      return {
        statusCode: 502,
        headers: { "content-type": "application/json" },
        body: Buffer.from(
          JSON.stringify({
            error: "On-chain evidence recording failed",
            details:
              onChainEvidence?.error ||
              "recordEvidenceOnChain did not produce a PaymentEvidenceAccount transaction.",
            delivery: {
              delivered: deliveryCheck.delivered,
              decision: deliveryCheck.decision,
              evidence: deliveryEvidence,
            },
            onChainEvidence,
            autoDispute,
          })
        ),
        paymentMade: true,
        txSignature: paymentResult.txSignature,
        amountPaid: parsed.price,
        receipt,
        delivery: {
          delivered: deliveryCheck.delivered,
          decision: deliveryCheck.decision,
          evidence: deliveryEvidence,
          retryError,
        },
        onChainEvidence,
        autoDispute,
      };
    }

    if (!retryResponse) {
      return {
        statusCode: retryTimedOut ? 504 : 502,
        headers: retryResponseHeaders,
        body: Buffer.from(
          JSON.stringify({
            error: retryTimedOut ? "Paid request timed out" : "Paid request failed",
            details: retryError,
            delivery: {
              delivered: deliveryCheck.delivered,
              decision: deliveryCheck.decision,
              evidence: deliveryEvidence,
            },
            onChainEvidence,
            autoDispute,
          })
        ),
        paymentMade: true,
        txSignature: paymentResult.txSignature,
        amountPaid: parsed.price,
        receipt,
        delivery: {
          delivered: deliveryCheck.delivered,
          decision: deliveryCheck.decision,
          evidence: deliveryEvidence,
          retryError,
        },
        onChainEvidence,
        autoDispute,
      };
    }

    return {
      statusCode: retryResponse.status,
      headers: retryResponseHeaders,
      body: retryBody,
      paymentMade: true,
      txSignature: paymentResult.txSignature,
      amountPaid: parsed.price,
      receipt,
      delivery: {
        delivered: deliveryCheck.delivered,
        decision: deliveryCheck.decision,
        evidence: deliveryEvidence,
        retryError,
      },
      onChainEvidence,
      autoDispute,
    };
  } catch (err) {
    errorLog(targetUrl, err);
    const errMsg = getErrorMessage(err);
    if (isPolicyError(errMsg)) {
      const reason = humanizePolicyError(errMsg);
      const blockedReceipt = tryBuildSignedBlockedReceipt({
        options,
        agentPda,
        endpoint: targetUrl,
        method,
        merchant: parsed.payTo,
        amountRequested: parsed.price,
        maxAllowed: options.maxAmount,
        reason,
        requestContextHash: reqContextHash,
        x402RequestHash,
      });

      return blockedResult({
        targetUrl,
        payment: parsed,
        maxAllowed: options.maxAmount,
        reason,
        blockedReceipt,
      });
    }

    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: Buffer.from(
        JSON.stringify({ error: "Payment processing failed", details: errMsg })
      ),
      paymentMade: false,
    };
  }
}
