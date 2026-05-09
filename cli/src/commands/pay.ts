import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  findAgentAccountPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, paid, policyBlock, error } from "../output";
import {
  parse402Response,
  buildPaymentHeader,
  generateRequestHash,
} from "../x402-flow";

export const payCommand = new Command("pay")
  .description("Make an HTTP request, automatically handling x402 payments")
  .argument("<url>", "Target URL")
  .option("-m, --method <method>", "HTTP method", "GET")
  .option("-b, --body <body>", "Request body (JSON string)")
  .option("-H, --headers <headers>", "Request headers (JSON string)")
  .option("--max-amount <amount>", "Maximum payment amount (micro-USDC)")
  .option("--agent-id <id>", "Agent ID override")
  .action(async (url: string, opts) => {
    try {
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);

      const headers: Record<string, string> = opts.headers
        ? JSON.parse(opts.headers)
        : {};

      const fetchOpts: RequestInit = {
        method: opts.method,
        headers,
      };
      if (opts.body) {
        fetchOpts.body = opts.body;
        if (!headers["content-type"] && !headers["Content-Type"]) {
          (fetchOpts.headers as Record<string, string>)["Content-Type"] = "application/json";
        }
      }

      const response = await fetch(url, fetchOpts);

      if (response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await response.text();
        }
        return success({ statusCode: response.status, body });
      }

      if (response.status !== 402) {
        const text = await response.text();
        return error(`HTTP ${response.status}: ${text}`);
      }

      const responseBody = await response.json();
      const payment = parse402Response(responseBody);

      if (opts.maxAmount && payment.price > parseInt(opts.maxAmount, 10)) {
        return policyBlock(
          `Price ${payment.price} exceeds max-amount ${opts.maxAmount}`
        );
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

      const requestHash = generateRequestHash(url, opts.method);

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
      const retryOpts: RequestInit = {
        method: opts.method,
        headers: retryHeaders,
      };
      if (opts.body) {
        retryOpts.body = opts.body;
      }

      const retryResponse = await fetch(url, retryOpts);

      let retryBody: unknown;
      try {
        retryBody = await retryResponse.json();
      } catch {
        retryBody = await retryResponse.text();
      }

      return paid({
        statusCode: retryResponse.status,
        txSignature,
        amountPaid: payment.price,
        body: retryBody,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes("policy") ||
        msg.includes("Policy") ||
        msg.includes("exceeds") ||
        msg.includes("paused")
      ) {
        return policyBlock(msg);
      }
      return error(msg);
    }
  });
