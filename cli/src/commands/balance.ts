import { Command } from "commander";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { loadConfig } from "../config";
import { success, error } from "../output";

export const balanceCommand = new Command("balance")
  .description("Show SOL and USDC balances")
  .action(async () => {
    try {
      const config = loadConfig();

      const solBalance = await config.connection.getBalance(config.wallet.publicKey);
      const sol = (solBalance / LAMPORTS_PER_SOL).toString();

      let usdc = "0";
      let usdcAccountAddress = "none";

      try {
        const ata = await getAssociatedTokenAddress(
          config.usdcMint,
          config.wallet.publicKey
        );
        const tokenAccount = await getAccount(config.connection, ata);
        usdcAccountAddress = ata.toBase58();
        usdc = (Number(tokenAccount.amount) / 1_000_000).toString();
      } catch {
        // No USDC token account found
      }

      return success({
        sol,
        usdc,
        walletAddress: config.wallet.publicKey.toBase58(),
        usdcAccount: usdcAccountAddress,
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
