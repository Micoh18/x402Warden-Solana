import { Request, Response, NextFunction } from "express";
import { Connection } from "@solana/web3.js";
import { MERCHANT_ADDRESS, NETWORK, MOCK_MODE } from "../config";

/** Configuration for a paywalled endpoint. */
export interface PaywallConfig {
  /** Price in smallest unit (e.g. lamports / micro-USDC). */
  price: string;
  /** Human-readable description of what the payment buys. */
  description: string;
  /** Solana address that should receive the payment. */
  payTo: string;
}

/**
 * x402 middleware factory.
 *
 * Wraps an Express route so that:
 * 1. If the request carries a valid `X-PAYMENT` header the request proceeds.
 * 2. If `MOCK_MODE` is enabled any header with the right shape is accepted
 *    without hitting the chain.
 * 3. Otherwise the server responds with HTTP 402 and x402 payment
 *    requirements so the client knows how to pay.
 */
export function x402Paywall(config: PaywallConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      console.log(
        `[x402] 💰 Payment required for ${req.method} ${req.path} — returning 402`
      );

      res.status(402).json({
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: NETWORK,
            maxAmountRequired: config.price,
            resource: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
            description: config.description,
            mimeType: "application/json",
            payTo: config.payTo,
            maxTimeoutSeconds: 300,
          },
        ],
      });
      return;
    }

    // ---- Parse the payment header ----
    let payment: {
      x402Version?: number;
      scheme?: string;
      network?: string;
      payload?: { signature?: string };
    };

    try {
      payment = JSON.parse(paymentHeader);
    } catch {
      console.log("[x402] ❌ Malformed X-PAYMENT header — not valid JSON");
      res.status(400).json({ error: "Malformed X-PAYMENT header" });
      return;
    }

    // ---- Mock mode: accept any well-formed header ----
    if (MOCK_MODE) {
      console.log(
        `[x402] ✅ MOCK MODE — accepting payment for ${req.path} without on-chain verification`
      );
      next();
      return;
    }

    // ---- Real verification ----
    const signature = payment.payload?.signature;
    if (!signature) {
      console.log("[x402] ❌ Missing transaction signature in payment header");
      res
        .status(400)
        .json({ error: "Missing transaction signature in X-PAYMENT payload" });
      return;
    }

    try {
      console.log(
        `[x402] 🔍 Verifying transaction ${signature} on ${NETWORK}…`
      );

      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        console.log("[x402] ❌ Transaction not found on-chain");
        res.status(402).json({ error: "Transaction not found on-chain" });
        return;
      }

      if (tx.meta?.err) {
        console.log("[x402] ❌ Transaction failed on-chain");
        res.status(402).json({ error: "Transaction failed on-chain" });
        return;
      }

      console.log(`[x402] ✅ Payment verified — granting access to ${req.path}`);
      next();
    } catch (err) {
      console.error("[x402] ❌ Error verifying payment:", err);
      res.status(500).json({ error: "Payment verification failed" });
    }
  };
}
