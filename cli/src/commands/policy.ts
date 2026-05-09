import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  findAgentAccountPda,
} from "@x402warden/sdk";
import type { SetPolicyParams } from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

export const policyCommand = new Command("policy")
  .description("Set spending policy for an agent")
  .option("--agent-id <id>", "Agent ID override")
  .requiredOption("--max-per-call <amount>", "Max USDC per call (micro-USDC)")
  .requiredOption("--max-per-period <amount>", "Max USDC per period (micro-USDC)")
  .option("--period-seconds <seconds>", "Policy period in seconds", "86400")
  .option("--dispute-window <seconds>", "Dispute window in seconds", "300")
  .option("--allowlist", "Enable merchant allowlist", false)
  .option("--auto-settle", "Enable auto-settle", true)
  .option("--no-auto-settle", "Disable auto-settle")
  .action(async (opts) => {
    try {
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
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
        maxPerCall: new BN(opts.maxPerCall),
        maxPerPeriod: new BN(opts.maxPerPeriod),
        periodSeconds: new BN(opts.periodSeconds),
        disputeWindowSeconds: parseInt(opts.disputeWindow, 10),
        allowlistEnabled: opts.allowlist,
        autoSettleEnabled: opts.autoSettle,
      };

      const txSignature = await client.setPolicy(agentPda, params);

      return success({ txSignature });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
