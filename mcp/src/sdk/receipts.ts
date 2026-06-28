import {
  DELIVERY_FAILURE_EMPTY_BODY,
  DELIVERY_FAILURE_INVALID_JSON,
  DELIVERY_FAILURE_NO_RESPONSE,
  DELIVERY_FAILURE_NON_2XX,
  DELIVERY_FAILURE_NONE,
  DELIVERY_FAILURE_OTHER,
  DELIVERY_FAILURE_SERVICE_ERROR,
  DELIVERY_FAILURE_TIMEOUT,
} from "./constants.js";
import type {
  PaymentEscrowAccount,
  PaymentEvidenceAccount,
} from "./types.js";

export type EvidenceSource =
  | "on_chain_account"
  | "on_chain_event"
  | "signed_off_chain_record"
  | "caller_provided"
  | "local_dev_only"
  | "unavailable";

export type PaymentReceiptState =
  | "pending"
  | "disputed"
  | "settled"
  | "refunded"
  | "unknown";

export type PaymentDecisionStage =
  | "should_pay"
  | "did_deliver"
  | "should_settle";

export type PaymentDecisionResult =
  | "allowed"
  | "blocked"
  | "delivered"
  | "failed"
  | "settle"
  | "refund"
  | "hold";

export interface PaymentDecision {
  version: 1;
  stage: PaymentDecisionStage;
  result: PaymentDecisionResult;
  reason?: string;
  source: EvidenceSource;
}

export type DeliveryFailureCode =
  | "NO_RESPONSE"
  | "TIMEOUT"
  | "NON_2XX"
  | "INVALID_JSON"
  | "EMPTY_BODY"
  | "SERVICE_ERROR"
  | "OTHER";

export interface DeliveryEvidenceV1 {
  version: 1;
  paymentEscrow: string;
  source: EvidenceSource;
  statusCode?: number;
  responseHash?: string;
  failureCode?: DeliveryFailureCode;
  evidenceUri?: string;
  evidenceHash?: string;
}

export interface PaymentReceiptV1 {
  version: 1;
  source: "on_chain_payment_escrow";
  agentPda: string;
  paymentEscrow: string;
  paymentId: string;
  merchant: string;
  amount: string;
  escrowTokenAccount: string;
  x402RequestHash: string;
  paymentRequirementsHash?: string;
  requestContextHash?: string;
  txSignature?: string;
  state: PaymentReceiptState;
  createdAt: string;
  settleAfter: string;
  deliveryEvidence?: DeliveryEvidenceV1;
}

export type ProtectionMetricName =
  | "usdc_protected"
  | "active_escrow"
  | "usdc_recovered"
  | "usdc_settled"
  | "usdc_blocked";

export interface ProtectionMetric {
  version: 1;
  name: ProtectionMetricName;
  value: string;
  unit: "micro_usdc" | "count";
  source: EvidenceSource;
  status: "available" | "unavailable" | "local_estimate";
  description?: string;
}

export interface BuildPaymentReceiptV1Args {
  paymentEscrow: string | { toBase58(): string };
  account: PaymentEscrowAccount;
  paymentEvidence?: PaymentEvidenceAccount;
  paymentRequirementsHash?: string;
  requestContextHash?: string;
  txSignature?: string;
  deliveryEvidence?: DeliveryEvidenceV1;
}

function toBase58String(value: string | { toBase58(): string }): string {
  return typeof value === "string" ? value : value.toBase58();
}

function toDecimalString(value: { toString(): string } | number | string): string {
  return typeof value === "number" ? String(value) : value.toString();
}

