#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import anchor from "@coral-xyz/anchor";
const { Wallet, BN } = anchor;
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import {
  X402WardenClient,
  PROGRAM_ID,
  findAgentAccountPda,
  findPolicyAccountPda,
} from "./sdk/index.js";
import type { SetPolicyParams } from "./sdk/index.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// ── Config ──

interface McpConfig {
  keypair: Keypair;
  connection: Connection;
  wallet: any;
  agentId: number;
  usdcMint: PublicKey;
  programId: PublicKey;
}

function loadConfig(agentIdOverride?: number): McpConfig {
  const keypairPath =
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json");

  const raw = fs.readFileSync(keypairPath, "utf-8");
  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const wallet = new Wallet(keypair);

  const agentId =
    agentIdOverride ?? (process.env.AGENT_ID ? parseInt(process.env.AGENT_ID, 10) : 0);

  const usdcMint = new PublicKey(
    process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );

  return { keypair, connection, wallet, agentId, usdcMint, programId: PROGRAM_ID };
}

// ── x402 flow helpers ──

interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
}

function parse402Response(body: any): Parsed402 {
  const accepts = body?.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("Invalid 402 response: missing accepts array");
  }
  const req = accepts[0];
  return {
    price: parseInt(req.maxAmountRequired || "0", 10),
    payTo: req.payTo || "",
    network: req.network || "",
    description: req.description || "",
  };
}

function buildPaymentHeader(txSignature: string): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { signature: txSignature },
  });
}

function generateRequestHash(url: string, method: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(`${method}:${url}`);
  return Array.from(hash.digest());
}

// ── BN serialization ──

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
    } else {
      out[key] = val;
    }
  }
  return out;
}

// ── Tool handlers ──

async function handlePay(args: Record<string, unknown>) {
  const url = args.url as string;
  const method = (args.method as string) || "GET";
  const body = args.body as string | undefined;
  const headersRaw = args.headers as string | undefined;
  const maxAmount = args.maxAmount as number | undefined;
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;

  const config = loadConfig(agentIdOverride);
  const headers: Record<string, string> = headersRaw ? JSON.parse(headersRaw) : {};

  const fetchOpts: RequestInit = { method, headers };
  if (body) {
    fetchOpts.body = body;
    if (!headers["content-type"] && !headers["Content-Type"]) {
      (fetchOpts.headers as Record<string, string>)["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, fetchOpts);

  if (response.ok) {
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }
    return { status: "ok", statusCode: response.status, body: responseBody };
  }

  if (response.status !== 402) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const responseBody = await response.json();
  const payment = parse402Response(responseBody);

  if (maxAmount && payment.price > maxAmount) {
    throw new Error(`Price ${payment.price} exceeds maxAmount ${maxAmount} — blocked by policy`);
  }

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
  const userTokenAccount = agentData.usdcTokenAccount;

  const requestHash = generateRequestHash(url, method);

  const txSignature = await client.processPayment(
    agentPda,
    new BN(payment.price),
    new PublicKey(payment.payTo),
    requestHash,
    userTokenAccount,
    config.usdcMint
  );

  const paymentHeader = buildPaymentHeader(txSignature);

  const retryHeaders = { ...headers, "X-PAYMENT": paymentHeader };
  const retryOpts: RequestInit = { method, headers: retryHeaders };
  if (body) {
    retryOpts.body = body;
  }

  const retryResponse = await fetch(url, retryOpts);

  let retryBody: unknown;
  try {
    retryBody = await retryResponse.json();
  } catch {
    retryBody = await retryResponse.text();
  }

  return {
    status: "paid",
    statusCode: retryResponse.status,
    txSignature,
    amountPaid: payment.price,
    body: retryBody,
  };
}

async function handleBalance() {
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
    // No USDC token account
  }

  return {
    sol,
    usdc,
    walletAddress: config.wallet.publicKey.toBase58(),
    usdcAccount: usdcAccountAddress,
  };
}

async function handleStatus(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
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

  return { agentPda: agentPda.toBase58(), agent, policy };
}

async function handleInit(args: Record<string, unknown>) {
  const agentId = args.agentId as number;
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

  const usdcAccount = new PublicKey(args.usdcAccount as string);

  const txSignature = await client.createAgent(
    agentId,
    usdcAccount,
    agentPda,
    policyPda
  );

  return {
    txSignature,
    agentPda: agentPda.toBase58(),
    policyPda: policyPda.toBase58(),
  };
}

async function handleSetPolicy(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
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
    maxPerCall: new BN(args.maxPerCall as number),
    maxPerPeriod: new BN(args.maxPerPeriod as number),
    periodSeconds: new BN((args.periodSeconds as number) ?? 86400),
    disputeWindowSeconds: (args.disputeWindow as number) ?? 300,
    allowlistEnabled: (args.allowlistEnabled as boolean) ?? false,
    autoSettleEnabled: (args.autoSettleEnabled as boolean) ?? true,
  };

  const txSignature = await client.setPolicy(agentPda, params);

  return { txSignature };
}

