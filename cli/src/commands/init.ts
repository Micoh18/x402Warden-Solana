import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  X402WardenClient,
  findAgentAccountPda,
  findPolicyAccountPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

export const initCommand = new Command("init")
  .description("Initialize an agent account on-chain")
  .requiredOption("--agent-id <id>", "Agent ID")
  .requiredOption("--usdc-account <pubkey>", "USDC token account public key")
  .action(async (opts) => {
    try {
      const agentId = parseInt(opts.agentId, 10);
      const config = loadConfig(agentId);

      const client = new X402WardenClient({
        connection: config.connection,
        wallet: config.wallet,
        programId: config.programId,
      });

      const [agentPda] = findAgentAccountPda(
        config.wallet.publicKey,
        agentId,
        config.programId
      );
      const [policyPda] = findPolicyAccountPda(agentPda, config.programId);

      const usdcAccount = new PublicKey(opts.usdcAccount);

      const txSignature = await client.createAgent(
        agentId,
        usdcAccount,
        agentPda,
        policyPda
      );

      return success({
        txSignature,
        agentPda: agentPda.toBase58(),
        policyPda: policyPda.toBase58(),
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
