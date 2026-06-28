import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "@x402warden/sdk";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ProxyConfig {
  keypair: Keypair;
  connection: Connection;
  wallet: Wallet;
  agentId: number;
  usdcMint: PublicKey;
  programId: PublicKey;
  protection: {
    maxAmount?: number;
    timeoutMs?: number;
    retries?: number;
    expectJson: boolean;
    expectNonEmpty: boolean;
    autoDisputeOnFail: boolean;
    recordEvidenceOnChain: boolean;
    requireEvidenceOnChain: boolean;
  };
}

function parseOptionalInteger(name: string): number | undefined {
  const value = process.env[name];
  if (value == null || value.trim() === "") return undefined;

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} exceeds safe integer range`);
  }
  return parsed;
}

function parseBoolean(name: string): boolean {
  const value = process.env[name];
  if (value == null || value.trim() === "") return false;

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      throw new Error(`${name} must be true/false, 1/0, yes/no, or on/off`);
  }
}

export function loadConfig(): ProxyConfig {
  const keypairPath =
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));

  const rpcUrl =
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const wallet = new Wallet(keypair);

  const agentId = process.env.AGENT_ID
    ? parseInt(process.env.AGENT_ID, 10)
    : 0;

  const usdcMint = new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );
  const recordEvidenceOnChain = parseBoolean(
    "X402WARDEN_PROXY_RECORD_EVIDENCE_ON_CHAIN"
  );
  const requireEvidenceOnChain = parseBoolean(
    "X402WARDEN_PROXY_REQUIRE_EVIDENCE_ON_CHAIN"
  );

  if (requireEvidenceOnChain && !recordEvidenceOnChain) {
    throw new Error(
      "X402WARDEN_PROXY_REQUIRE_EVIDENCE_ON_CHAIN requires X402WARDEN_PROXY_RECORD_EVIDENCE_ON_CHAIN"
    );
  }

  return {
    keypair,
    connection,
    wallet,
    agentId,
    usdcMint,
    programId: PROGRAM_ID,
    protection: {
      maxAmount: parseOptionalInteger("X402WARDEN_PROXY_MAX_AMOUNT"),
      timeoutMs: parseOptionalInteger("X402WARDEN_PROXY_TIMEOUT_MS"),
      retries: parseOptionalInteger("X402WARDEN_PROXY_RETRIES"),
      expectJson: parseBoolean("X402WARDEN_PROXY_EXPECT_JSON"),
      expectNonEmpty: parseBoolean("X402WARDEN_PROXY_EXPECT_NON_EMPTY"),
      autoDisputeOnFail: parseBoolean(
        "X402WARDEN_PROXY_AUTO_DISPUTE_ON_FAIL"
      ),
      recordEvidenceOnChain,
      requireEvidenceOnChain,
    },
  };
}
