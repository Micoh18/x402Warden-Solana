import BN from "bn.js";
import type { PaymentEscrowAccount } from "./types";
import type { EvidenceSource, ProtectionMetric } from "./receipts";
import { getPaymentReceiptState } from "./receipts";
import {
  verifyBlockedPaymentReceiptV1,
  type BlockedPaymentReceiptV1,
} from "./blocked-receipts";

export type ProtectionMetricStatus =
  | "available"
  | "unavailable"
  | "local_estimate";

export interface ProtectionMetricPaymentInput {
  account: PaymentEscrowAccount;
}

export interface BuildProtectionMetricsV1Args {
  payments: Array<PaymentEscrowAccount | ProtectionMetricPaymentInput>;
  blockedReceipts?: BlockedPaymentReceiptV1[];
  localBlockedEstimate?: string | number | { toString(): string };
}

export interface ProtectionMetricsV1 {
  version: 1;
  metrics: ProtectionMetric[];
  amounts: {
    usdcProtected: string;
    activeEscrow: string;
    usdcRecovered: string;
    usdcSettled: string;
    usdcBlocked: string;
  };
  counts: {
    paymentEscrows: number;
    activeEscrows: number;
    recoveredEscrows: number;
    settledEscrows: number;
    blockedReceipts: number;
    invalidBlockedReceipts: number;
  };
  sources: {
    usdcProtected: EvidenceSource;
    activeEscrow: EvidenceSource;
    usdcRecovered: EvidenceSource;
    usdcSettled: EvidenceSource;
    usdcBlocked: EvidenceSource;
  };
  statuses: {
    usdcProtected: ProtectionMetricStatus;
    activeEscrow: ProtectionMetricStatus;
    usdcRecovered: ProtectionMetricStatus;
    usdcSettled: ProtectionMetricStatus;
    usdcBlocked: ProtectionMetricStatus;
  };
}

function toBn(value: string | number | { toString(): string } | undefined): BN {
  if (value == null) return new BN(0);
  if (BN.isBN(value)) return value as BN;
  return new BN(typeof value === "number" ? String(value) : value.toString());
}

function paymentAccount(
  input: PaymentEscrowAccount | ProtectionMetricPaymentInput
): PaymentEscrowAccount {
  return "account" in input ? input.account : input;
}

function metric(args: {
  name: ProtectionMetric["name"];
  value: BN | number | string;
  unit: ProtectionMetric["unit"];
  source: EvidenceSource;
  status: ProtectionMetricStatus;
  description?: string;
}): ProtectionMetric {
  return {
    version: 1,
    name: args.name,
    value: args.value.toString(),
    unit: args.unit,
    source: args.source,
    status: args.status,
    description: args.description,
  };
}

export function buildProtectionMetricsV1(
  args: BuildProtectionMetricsV1Args
): ProtectionMetricsV1 {
  let protectedAmount = new BN(0);
  let activeEscrowAmount = new BN(0);
  let recoveredAmount = new BN(0);
  let settledAmount = new BN(0);
  let activeEscrowCount = 0;
  let recoveredEscrowCount = 0;
  let settledEscrowCount = 0;

  for (const input of args.payments) {
    const account = paymentAccount(input);
    const amount = toBn(account.amount);
    const state = getPaymentReceiptState(account.state);

    protectedAmount = protectedAmount.add(amount);

    if (state === "pending" || state === "disputed") {
      activeEscrowAmount = activeEscrowAmount.add(amount);
      activeEscrowCount += 1;
    } else if (state === "refunded") {
      recoveredAmount = recoveredAmount.add(amount);
      recoveredEscrowCount += 1;
    } else if (state === "settled") {
      settledAmount = settledAmount.add(amount);
      settledEscrowCount += 1;
    }
  }

  let blockedAmount = new BN(0);
  let blockedReceiptCount = 0;
  let invalidBlockedReceiptCount = 0;

  for (const receipt of args.blockedReceipts ?? []) {
    if (verifyBlockedPaymentReceiptV1(receipt) && receipt.amountRequested) {
      blockedAmount = blockedAmount.add(toBn(receipt.amountRequested));
      blockedReceiptCount += 1;
    } else {
      invalidBlockedReceiptCount += 1;
    }
  }

  let blockedSource: EvidenceSource = "unavailable";
  let blockedStatus: ProtectionMetricStatus = "unavailable";
  let blockedDescription =
    "No signed blocked-payment receipts or on-chain blocked-payment events were provided.";

  if (blockedReceiptCount > 0) {
    blockedSource = "signed_off_chain_record";
    blockedStatus = "available";
    blockedDescription =
      "Sum of verified signed BlockedPaymentReceiptV1 amountRequested values.";
  } else if (args.localBlockedEstimate != null) {
    blockedAmount = toBn(args.localBlockedEstimate);
    blockedSource = "local_dev_only";
    blockedStatus = "local_estimate";
    blockedDescription =
      "Caller-provided local estimate; not independently verifiable.";
  }

  const metrics: ProtectionMetric[] = [
    metric({
      name: "usdc_protected",
      value: protectedAmount,
      unit: "micro_usdc",
      source: "on_chain_account",
      status: "available",
      description: "Sum of all PaymentEscrow.amount values for the agent.",
    }),
    metric({
      name: "active_escrow",
      value: activeEscrowCount,
      unit: "count",
      source: "on_chain_account",
      status: "available",
      description:
        "Count of PaymentEscrow accounts in pending or disputed state.",
    }),
    metric({
      name: "usdc_recovered",
      value: recoveredAmount,
      unit: "micro_usdc",
      source: "on_chain_account",
      status: "available",
      description:
        "Sum of PaymentEscrow.amount values where state is refunded.",
    }),
    metric({
      name: "usdc_settled",
      value: settledAmount,
      unit: "micro_usdc",
      source: "on_chain_account",
      status: "available",
      description:
        "Sum of PaymentEscrow.amount values where state is settled.",
    }),
    metric({
      name: "usdc_blocked",
      value: blockedAmount,
      unit: "micro_usdc",
      source: blockedSource,
      status: blockedStatus,
      description: blockedDescription,
    }),
  ];

  return {
    version: 1,
    metrics,
    amounts: {
      usdcProtected: protectedAmount.toString(),
      activeEscrow: activeEscrowAmount.toString(),
      usdcRecovered: recoveredAmount.toString(),
      usdcSettled: settledAmount.toString(),
      usdcBlocked: blockedAmount.toString(),
    },
    counts: {
      paymentEscrows: args.payments.length,
      activeEscrows: activeEscrowCount,
      recoveredEscrows: recoveredEscrowCount,
      settledEscrows: settledEscrowCount,
      blockedReceipts: blockedReceiptCount,
      invalidBlockedReceipts: invalidBlockedReceiptCount,
    },
    sources: {
      usdcProtected: "on_chain_account",
      activeEscrow: "on_chain_account",
      usdcRecovered: "on_chain_account",
      usdcSettled: "on_chain_account",
      usdcBlocked: blockedSource,
    },
    statuses: {
      usdcProtected: "available",
      activeEscrow: "available",
      usdcRecovered: "available",
      usdcSettled: "available",
      usdcBlocked: blockedStatus,
    },
  };
}

export function findProtectionMetric(
  report: ProtectionMetricsV1,
  name: ProtectionMetric["name"]
): ProtectionMetric | undefined {
  return report.metrics.find((metric) => metric.name === name);
}
