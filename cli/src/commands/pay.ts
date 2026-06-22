import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  findAgentAccountPda,
  findPaymentEscrowPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, paid, policyBlock, error } from "../output";
import {
  type Parsed402,
  parse402Response,
  buildPaymentHeader,
  generateRequestHash,
  generateRequestHashHex,
  hashJson,
} from "../x402-flow";

function formatMicroUsdc(amount: number): string {
  return (amount / 1_000_000).toFixed(6);
}

function humanizePolicyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("per call")) return "Payment exceeds per-call policy";
  if (lower.includes("period")) return "Payment exceeds period budget";
  if (lower.includes("paused")) return "Agent is paused";
  if (lower.includes("allowlist") || lower.includes("merchant")) {
    return "Merchant is not allowed by policy";
  }
  if (lower.includes("exceeds")) return msg;
  return msg;
}

export const payCommand = new Command("pay")
  .description("Make an HTTP request, automatically handling x402 payments")
  .argument("<url>", "Target URL")
  .option("-m, --method <method>", "HTTP method", "GET")
  .option("-b, --body <body>", "Request body (JSON string)")
  .option("-H, --headers <headers>", "Request headers (JSON string)")
  .option("--max-amount <amount>", "Maximum payment amount (micro-USDC)")
  .option("--agent-id <id>", "Agent ID override")
  .action(async (url: string, opts) => {
    let parsedPayment: Parsed402 | undefined;
    const method = String(opts.method || "GET").toUpperCase();
    const maxAllowed =
      opts.maxAmount != null ? parseInt(opts.maxAmount, 10) : undefined;

    try {
      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);

      const headers: Record<string, string> = opts.headers
        ? JSON.parse(opts.headers)
        : {};

      const fetchOpts: RequestInit = {
        method,
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
      parsedPayment = payment;

      if (maxAllowed != null && payment.price > maxAllowed) {
        return policyBlock(
          `Price ${payment.price} exceeds max-amount ${maxAllowed}`,
          {
            endpoint: url,
            amountRequested: payment.price,
            maxAllowed,
            merchant: payment.payTo,
            usdcBlocked: formatMicroUsdc(payment.price),
          }
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
      const paymentId = agentData.paymentCount;
      const [paymentEscrowPda] = findPaymentEscrowPda(
        agentPda,
        paymentId,
        config.programId
      );

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
      const retryOpts: RequestInit = {
        method,
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
        receipt: {
          version: 1,
          agentId: config.agentId,
          agentPda: agentPda.toBase58(),
          paymentId: paymentId.toString(),
          paymentEscrow: paymentEscrowPda.toBase58(),
          merchant: payment.payTo,
          endpoint: url,
          method,
          amount: payment.price,
          paymentRequirementsHash: hashJson(responseBody),
          requestHash: generateRequestHashHex(url, method),
          responseHash: hashJson(retryBody),
          decision: "allowed",
          state: "paid_pending_settlement",
          txSignature,
        },
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
        return policyBlock(humanizePolicyError(msg), {
          endpoint: url,
          amountRequested: parsedPayment?.price,
          maxAllowed,
          merchant: parsedPayment?.payTo,
          usdcBlocked:
            parsedPayment?.price != null
              ? formatMicroUsdc(parsedPayment.price)
              : undefined,
        });
      }
      return error(msg);
    }
  });
