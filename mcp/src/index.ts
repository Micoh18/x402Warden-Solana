#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { Wallet, BN } = anchor;
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import {
  X402WardenClient,
  PROGRAM_ID,
  buildBlockedPaymentReceiptV1,
  buildMerchantRiskProfile,
  buildPaymentReceiptV1,
  buildProtectionMetricsV1,
  deliveryFailureCodeToOnChainCode,
  deliveryFailureCodeToReasonCode,
  evaluateDelivery,
  evidenceHashToReasonUri,
  findAgentAccountPda,
  findDisputeAccountPda,
  findPaymentEvidencePda,
  findPaymentEscrowPda,
  findPolicyAccountPda,
  hexToBytes32,
  signBlockedPaymentReceiptV1,
} from "./sdk/index.js";
import type {
  BlockedPaymentReasonCode,
  BlockedPaymentReceiptV1,
  SetPolicyParams,
} from "./sdk/index.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// ── Config ──

interface McpConfig {
  keypair: Keypair;
  connection: Connection;
  wallet: any;
  agentId: number;
  usdcMint: PublicKey;
  programId: PublicKey;
}

function loadConfig(agentIdOverride?: number): McpConfig {
  const keypairPath =
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const wallet = new Wallet(keypair);

  const agentId =
    agentIdOverride ?? (process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : 0);

  const usdcMint = new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );

  return { keypair, connection, wallet, agentId, usdcMint, programId: PROGRAM_ID };
}

// ── x402 flow helpers ──

interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
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

function parse402Response(body: any): Parsed402 {
  const accepts = body?.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("Invalid 402 response: missing accepts array");
  }
  const req = accepts[0];
  return {
    price: parseRequiredMicroUsdc(req.maxAmountRequired),
    payTo: req.payTo || "",
    network: req.network || "",
    description: req.description || "",
  };
}

function buildPaymentHeader(txSignature: string): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { signature: txSignature },
  });
}

function generateRequestHash(url: string, method: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(`${method}:${url}`);
  return Array.from(hash.digest());
}

function generateRequestHashHex(url: string, method: string): string {
  return crypto.createHash("sha256").update(`${method}:${url}`).digest("hex");
}

function hashJson(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value ?? null))
    .digest("hex");
}

function formatMicroUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(6);
}

function formatMicroUsdcValue(amount: string | number): string {
  return formatMicroUsdc(bnToNumberSafe(amount));
}

function bnToNumberSafe(value: any): number {
  const bn = BN.isBN(value) ? value : new BN(value ?? 0);
  const maxSafe = new BN(Number.MAX_SAFE_INTEGER);
  if (bn.gt(maxSafe)) return Number.MAX_SAFE_INTEGER;
  return bn.toNumber();
}

function getStateKey(state: Record<string, object> | undefined): string {
  return state ? Object.keys(state)[0] || "unknown" : "unknown";
}

function isMissingPaymentEvidenceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /account (does not exist|not found)|could not find account|AccountNotFound/i.test(message);
}

function humanizeBlockReason(args: {
  amountRequested?: number;
  maxAllowed?: number;
  merchant?: string;
  policyReason?: string;
}): string {
  if (
    args.amountRequested != null &&
    args.maxAllowed != null &&
    args.amountRequested > args.maxAllowed
  ) {
    return `Requested ${formatMicroUsdc(args.amountRequested)} USDC exceeds the allowed ${formatMicroUsdc(args.maxAllowed)} USDC cap.`;
  }

  const reason = (args.policyReason || "").toLowerCase();
  if (reason.includes("per call")) return "Payment exceeds the agent's per-call policy.";
  if (reason.includes("period")) return "Payment exceeds the agent's period budget.";
  if (reason.includes("paused")) return "Agent is paused, so no payment should be sent.";
  if (reason.includes("allowlist") || reason.includes("merchant")) {
    return `Merchant${args.merchant ? ` ${args.merchant}` : ""} is not allowed by the active policy.`;
  }

  return args.policyReason || "Payment was blocked by the x402warden payment firewall.";
}

// ── BN serialization ──

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
  endpoint?: string;
  method?: string;
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

