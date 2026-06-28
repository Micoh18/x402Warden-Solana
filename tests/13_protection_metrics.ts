import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  buildBlockedPaymentReceiptV1,
  buildProtectionMetricsV1,
  findProtectionMetric,
  signBlockedPaymentReceiptV1,
  type PaymentEscrowAccount,
} from "../sdk/src";

function payment(amount: number, state: string): PaymentEscrowAccount {
  return {
    agent: Keypair.generate().publicKey,
    paymentId: new BN(1),
    merchant: Keypair.generate().publicKey,
    amount: new BN(amount),
    escrowTokenAccount: Keypair.generate().publicKey,
    createdAt: new BN(1),
    settleAfter: new BN(2),
    state: { [state]: {} },
    x402RequestHash: Array.from(new Uint8Array(32)),
    bump: 255,
  };
}

describe("13 - Protection Metrics", () => {
  it("sums escrow metrics from on-chain payment states", () => {
    const report = buildProtectionMetricsV1({
      payments: [
        payment(1_000_000, "pending"),
        payment(2_000_000, "disputed"),
        payment(3_000_000, "refunded"),
        payment(4_000_000, "settled"),
      ],
    });

    expect(report.amounts.usdcProtected).to.equal("10000000");
    expect(report.amounts.activeEscrow).to.equal("3000000");
    expect(report.amounts.usdcRecovered).to.equal("3000000");
    expect(report.amounts.usdcSettled).to.equal("4000000");
    expect(report.counts.activeEscrows).to.equal(2);
    expect(report.counts.recoveredEscrows).to.equal(1);
    expect(report.counts.settledEscrows).to.equal(1);

    expect(findProtectionMetric(report, "usdc_recovered")?.source).to.equal(
      "on_chain_account"
    );
    expect(findProtectionMetric(report, "usdc_blocked")?.status).to.equal(
      "unavailable"
    );
  });

  it("counts only verified signed blocked receipts as blocked USDC", () => {
    const signer = Keypair.generate();
    const validReceipt = signBlockedPaymentReceiptV1(
      buildBlockedPaymentReceiptV1({
        signer: signer.publicKey,
        amountRequested: 5_000_000,
        reasonCode: "MAX_AMOUNT_EXCEEDED",
        reason: "Price exceeds limit",
        createdAt: "2026-06-28T00:00:00.000Z",
      }),
      signer.secretKey
    );
    const tamperedReceipt = {
      ...validReceipt,
      amountRequested: "9000000",
    };

    const report = buildProtectionMetricsV1({
      payments: [],
      blockedReceipts: [validReceipt, tamperedReceipt],
    });

    expect(report.amounts.usdcBlocked).to.equal("5000000");
    expect(report.counts.blockedReceipts).to.equal(1);
    expect(report.counts.invalidBlockedReceipts).to.equal(1);
    expect(report.sources.usdcBlocked).to.equal("signed_off_chain_record");
    expect(report.statuses.usdcBlocked).to.equal("available");
  });

  it("marks caller blocked amounts as local estimates", () => {
    const report = buildProtectionMetricsV1({
      payments: [],
      localBlockedEstimate: 7_000_000,
    });

    expect(report.amounts.usdcBlocked).to.equal("7000000");
    expect(report.sources.usdcBlocked).to.equal("local_dev_only");
    expect(report.statuses.usdcBlocked).to.equal("local_estimate");
  });
});
