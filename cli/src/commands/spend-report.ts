import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  buildProtectionMetricsV1,
  findAgentAccountPda,
  type BlockedPaymentReceiptV1,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

function formatMicroUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(6);
}

function bnToNumberSafe(value: unknown): number {
  const bn = BN.isBN(value) ? value : new BN(value as any ?? 0);
  const maxSafe = new BN(Number.MAX_SAFE_INTEGER);
  if (bn.gt(maxSafe)) return Number.MAX_SAFE_INTEGER;
  return bn.toNumber();
}

function formatMicroUsdcValue(amount: string | number): string {
  return formatMicroUsdc(bnToNumberSafe(amount));
}

function bnToString(value: unknown): string {
  if (BN.isBN(value)) return value.toString();
  return String(value);
}

function getStateKey(state: Record<string, object> | undefined): string {
  return state ? Object.keys(state)[0] || "unknown" : "unknown";
}

function collectBlockedReceipt(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

function parseBlockedReceipts(values: string[]): BlockedPaymentReceiptV1[] {
  return values.map((value) => JSON.parse(value) as BlockedPaymentReceiptV1);
}

export const spendReportCommand = new Command("spend-report")
  .alias("report")
  .description("Report buyer-protection metrics from on-chain escrows")
  .option("--agent-id <id>", "Agent ID override")
  .option(
    "--blocked-receipt <json>",
    "Signed BlockedPaymentReceiptV1 JSON to aggregate as blocked USDC; repeatable",
    collectBlockedReceipt,
    []
  )
  .option(
    "--blocked-amount <amount>",
    "Local blocked estimate in micro-USDC; marked as local_estimate"
  )
  .action(async (opts) => {
    try {
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const blockedAmount =
        opts.blockedAmount != null ? parseInt(opts.blockedAmount, 10) : undefined;
      const blockedReceipts = parseBlockedReceipts(opts.blockedReceipt ?? []);
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

      const protection = buildProtectionMetricsV1({
        payments: paymentAccounts,
        blockedReceipts,
        localBlockedEstimate: blockedAmount,
      });

      const payments = paymentAccounts.map((payment: any) => {
        const account = payment.account;
        const amount = BN.isBN(account.amount) ? account.amount : new BN(account.amount);

        return {
          paymentEscrow: payment.publicKey.toBase58(),
          paymentId: bnToString(account.paymentId),
          merchant: account.merchant.toBase58(),
          amount: amount.toString(),
          usdcAmount: formatMicroUsdc(bnToNumberSafe(amount)),
          state: getStateKey(account.state),
          settleAfter: bnToString(account.settleAfter),
        };
      });

      return success({
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
          activeEscrowCount: protection.counts.activeEscrows,
          activeEscrowUsdc: formatMicroUsdcValue(protection.amounts.activeEscrow),
          paymentCount: payments.length,
          metrics: protection.metrics,
        },
        payments,
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