function normalizeRetries(retries: unknown): number {
  if (retries == null) return 0;
  if (typeof retries !== "number" || !Number.isFinite(retries) || retries < 0) {
    throw new Error("retries must be a non-negative number");
  }
  return Math.floor(retries);
}

async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  timeoutMs?: number,
  retries = 0
): Promise<Response> {
  const attempts = retries + 1;
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

function bnToString(val: unknown): string {
  if (BN.isBN(val)) return val.toString();
  return String(val);
}

function serializeAccount(obj: Record<string, any>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (BN.isBN(val)) {
      out[key] = bnToString(val);
    } else if (val && typeof val === "object" && "toBase58" in val) {
      out[key] = val.toBase58();
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ── Tool handlers ──

async function handlePay(args: Record<string, unknown>) {
  const url = args.url as string;
  const method = (args.method as string) || "GET";
  const body = args.body as string | undefined;
  const headersRaw = args.headers as string | undefined;
  const maxAmount = args.maxAmount as number | undefined;
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const autoDisputeOnFail = Boolean(args.autoDisputeOnFail);
  const recordEvidenceOnChain = Boolean(args.recordEvidenceOnChain);
  const requireEvidenceOnChain = Boolean(args.requireEvidenceOnChain);
  const expectJson = Boolean(args.expectJson);
  const expectNonEmpty = Boolean(args.expectNonEmpty);
  const timeoutMs = args.timeoutMs != null ? (args.timeoutMs as number) : undefined;
  const retries = normalizeRetries(args.retries);

  if (requireEvidenceOnChain && !recordEvidenceOnChain) {
    throw new Error(
      "requireEvidenceOnChain requires recordEvidenceOnChain to be enabled"
    );
  }

  const config = loadConfig(agentIdOverride);
  const headers: Record<string, string> = headersRaw ? JSON.parse(headersRaw) : {};
  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );
  const requestContextHash = hashJson({
    url,
    method,
    bodyHash: body ? hashJson(body) : undefined,
    headersHash: Object.keys(headers).length > 0 ? hashJson(headers) : undefined,
  });
  const x402RequestHash = generateRequestHashHex(url, method);

  const fetchOpts: RequestInit = { method, headers };
  if (body) {
    fetchOpts.body = body;
    if (!headers["content-type"] && !headers["Content-Type"]) {
      (fetchOpts.headers as Record<string, string>)["Content-Type"] = "application/json";
    }
  }

  const response = await fetchWithRetry(url, fetchOpts, timeoutMs, retries);

  if (response.ok) {
    const { body: responseBody } = await readResponseBody(response, false);
    return { status: "ok", statusCode: response.status, body: responseBody };
  }

  if (response.status !== 402) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const responseBody = await response.json();
  const payment = parse402Response(responseBody);

  if (maxAmount != null && payment.price > maxAmount) {
    const reason = `Price ${payment.price} exceeds maxAmount ${maxAmount}`;
    return {
      ...(await handleExplainBlock({
        endpoint: url,
        merchant: payment.payTo,
        amountRequested: payment.price,
        maxAllowed: maxAmount,
        reason,
      })),
      blockedSource: "signed_off_chain_record",
      blockedReceipt: buildSignedBlockedReceipt({
        signer: config.wallet.publicKey,
        secretKey: config.keypair.secretKey,
        agentPda,
        agentId: config.agentId,
        endpoint: url,
        method,
        merchant: payment.payTo,
        amountRequested: payment.price,
        maxAllowed: maxAmount,
        reason,
        reasonCode: "MAX_AMOUNT_EXCEEDED",
        requestContextHash,
        x402RequestHash,
      }),
    };
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
  const retryOpts: RequestInit = { method, headers: retryHeaders };
  if (body) {
    retryOpts.body = body;
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
    return {
      status: "protection_failed",
      reason: "On-chain evidence recording failed",
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
    };
  }

  return {
    status: "paid",
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
  };
}

async function handleExplainBlock(args: Record<string, unknown>) {
  const amountRequested = args.amountRequested as number | undefined;
  const maxAllowed = args.maxAllowed as number | undefined;
  const endpoint = args.endpoint as string | undefined;
  const merchant = args.merchant as string | undefined;
  const policyReason = args.reason as string | undefined;

  const explanation = humanizeBlockReason({
    amountRequested,
    maxAllowed,
    merchant,
    policyReason,
  });

  return {
    status: "blocked",
    blockedBy: "x402warden_payment_firewall",
    endpoint,
    merchant,
    amountRequested,
    maxAllowed,
    usdcBlocked:
      amountRequested != null ? formatMicroUsdc(amountRequested) : undefined,
    blockedSource: "caller_provided",
    reason: policyReason || explanation,
    explanation,
    buyerProtection:
      "No escrow was created and no USDC should leave the buyer before policy approval.",
    nextStep:
      "Lower the payment amount, change the policy, approve the merchant, or choose a trusted endpoint.",
  };
}

async function handleBalance() {
  const config = loadConfig();

  const solBalance = await config.connection.getBalance(config.wallet.publicKey);
  const sol = (solBalance / LAMPORTS_PER_SOL).toString();

  let usdc = "0";
  let usdcAccountAddress = "none";

  try {
    const ata = await getAssociatedTokenAddress(
      config.usdcMint,
      config.wallet.publicKey
    );
    const tokenAccount = await getAccount(config.connection, ata);
    usdcAccountAddress = ata.toBase58();
    usdc = (Number(tokenAccount.amount) / 1_000_000).toString();
  } catch {
    // No USDC token account
  }

  return {
    sol,
    usdc,
    walletAddress: config.wallet.publicKey.toBase58(),
    usdcAccount: usdcAccountAddress,
  };
}

async function handleStatus(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const agentData = await client.getAgent(agentPda);
  const agent = serializeAccount(agentData as any);

  const [policyPda] = findPolicyAccountPda(agentPda, config.programId);
  let policy: Record<string, unknown> | null = null;
  try {
    const policyData = await client.getPolicy(policyPda);
    policy = serializeAccount(policyData as any);
  } catch {
    policy = null;
  }

  return { agentPda: agentPda.toBase58(), agent, policy };
}

async function handleReceipt(args: Record<string, unknown>) {
  const payment = String(args.payment ?? "");
  if (!payment) throw new Error("payment is required");

  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [configuredAgentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const paymentEscrowPda =
    args.escrow === true || !/^\d+$/.test(payment)
      ? new PublicKey(payment)
      : findPaymentEscrowPda(
          configuredAgentPda,
          new BN(payment),
          config.programId
        )[0];

  const account = await client.getPayment(paymentEscrowPda);
  const [paymentEvidencePda] = findPaymentEvidencePda(
    paymentEscrowPda,
    config.programId
  );
  let paymentEvidence;
  try {
    paymentEvidence = await client.getPaymentEvidence(paymentEvidencePda);
  } catch (err) {
    if (!isMissingPaymentEvidenceError(err)) throw err;
    paymentEvidence = undefined;
  }

  const receipt = buildPaymentReceiptV1({
    paymentEscrow: paymentEscrowPda,
    account,
    paymentEvidence,
    paymentRequirementsHash: args.paymentRequirementsHash as string | undefined,
    requestContextHash: args.requestContextHash as string | undefined,
    txSignature: args.txSignature as string | undefined,
  });

  return {
    receipt,
    configuredAgentPda: configuredAgentPda.toBase58(),
    agentMatchesConfigured:
      receipt.agentPda === configuredAgentPda.toBase58(),
    paymentEvidencePda: paymentEvidencePda.toBase58(),
    onChainEvidenceFound: Boolean(paymentEvidence),
    note:
      "On-chain escrow fields are authoritative. If PaymentEvidenceAccount exists, receipt hashes are attached from it; otherwise HTTP-only hashes are included only when provided by the caller.",
  };
}

async function handleSpendReport(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const blockedAmount = args.blockedAmount as number | undefined;
  const blockedReceipts = Array.isArray(args.blockedReceipts)
    ? (args.blockedReceipts as BlockedPaymentReceiptV1[])
    : undefined;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const agentData = await client.getAgent(agentPda);
  const [policyPda] = findPolicyAccountPda(agentPda, config.programId);

  let policyData: any | null = null;
  try {
    policyData = await client.getPolicy(policyPda);
  } catch {
    policyData = null;
  }

  const paymentAccounts = await (client.program.account as any)["paymentEscrow"].all([
    { memcmp: { offset: 8, bytes: agentPda.toBase58() } },
  ]);

  const payments = paymentAccounts.map((payment: any) => {
    const account = payment.account;
    const amount = BN.isBN(account.amount) ? account.amount : new BN(account.amount);
    const state = getStateKey(account.state);

    return {
      paymentEscrow: payment.publicKey.toBase58(),
      paymentId: bnToString(account.paymentId),
      merchant: account.merchant.toBase58(),
      amount: amount.toString(),
      usdcAmount: formatMicroUsdc(bnToNumberSafe(amount)),
      state,
      settleAfter: bnToString(account.settleAfter),
    };
  });

  const protection = buildProtectionMetricsV1({
    payments: paymentAccounts,
    blockedReceipts,
    localBlockedEstimate: blockedAmount,
  });

  const disputedLifetime = BN.isBN(agentData.totalDisputedLifetime)
    ? agentData.totalDisputedLifetime
    : new BN(agentData.totalDisputedLifetime);

  return {
    agentId: config.agentId,
    agentPda: agentPda.toBase58(),
    wallet: config.wallet.publicKey.toBase58(),
    summary: {
      usdcProtected: formatMicroUsdcValue(protection.amounts.usdcProtected),
      protectedSource: protection.sources.usdcProtected,
      usdcBlocked:
        protection.statuses.usdcBlocked === "unavailable"
          ? "unavailable"
          : formatMicroUsdcValue(protection.amounts.usdcBlocked),
      blockedSource: protection.sources.usdcBlocked,
      blockedStatus: protection.statuses.usdcBlocked,
      blockedReceiptCount: protection.counts.blockedReceipts,
      invalidBlockedReceiptCount: protection.counts.invalidBlockedReceipts,
      usdcRecovered: formatMicroUsdcValue(protection.amounts.usdcRecovered),
      recoveredSource: protection.sources.usdcRecovered,
      recoveredEscrowCount: protection.counts.recoveredEscrows,
      usdcSettled: formatMicroUsdcValue(protection.amounts.usdcSettled),
      settledSource: protection.sources.usdcSettled,
      settledEscrowCount: protection.counts.settledEscrows,
      usdcDisputedLifetime: formatMicroUsdc(bnToNumberSafe(disputedLifetime)),
      disputedLifetimeSource: "agent.totalDisputedLifetime",
      activeEscrowCount: protection.counts.activeEscrows,
      activeEscrowUsdc: formatMicroUsdcValue(protection.amounts.activeEscrow),
      paymentCount: payments.length,
      metrics: protection.metrics,
    },
    policy: policyData
      ? {
          maxPerCall: bnToString(policyData.maxPerCall),
          maxPerPeriod: bnToString(policyData.maxPerPeriod),
          spentInPeriod: bnToString(policyData.spentInPeriod),
          allowlistEnabled: policyData.allowlistEnabled,
          disputeWindowSeconds: policyData.disputeWindowSeconds,
        }
      : null,
    payments,
  };
}

async function handleMerchantScore(args: Record<string, unknown>) {
  const merchant = args.merchant as string;
  const merchantPk = new PublicKey(merchant);
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const minimumSampleSize =
    args.minimumSampleSize != null ? (args.minimumSampleSize as number) : 3;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const paymentAccounts = await (client.program.account as any)["paymentEscrow"].all([
    { memcmp: { offset: 8, bytes: agentPda.toBase58() } },
  ]);

  const profile = buildMerchantRiskProfile({
    merchant: merchantPk.toBase58(),
    payments: paymentAccounts,
    minimumSampleSize,
  });

  return {
    agentId: config.agentId,
    agentPda: agentPda.toBase58(),
    wallet: config.wallet.publicKey.toBase58(),
    profile: {
      ...profile,
      totalVolumeUsdc: formatMicroUsdcValue(profile.totalVolume),
    },
  };
}

async function handleInit(args: Record<string, unknown>) {
  const agentId = args.agentId as number;
  const config = loadConfig(agentId);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    agentId,
    config.programId
  );
  const [policyPda] = findPolicyAccountPda(agentPda, config.programId);

  const usdcAccount = new PublicKey(args.usdcAccount as string);

  const txSignature = await client.createAgent(
    agentId,
    usdcAccount,
    agentPda,
    policyPda
  );

  return {
    txSignature,
    agentPda: agentPda.toBase58(),
    policyPda: policyPda.toBase58(),
  };
}

async function handleSetPolicy(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const params: SetPolicyParams = {
    maxPerCall: new BN(args.maxPerCall as number),
    maxPerPeriod: new BN(args.maxPerPeriod as number),
    periodSeconds: new BN((args.periodSeconds as number) ?? 86400),
    disputeWindowSeconds: (args.disputeWindow as number) ?? 300,
    allowlistEnabled: (args.allowlistEnabled as boolean) ?? false,
    autoSettleEnabled: (args.autoSettleEnabled as boolean) ?? true,
  };

  const txSignature = await client.setPolicy(agentPda, params);

  return { txSignature };
}

async function handleSettle(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const paymentId = args.paymentId as number;
  const config = loadConfig(agentIdOverride);

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const { findPaymentEscrowPda } = await import("./sdk/pda.js");
  const [escrowPda] = findPaymentEscrowPda(agentPda, paymentId, config.programId);

  const escrowData = await client.getPayment(escrowPda);
  const merchantPubkey = escrowData.merchant;

  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  const merchantTokenAccount = await getAssociatedTokenAddress(config.usdcMint, merchantPubkey);

  const txSignature = await client.settlePayment(escrowPda, merchantTokenAccount);

  return { txSignature, paymentId, merchant: merchantPubkey.toBase58() };
}

// ── Tool definitions ──

const TOOLS = [
  {
    name: "x402_pay",
    description:
      "Pay an x402 service. Makes HTTP request, handles 402 payment automatically via Solana, returns the response and PaymentReceiptV1.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Target URL to request" },
        agentId: { type: "number", description: "Agent ID (default 0)" },
        method: { type: "string", description: "HTTP method", default: "GET" },
        body: { type: "string", description: "Request body (JSON string)" },
        headers: { type: "string", description: "Request headers (JSON string)" },
        maxAmount: {
          type: "number",
          description: "Maximum USDC micro-units willing to pay (1 USDC = 1000000)",
        },
        autoDisputeOnFail: {
          type: "boolean",
          description:
            "Open an on-chain dispute if objective delivery checks fail after payment.",
        },
        recordEvidenceOnChain: {
          type: "boolean",
          description:
            "Persist receipt and delivery evidence hashes in a PaymentEvidenceAccount.",
        },
        requireEvidenceOnChain: {
          type: "boolean",
          description:
            "Return protection_failed if on-chain evidence persistence is requested but not recorded.",
        },
        expectJson: {
          type: "boolean",
          description: "Require the paid response body to be valid JSON.",
        },
        expectNonEmpty: {
          type: "boolean",
          description: "Require the paid response body to be non-empty.",
        },
        timeoutMs: {
          type: "number",
          description: "Timeout for HTTP requests in milliseconds.",
        },
        retries: {
          type: "number",
          description:
            "Additional retry attempts for transport failures/timeouts. HTTP error responses are not retried.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "x402_balance",
    description: "Check SOL and USDC balances of the configured wallet.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "x402_explain_block",
    description:
      "Explain why an x402 payment was blocked by the x402warden payment firewall.",
    inputSchema: {
      type: "object" as const,
      properties: {
        endpoint: {
          type: "string",
          description: "Endpoint that was blocked",
        },
        merchant: {
          type: "string",
          description: "Merchant public key, if known",
        },
        amountRequested: {
          type: "number",
          description: "Requested payment amount in micro-USDC",
        },
        maxAllowed: {
          type: "number",
          description: "Allowed max payment amount in micro-USDC, if known",
        },
        reason: {
          type: "string",
          description: "Raw policy or client block reason",
        },
      },
      required: [],
    },
  },
  {
    name: "x402_status",
    description: "Show the on-chain agent account and spending policy status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "number", description: "Agent ID (default 0)" },
      },
      required: [],
    },
  },
  {
    name: "x402_receipt",
    description:
      "Fetch a PaymentReceiptV1 from an existing on-chain payment escrow.",
    inputSchema: {
      type: "object" as const,
      properties: {
        payment: {
          type: "string",
          description:
            "Payment ID for the configured agent, or payment escrow public key",
        },
        escrow: {
          type: "boolean",
          description: "Treat payment as a payment escrow public key",
        },
        agentId: {
          type: "number",
          description: "Agent ID (default 0) when payment is a payment ID",
        },
        paymentRequirementsHash: {
          type: "string",
          description: "Optional caller-provided payment requirements hash",
        },
        requestContextHash: {
          type: "string",
          description: "Optional caller-provided request context hash",
        },
        txSignature: {
          type: "string",
          description: "Optional transaction signature to attach",
        },
      },
      required: ["payment"],
    },
  },
  {
    name: "x402_spend_report",
    description:
      "Summarize buyer-protection metrics for an agent: protected USDC, active escrow, recovered refunds, settled escrow, disputed lifetime, and optional signed blocked receipts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
        blockedAmount: {
          type: "number",
          description:
            "Optional local estimate in micro-USDC. Prefer blockedReceipts when available.",
        },
        blockedReceipts: {
          type: "array",
          description:
            "Optional signed BlockedPaymentReceiptV1 objects to aggregate as verifiable off-chain blocked USDC.",
          items: { type: "object" },
        },
      },
      required: [],
    },
  },
  {
    name: "x402_merchant_score",
    description:
      "Build a merchant risk profile from on-chain PaymentEscrow states only.",
    inputSchema: {
      type: "object" as const,
      properties: {
        merchant: {
          type: "string",
          description: "Merchant public key",
        },
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
        minimumSampleSize: {
          type: "number",
          description:
            "Minimum merchant payments before low/medium/high risk is assigned (default 3)",
        },
      },
      required: ["merchant"],
    },
  },
  {
    name: "x402_init",
    description: "Create a new agent account on-chain with spending policies.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "number", description: "Agent ID" },
        usdcAccount: {
          type: "string",
          description: "USDC token account public key (base58)",
        },
      },
      required: ["agentId", "usdcAccount"],
    },
  },
  {
    name: "x402_set_policy",
    description:
      "Update spending limits for an agent. Amounts in USDC micro-units (1 USDC = 1000000).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
        maxPerCall: {
          type: "number",
          description: "Max USDC per call (micro-USDC)",
        },
        maxPerPeriod: {
          type: "number",
          description: "Max USDC per period (micro-USDC)",
        },
        periodSeconds: {
          type: "number",
          description: "Policy period in seconds",
          default: 86400,
        },
        disputeWindow: {
          type: "number",
          description: "Dispute window in seconds",
          default: 300,
        },
        allowlistEnabled: {
          type: "boolean",
          description: "Enable merchant allowlist",
          default: false,
        },
        autoSettleEnabled: {
          type: "boolean",
          description: "Enable auto-settle",
          default: true,
        },
      },
      required: ["maxPerCall", "maxPerPeriod"],
    },
  },
  {
    name: "x402_settle",
    description:
      "Settle a payment after the dispute window has expired. Releases escrowed USDC to the merchant.",
    inputSchema: {
      type: "object" as const,
      properties: {
        paymentId: {
          type: "number",
          description: "Payment ID to settle",
        },
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
      },
      required: ["paymentId"],
    },
  },
];

// ── Server setup ──

const server = new Server(
  { name: "x402warden", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "x402_pay":
        result = await handlePay(args as Record<string, unknown>);
        break;
      case "x402_balance":
        result = await handleBalance();
        break;
      case "x402_explain_block":
        result = await handleExplainBlock(args as Record<string, unknown>);
        break;
      case "x402_status":
        result = await handleStatus(args as Record<string, unknown>);
        break;
      case "x402_receipt":
        result = await handleReceipt(args as Record<string, unknown>);
        break;
      case "x402_spend_report":
        result = await handleSpendReport(args as Record<string, unknown>);
        break;
      case "x402_merchant_score":
        result = await handleMerchantScore(args as Record<string, unknown>);
        break;
      case "x402_init":
        result = await handleInit(args as Record<string, unknown>);
        break;
      case "x402_set_policy":
        result = await handleSetPolicy(args as Record<string, unknown>);
        break;
      case "x402_settle":
        result = await handleSettle(args as Record<string, unknown>);
        break;
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