async function handleSettle(args: Record<string, unknown>) {
  const agentIdOverride = args.agentId != null ? (args.agentId as number) : undefined;
  const paymentId = args.paymentId as number;
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

  const { findPaymentEscrowPda } = await import("./sdk/pda.js");
  const [escrowPda] = findPaymentEscrowPda(agentPda, paymentId, config.programId);

  const escrowData = await client.getPayment(escrowPda);
  const merchantPubkey = escrowData.merchant;

  const { getAssociatedTokenAddress } = await import("@solana/spl-token");
  const merchantTokenAccount = await getAssociatedTokenAddress(config.usdcMint, merchantPubkey);

  const txSignature = await client.settlePayment(escrowPda, merchantTokenAccount);

  return { txSignature, paymentId, merchant: merchantPubkey.toBase58() };
}

// ── Tool definitions ──

const TOOLS = [
  {
    name: "x402_pay",
    description:
      "Pay an x402 service. Makes HTTP request, handles 402 payment automatically via Solana, returns the response.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "Target URL to request" },
        agentId: { type: "number", description: "Agent ID (default 0)" },
        method: { type: "string", description: "HTTP method", default: "GET" },
        body: { type: "string", description: "Request body (JSON string)" },
        headers: { type: "string", description: "Request headers (JSON string)" },
        maxAmount: {
          type: "number",
          description: "Maximum USDC micro-units willing to pay (1 USDC = 1000000)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "x402_balance",
    description: "Check SOL and USDC balances of the configured wallet.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "x402_status",
    description: "Show the on-chain agent account and spending policy status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "number", description: "Agent ID (default 0)" },
      },
      required: [],
    },
  },
  {
    name: "x402_init",
    description: "Create a new agent account on-chain with spending policies.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: { type: "number", description: "Agent ID" },
        usdcAccount: {
          type: "string",
          description: "USDC token account public key (base58)",
        },
      },
      required: ["agentId", "usdcAccount"],
    },
  },
  {
    name: "x402_set_policy",
    description:
      "Update spending limits for an agent. Amounts in USDC micro-units (1 USDC = 1000000).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
        maxPerCall: {
          type: "number",
          description: "Max USDC per call (micro-USDC)",
        },
        maxPerPeriod: {
          type: "number",
          description: "Max USDC per period (micro-USDC)",
        },
        periodSeconds: {
          type: "number",
          description: "Policy period in seconds",
          default: 86400,
        },
        disputeWindow: {
          type: "number",
          description: "Dispute window in seconds",
          default: 300,
        },
        allowlistEnabled: {
          type: "boolean",
          description: "Enable merchant allowlist",
          default: false,
        },
        autoSettleEnabled: {
          type: "boolean",
          description: "Enable auto-settle",
          default: true,
        },
      },
      required: ["maxPerCall", "maxPerPeriod"],
    },
  },
  {
    name: "x402_settle",
    description:
      "Settle a payment after the dispute window has expired. Releases escrowed USDC to the merchant.",
    inputSchema: {
      type: "object" as const,
      properties: {
        paymentId: {
          type: "number",
          description: "Payment ID to settle",
        },
        agentId: {
          type: "number",
          description: "Agent ID (default 0)",
        },
      },
      required: ["paymentId"],
    },
  },
];

// ── Server setup ──

const server = new Server(
  { name: "x402warden", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "x402_pay":
        result = await handlePay(args as Record<string, unknown>);
        break;
      case "x402_balance":
        result = await handleBalance();
        break;
      case "x402_status":
        result = await handleStatus(args as Record<string, unknown>);
        break;
      case "x402_init":
        result = await handleInit(args as Record<string, unknown>);
        break;
      case "x402_set_policy":
        result = await handleSetPolicy(args as Record<string, unknown>);
        break;
      case "x402_settle":
        result = await handleSettle(args as Record<string, unknown>);
        break;
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
