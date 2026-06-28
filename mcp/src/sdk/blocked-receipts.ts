import { PublicKey } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export type BlockedPaymentReasonCode =
  | "MAX_AMOUNT_EXCEEDED"
  | "PER_CALL_LIMIT"
  | "PERIOD_LIMIT"
  | "AGENT_PAUSED"
  | "MERCHANT_NOT_ALLOWED"
  | "POLICY_BLOCK"
  | "OTHER";

export interface BlockedPaymentSignature {
  scheme: "ed25519";
  value: string;
  signedPayloadHash: string;
}

export interface UnsignedBlockedPaymentReceiptV1 {
  version: 1;
  source: "signed_off_chain_record";
  signer: string;
  agentPda?: string;
  agentId?: string;
  endpoint?: string;
  method?: string;
  merchant?: string;
  amountRequested?: string;
  maxAllowed?: string;
  reasonCode: BlockedPaymentReasonCode;
  reason: string;
  requestContextHash?: string;
  x402RequestHash?: string;
  createdAt: string;
}

export interface BlockedPaymentReceiptV1
  extends UnsignedBlockedPaymentReceiptV1 {
  signature: BlockedPaymentSignature;
}

export interface BuildBlockedPaymentReceiptV1Args {
  signer: string | { toBase58(): string };
  agentPda?: string | { toBase58(): string };
  agentId?: string | number | { toString(): string };
  endpoint?: string;
  method?: string;
  merchant?: string;
  amountRequested?: string | number | { toString(): string };
  maxAllowed?: string | number | { toString(): string };
  reasonCode: BlockedPaymentReasonCode;
  reason: string;
  requestContextHash?: string;
  x402RequestHash?: string;
  createdAt?: string;
}

function toOptionalString(
  value: string | number | { toString(): string } | undefined
): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? String(value) : value.toString();
}

function toBase58String(
  value: string | { toBase58(): string } | undefined
): string | undefined {
  if (value == null) return undefined;
  return typeof value === "string" ? value : value.toBase58();
}

function normalizeForJson(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== undefined) out[key] = normalizeForJson(child);
  }
  return out;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalizeForJson(value));
}

export function sha256Hex(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}

function hexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function unsignedBlockedReceipt(
  receipt: BlockedPaymentReceiptV1 | UnsignedBlockedPaymentReceiptV1
): UnsignedBlockedPaymentReceiptV1 {
  const { signature: _signature, ...unsigned } =
    receipt as BlockedPaymentReceiptV1;
  return unsigned;
}

export function buildBlockedPaymentReceiptV1(
  args: BuildBlockedPaymentReceiptV1Args
): UnsignedBlockedPaymentReceiptV1 {
  return {
    version: 1,
    source: "signed_off_chain_record",
    signer: toBase58String(args.signer)!,
    agentPda: toBase58String(args.agentPda),
    agentId: toOptionalString(args.agentId),
    endpoint: args.endpoint,
    method: args.method,
    merchant: args.merchant,
    amountRequested: toOptionalString(args.amountRequested),
    maxAllowed: toOptionalString(args.maxAllowed),
    reasonCode: args.reasonCode,
    reason: args.reason,
    requestContextHash: args.requestContextHash,
    x402RequestHash: args.x402RequestHash,
    createdAt: args.createdAt ?? new Date().toISOString(),
  };
}

export function signBlockedPaymentReceiptV1(
  receipt: UnsignedBlockedPaymentReceiptV1,
  secretKey: Uint8Array
): BlockedPaymentReceiptV1 {
  const publicKey = new PublicKey(receipt.signer).toBytes();
  const derivedPublicKey = ed25519.getPublicKey(secretKey.slice(0, 32));
  if (bytesToHex(publicKey) !== bytesToHex(derivedPublicKey)) {
    throw new Error("Signer does not match secret key");
  }

  const payload = canonicalJson(receipt);
  const signature = ed25519.sign(utf8ToBytes(payload), secretKey.slice(0, 32));

  return {
    ...receipt,
    signature: {
      scheme: "ed25519",
      value: bytesToHex(signature),
      signedPayloadHash: sha256Hex(payload),
    },
  };
}

export function verifyBlockedPaymentReceiptV1(
  receipt: BlockedPaymentReceiptV1
): boolean {
  try {
    const unsigned = unsignedBlockedReceipt(receipt);
    const payload = canonicalJson(unsigned);
    if (receipt.signature.signedPayloadHash !== sha256Hex(payload)) {
      return false;
    }

    return ed25519.verify(
      hexToBytes(receipt.signature.value),
      utf8ToBytes(payload),
      new PublicKey(receipt.signer).toBytes()
    );
  } catch {
    return false;
  }
}
