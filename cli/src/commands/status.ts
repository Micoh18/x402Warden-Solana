import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  findAgentAccountPda,
  findPolicyAccountPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

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
    } else if (typeof val === "boolean" || typeof val === "number") {
      out[key] = val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

export const statusCommand = new Command("status")
  .description("Show agent and policy status on-chain")
  .option("--agent-id <id>", "Agent ID override")
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

      return success({ agentPda: agentPda.toBase58(), agent, policy });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
