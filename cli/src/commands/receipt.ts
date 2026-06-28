import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  X402WardenClient,
  buildPaymentReceiptV1,
  findAgentAccountPda,
  findPaymentEvidencePda,
  findPaymentEscrowPda,
} from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";

function isDecimalId(value: string): boolean {
  return /^\d+$/.test(value);
}

function isMissingPaymentEvidenceError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /account (does not exist|not found)|could not find account|AccountNotFound/i.test(message);
}

export const receiptCommand = new Command("receipt")
  .description("Fetch a PaymentReceiptV1 from an existing on-chain escrow")
  .argument("<payment>", "Payment ID for the configured agent, or payment escrow public key")
  .option("--agent-id <id>", "Agent ID override when <payment> is a payment ID")
  .option("--escrow", "Treat <payment> as a payment escrow public key", false)
  .option("--payment-requirements-hash <hash>", "Optional caller-provided payment requirements hash")
  .option("--request-context-hash <hash>", "Optional caller-provided request context hash")
  .option("--tx-signature <signature>", "Optional transaction signature to attach")
  .action(async (payment: string, opts) => {
    try {
      const agentIdOverride =
        opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);

      const client = new X402WardenClient({
        connection: config.connection,
        wallet: config.wallet,
        programId: config.programId,
      });

      const [configuredAgentPda] = findAgentAccountPda(
        config.wallet.publicKey,
        config.agentId,
        config.programId
      );

      const paymentEscrowPda =
        opts.escrow || !isDecimalId(payment)
          ? new PublicKey(payment)
          : findPaymentEscrowPda(
              configuredAgentPda,
              new BN(payment),
              config.programId
            )[0];

      const account = await client.getPayment(paymentEscrowPda);
      const [paymentEvidencePda] = findPaymentEvidencePda(
        paymentEscrowPda,
        config.programId
      );
      let paymentEvidence;
      try {
        paymentEvidence = await client.getPaymentEvidence(paymentEvidencePda);
      } catch (err) {
        if (!isMissingPaymentEvidenceError(err)) throw err;
        paymentEvidence = undefined;
      }

      const receipt = buildPaymentReceiptV1({
        paymentEscrow: paymentEscrowPda,
        account,
        paymentEvidence,
        paymentRequirementsHash: opts.paymentRequirementsHash,
        requestContextHash: opts.requestContextHash,
        txSignature: opts.txSignature,
      });

      return success({
        receipt,
        configuredAgentPda: configuredAgentPda.toBase58(),
        agentMatchesConfigured:
          receipt.agentPda === configuredAgentPda.toBase58(),
        paymentEvidencePda: paymentEvidencePda.toBase58(),
        onChainEvidenceFound: Boolean(paymentEvidence),
        note:
          "On-chain escrow fields are authoritative. If PaymentEvidenceAccount exists, receipt hashes are attached from it; otherwise HTTP-only hashes are included only when provided by the caller.",
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
