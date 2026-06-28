import BN from "bn.js";
import type { PaymentEscrowAccount } from "./types.js";
import { getPaymentReceiptState } from "./receipts.js";

export type MerchantRiskLevel = "low" | "medium" | "high" | "unknown";

export interface MerchantRiskPaymentInput {
  account: PaymentEscrowAccount;
}

export interface BuildMerchantRiskProfileArgs {
  merchant: string;
  payments: Array<PaymentEscrowAccount | MerchantRiskPaymentInput>;
  minimumSampleSize?: number;
}

export interface MerchantRiskProfile {
  version: 1;
  merchant: string;
  source: "on_chain_payment_escrow";
  totalVolume: string;
  paymentCount: number;
  settledCount: number;
  disputedCount: number;
  refundedCount: number;
  activeDisputedCount: number;
  disputeRate: number;
  refundRate: number;
  riskLevel: MerchantRiskLevel;
}

function paymentAccount(
  input: PaymentEscrowAccount | MerchantRiskPaymentInput
): PaymentEscrowAccount {
  return "account" in input ? input.account : input;
}

function toBn(value: string | number | { toString(): string } | undefined): BN {
  if (value == null) return new BN(0);
  if (BN.isBN(value)) return value as BN;
  return new BN(typeof value === "number" ? String(value) : value.toString());
}

function merchantString(value: unknown): string {
  if (value && typeof value === "object" && "toBase58" in value) {
    return (value as { toBase58(): string }).toBase58();
  }
  return String(value);
}

function riskLevel(args: {
  paymentCount: number;
  disputeRate: number;
  refundRate: number;
  activeDisputedCount: number;
  minimumSampleSize: number;
}): MerchantRiskLevel {
  if (args.paymentCount < args.minimumSampleSize) return "unknown";
  if (
    args.activeDisputedCount > 0 ||
    args.disputeRate >= 0.25 ||
    args.refundRate >= 0.15
  ) {
    return "high";
  }
  if (args.disputeRate >= 0.1 || args.refundRate >= 0.05) {
    return "medium";
  }
  return "low";
}

export function buildMerchantRiskProfile(
  args: BuildMerchantRiskProfileArgs
): MerchantRiskProfile {
  const minimumSampleSize = args.minimumSampleSize ?? 3;
  let totalVolume = new BN(0);
  let paymentCount = 0;
  let settledCount = 0;
  let refundedCount = 0;
  let activeDisputedCount = 0;

  for (const input of args.payments) {
    const account = paymentAccount(input);
    if (merchantString(account.merchant) !== args.merchant) continue;

    paymentCount += 1;
    totalVolume = totalVolume.add(toBn(account.amount));

    const state = getPaymentReceiptState(account.state);
    if (state === "settled") {
      settledCount += 1;
    } else if (state === "refunded") {
      refundedCount += 1;
    } else if (state === "disputed") {
      activeDisputedCount += 1;
    }
  }

  const disputedCount = activeDisputedCount + refundedCount;
  const disputeRate = paymentCount === 0 ? 0 : disputedCount / paymentCount;
  const refundRate = paymentCount === 0 ? 0 : refundedCount / paymentCount;

  return {
    version: 1,
    merchant: args.merchant,
    source: "on_chain_payment_escrow",
    totalVolume: totalVolume.toString(),
    paymentCount,
    settledCount,
    disputedCount,
    refundedCount,
    activeDisputedCount,
    disputeRate,
    refundRate,
    riskLevel: riskLevel({
      paymentCount,
      disputeRate,
      refundRate,
      activeDisputedCount,
      minimumSampleSize,
    }),
  };
}
