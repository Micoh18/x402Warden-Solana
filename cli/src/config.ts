import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "@x402warden/sdk";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CliConfig {
  keypair: Keypair;
  connection: Connection;
  wallet: Wallet;
  agentId: number;
  usdcMint: PublicKey;
  programId: PublicKey;
}

export function loadConfig(agentIdOverride?: number): CliConfig {
  const keypairPath =
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));

  const rpcUrl =
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const wallet = new Wallet(keypair);

  const agentId =
    agentIdOverride ?? (process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : 0);

  const usdcMint = new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );

  return {
    keypair,
    connection,
    wallet,
    agentId,
    usdcMint,
    programId: PROGRAM_ID,
  };
}
