import { Command } from "commander";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import {
  X402WardenClient,
  findAgentAccountPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

export const balanceCommand = new Command("balance")
  .description("Show SOL and USDC balances")
  .option("--agent-id <id>", "Agent ID override")
  .action(async (opts) => {
    try {
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);

      const solBalance = await config.connection.getBalance(config.wallet.publicKey);
      const sol = solBalance / LAMPORTS_PER_SOL;

      let usdc = "0";
      let usdcAccountAddress = "none";

      try {
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
        usdcAccountAddress = agentData.usdcTokenAccount.toBase58();

        const tokenAccount = await getAccount(
          config.connection,
          agentData.usdcTokenAccount
        );
        usdc = tokenAccount.amount.toString();
      } catch {
        // Agent not initialized or token account not found
      }

      return success({
        sol: sol.toString(),
        usdc,
        walletAddress: config.wallet.publicKey.toBase58(),
        usdcAccount: usdcAccountAddress,
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
