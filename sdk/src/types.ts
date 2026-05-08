import { PublicKey } from "@solana/web3.js";

export interface Agent {
  publicKey: PublicKey;
  owner: PublicKey;
  agentId: number;
  paused: boolean;
  totalSpent: number;
  totalDisputed: number;
  paymentCount: number;
}

export interface Policy {
  maxPerCall: number;
  maxPerPeriod: number;
  periodSeconds: number;
  disputeWindowSeconds: number;
  allowlistEnabled: boolean;
  spentInPeriod: number;
}

export interface Payment {
  publicKey: PublicKey;
  agent: PublicKey;
  merchant: PublicKey;
  amount: number;
  state: "pending" | "disputed" | "settled" | "refunded";
  settleAfter: number;
}

export interface Dispute {
  publicKey: PublicKey;
  payment: PublicKey;
  reasonCode: number;
  state: "open" | "accepted" | "contested" | "auto_refunded" | "resolved";
}
