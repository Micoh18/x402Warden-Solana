import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Enums ──

export enum PaymentState {
  Pending = "pending",
  Disputed = "disputed",
  Settled = "settled",
  Refunded = "refunded",
}

export enum DisputeState {
  Open = "open",
  MerchantAccepted = "merchantAccepted",
  MerchantContested = "merchantContested",
  AutoRefunded = "autoRefunded",
  Resolved = "resolved",
}

// ── Account structs ──

export interface AgentAccount {
  owner: PublicKey;
  agentId: BN;
  usdcTokenAccount: PublicKey;
  policyAccount: PublicKey;
  totalSpentLifetime: BN;
  totalDisputedLifetime: BN;
  paymentCount: BN;
  createdAt: BN;
  paused: boolean;
  bump: number;
}

export interface PolicyAccount {
  agent: PublicKey;
  maxPerCall: BN;
  maxPerDay: BN;
  maxPerPeriod: BN;
  periodSeconds: BN;
  periodStart: BN;
  spentInPeriod: BN;
  allowlistEnabled: boolean;
  allowlistCount: number;
  disputeWindowSeconds: number;
  autoSettleEnabled: boolean;
  bump: number;
}

export interface MerchantEntry {
  merchantPubkey: PublicKey;
  category: number;
  maxPerCallOverride: BN;
}

export interface MerchantAllowlistAccount {
  agent: PublicKey;
  pageIndex: number;
  merchants: MerchantEntry[];
  bump: number;
}

export interface PaymentEscrowAccount {
  agent: PublicKey;
  paymentId: BN;
  merchant: PublicKey;
  amount: BN;
  escrowTokenAccount: PublicKey;
  createdAt: BN;
  settleAfter: BN;
  state: Record<string, object>;
  x402RequestHash: number[];
  bump: number;
}

export interface DisputeAccount {
  payment: PublicKey;
  opener: PublicKey;
  reasonCode: number;
  reasonUri: number[];
  openedAt: BN;
  merchantResponseDeadline: BN;
  state: Record<string, object>;
  resolution: number;
  bump: number;
}

export interface PaymentEvidenceAccount {
  payment: PublicKey;
  recorder: PublicKey;
  receiptVersion: number;
  paymentRequirementsHash: number[];
  requestContextHash: number[];
  responseHash: number[];
  evidenceHash: number[];
  failureCode: number;
  statusCode: number;
  recordedAt: BN;
  bump: number;
}

// ── Instruction params ──

export interface SetPolicyParams {
  maxPerCall: BN;
  maxPerPeriod: BN;
  periodSeconds: BN;
  disputeWindowSeconds: number;
  allowlistEnabled: boolean;
  autoSettleEnabled: boolean;
}

export interface RecordPaymentEvidenceParams {
  receiptVersion?: number;
  paymentRequirementsHash?: number[] | Uint8Array;
  requestContextHash?: number[] | Uint8Array;
  responseHash?: number[] | Uint8Array;
  evidenceHash: number[] | Uint8Array;
  failureCode?: number;
  statusCode?: number;
}
