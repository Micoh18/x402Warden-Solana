import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  X402WardenClient,
  buildMerchantRiskProfile,
  findAgentAccountPda,
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

export const merchantScoreCommand = new Command("merchant-score")
  .description("Build a merchant risk profile from on-chain payment escrows")
  .argument("<merchant>", "Merchant public key")
  .option("--agent-id <id>", "Agent ID override")
  .option(
    "--minimum-sample-size <count>",
    "Minimum payments before low/medium/high risk is assigned",
    "3"
  )
  .action(async (merchant: string, opts) => {
    try {
      const merchantPk = new PublicKey(merchant);
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const minimumSampleSize = parseInt(opts.minimumSampleSize, 10);
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

      return success({
        agentId: config.agentId,
        agentPda: agentPda.toBase58(),
        wallet: config.wallet.publicKey.toBase58(),
        profile: {
          ...profile,
          totalVolumeUsdc: formatMicroUsdc(bnToNumberSafe(profile.totalVolume)),
        },
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
