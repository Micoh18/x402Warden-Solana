import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  buildMerchantRiskProfile,
  type PaymentEscrowAccount,
} from "../sdk/src";

function payment(
  merchant: PublicKey,
  amount: number,
  state: string
): PaymentEscrowAccount {
  return {
    agent: Keypair.generate().publicKey,
    paymentId: new BN(1),
    merchant,
    amount: new BN(amount),
    escrowTokenAccount: Keypair.generate().publicKey,
    createdAt: new BN(1),
    settleAfter: new BN(2),
    state: { [state]: {} },
    x402RequestHash: Array.from(new Uint8Array(32)),
    bump: 255,
  };
}

describe("14 - Merchant Risk Profile", () => {
  it("builds a low-risk profile from settled on-chain escrows", () => {
    const merchant = Keypair.generate().publicKey;
    const profile = buildMerchantRiskProfile({
      merchant: merchant.toBase58(),
      payments: [
        payment(merchant, 1_000_000, "settled"),
        payment(merchant, 2_000_000, "settled"),
        payment(merchant, 3_000_000, "pending"),
      ],
    });

    expect(profile.source).to.equal("on_chain_payment_escrow");
    expect(profile.totalVolume).to.equal("6000000");
    expect(profile.paymentCount).to.equal(3);
    expect(profile.settledCount).to.equal(2);
    expect(profile.disputedCount).to.equal(0);
    expect(profile.riskLevel).to.equal("low");
  });

  it("marks small samples as unknown", () => {
    const merchant = Keypair.generate().publicKey;
    const profile = buildMerchantRiskProfile({
      merchant: merchant.toBase58(),
      payments: [payment(merchant, 1_000_000, "settled")],
    });

    expect(profile.paymentCount).to.equal(1);
    expect(profile.riskLevel).to.equal("unknown");
  });

  it("uses only the requested merchant and raises risk for refunds/disputes", () => {
    const merchant = Keypair.generate().publicKey;
    const otherMerchant = Keypair.generate().publicKey;
    const profile = buildMerchantRiskProfile({
      merchant: merchant.toBase58(),
      payments: [
        payment(merchant, 1_000_000, "settled"),
        payment(merchant, 2_000_000, "refunded"),
        payment(merchant, 3_000_000, "disputed"),
        payment(otherMerchant, 99_000_000, "refunded"),
      ],
    });

    expect(profile.totalVolume).to.equal("6000000");
    expect(profile.paymentCount).to.equal(3);
    expect(profile.refundedCount).to.equal(1);
    expect(profile.activeDisputedCount).to.equal(1);
    expect(profile.disputedCount).to.equal(2);
    expect(profile.disputeRate).to.equal(2 / 3);
    expect(profile.refundRate).to.equal(1 / 3);
    expect(profile.riskLevel).to.equal("high");
  });
});