export function bytesToHex(bytes: ArrayLike<number> | undefined): string {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function nonZeroHash(bytes: ArrayLike<number> | undefined): string | undefined {
  if (!bytes || Array.from(bytes).every((byte) => byte === 0)) return undefined;
  return bytesToHex(bytes);
}

function deliveryFailureCodeFromOnChainCode(
  code: number
): DeliveryFailureCode | undefined {
  switch (code) {
    case DELIVERY_FAILURE_NONE:
      return undefined;
    case DELIVERY_FAILURE_NO_RESPONSE:
      return "NO_RESPONSE";
    case DELIVERY_FAILURE_TIMEOUT:
      return "TIMEOUT";
    case DELIVERY_FAILURE_NON_2XX:
      return "NON_2XX";
    case DELIVERY_FAILURE_INVALID_JSON:
      return "INVALID_JSON";
    case DELIVERY_FAILURE_EMPTY_BODY:
      return "EMPTY_BODY";
    case DELIVERY_FAILURE_SERVICE_ERROR:
      return "SERVICE_ERROR";
    case DELIVERY_FAILURE_OTHER:
      return "OTHER";
    default:
      return "OTHER";
  }
}

export function hexToBytes32(hex: string | undefined): number[] {
  if (!hex) return new Array(32).fill(0);
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("hash must be a 32-byte hex string");
  }
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    bytes.push(parseInt(normalized.slice(i, i + 2), 16));
  }
  return bytes;
}

export function buildDeliveryEvidenceFromPaymentEvidence(
  paymentEvidence: PaymentEvidenceAccount
): DeliveryEvidenceV1 {
  const evidence: DeliveryEvidenceV1 = {
    version: 1,
    paymentEscrow: paymentEvidence.payment.toBase58(),
    source: "on_chain_account",
  };
  const statusCode =
    typeof paymentEvidence.statusCode === "number"
      ? paymentEvidence.statusCode
      : Number(paymentEvidence.statusCode ?? 0);

  if (statusCode > 0) {
    evidence.statusCode = statusCode;
  }

  const responseHash = nonZeroHash(paymentEvidence.responseHash);
  if (responseHash) {
    evidence.responseHash = responseHash;
  }

  const failureCode = deliveryFailureCodeFromOnChainCode(
    paymentEvidence.failureCode
  );
  if (failureCode) {
    evidence.failureCode = failureCode;
  }

  const evidenceHash = nonZeroHash(paymentEvidence.evidenceHash);
  if (evidenceHash) {
    evidence.evidenceHash = evidenceHash;
  }

  return evidence;
}

export function getPaymentReceiptState(
  state: PaymentEscrowAccount["state"] | string | undefined
): PaymentReceiptState {
  const key =
    typeof state === "string" ? state : state ? Object.keys(state)[0] : undefined;

  switch (key) {
    case "pending":
    case "disputed":
    case "settled":
    case "refunded":
      return key;
    default:
      return "unknown";
  }
}

export function buildPaymentReceiptV1(
  args: BuildPaymentReceiptV1Args
): PaymentReceiptV1 {
  const { account } = args;
  const receipt: PaymentReceiptV1 = {
    version: 1,
    source: "on_chain_payment_escrow",
    agentPda: account.agent.toBase58(),
    paymentEscrow: toBase58String(args.paymentEscrow),
    paymentId: toDecimalString(account.paymentId),
    merchant: account.merchant.toBase58(),
    amount: toDecimalString(account.amount),
    escrowTokenAccount: account.escrowTokenAccount.toBase58(),
    x402RequestHash: bytesToHex(account.x402RequestHash),
    state: getPaymentReceiptState(account.state),
    createdAt: toDecimalString(account.createdAt),
    settleAfter: toDecimalString(account.settleAfter),
  };

  if (args.paymentRequirementsHash) {
    receipt.paymentRequirementsHash = args.paymentRequirementsHash;
  }
  if (args.requestContextHash) {
    receipt.requestContextHash = args.requestContextHash;
  }
  if (args.paymentEvidence) {
    const paymentRequirementsHash = nonZeroHash(
      args.paymentEvidence.paymentRequirementsHash
    );
    const requestContextHash = nonZeroHash(args.paymentEvidence.requestContextHash);
    if (paymentRequirementsHash) {
      receipt.paymentRequirementsHash = paymentRequirementsHash;
    }
    if (requestContextHash) {
      receipt.requestContextHash = requestContextHash;
    }
    receipt.deliveryEvidence = buildDeliveryEvidenceFromPaymentEvidence(
      args.paymentEvidence
    );
  }
  if (args.txSignature) {
    receipt.txSignature = args.txSignature;
  }
  if (args.deliveryEvidence && !args.paymentEvidence) {
    receipt.deliveryEvidence = args.deliveryEvidence;
  }

  return receipt;
}
