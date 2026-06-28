import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  DELIVERY_FAILURE_NON_2XX,
  buildPaymentReceiptV1,
  bytesToHex,
  hexToBytes32,
  getPaymentReceiptState,
  type PaymentEscrowAccount,
  type PaymentEvidenceAccount,
} from "../sdk/src";

function mockPayment(state: string): PaymentEscrowAccount {
  return {
    agent: Keypair.generate().publicKey,
    paymentId: new BN(42),
    merchant: Keypair.generate().publicKey,
    amount: new BN(5_000_000),
    escrowTokenAccount: Keypair.generate().publicKey,
    createdAt: new BN(1_700_000_000),
    settleAfter: new BN(1_700_000_300),
    state: { [state]: {} },
    x402RequestHash: Array.from({ length: 32 }, (_, index) => index),
    bump: 255,
  };
}

function mockEvidence(paymentEscrow: PublicKey): PaymentEvidenceAccount {
  return {
    payment: paymentEscrow,
    recorder: Keypair.generate().publicKey,
    receiptVersion: 1,
    paymentRequirementsHash: hexToBytes32("d".repeat(64)),
    requestContextHash: hexToBytes32("e".repeat(64)),
    responseHash: hexToBytes32("f".repeat(64)),
    evidenceHash: hexToBytes32("1".repeat(64)),
    failureCode: DELIVERY_FAILURE_NON_2XX,
    statusCode: 503,
    recordedAt: new BN(1_700_000_100),
    bump: 254,
  };
}

describe("17 - PaymentReceiptV1", () => {
  it("serializes authoritative on-chain escrow fields", () => {
    const account = mockPayment("pending");
    const paymentEscrow = Keypair.generate().publicKey;
    const receipt = buildPaymentReceiptV1({
      paymentEscrow,
      account,
    });

    expect(receipt.version).to.equal(1);
    expect(receipt.source).to.equal("on_chain_payment_escrow");
    expect(receipt.agentPda).to.equal(account.agent.toBase58());
    expect(receipt.paymentEscrow).to.equal(paymentEscrow.toBase58());
    expect(receipt.paymentId).to.equal("42");
    expect(receipt.amount).to.equal("5000000");
    expect(receipt.escrowTokenAccount).to.equal(
      account.escrowTokenAccount.toBase58()
    );
    expect(receipt.x402RequestHash).to.equal(bytesToHex(account.x402RequestHash));
    expect(receipt.state).to.equal("pending");
    expect(receipt.createdAt).to.equal("1700000000");
    expect(receipt.settleAfter).to.equal("1700000300");
  });

  it("attaches only caller-provided off-chain hashes and signatures", () => {
    const account = mockPayment("disputed");
    const receipt = buildPaymentReceiptV1({
      paymentEscrow: Keypair.generate().publicKey,
      account,
      paymentRequirementsHash: "a".repeat(64),
      requestContextHash: "b".repeat(64),
      txSignature: "sig",
      deliveryEvidence: {
        version: 1,
        paymentEscrow: "escrow",
        source: "caller_provided",
        statusCode: 500,
        failureCode: "NON_2XX",
        evidenceHash: "c".repeat(64),
      },
    });

    expect(receipt.state).to.equal("disputed");
    expect(receipt.paymentRequirementsHash).to.equal("a".repeat(64));
    expect(receipt.requestContextHash).to.equal("b".repeat(64));
    expect(receipt.txSignature).to.equal("sig");
    expect(receipt.deliveryEvidence?.source).to.equal("caller_provided");
  });

  it("attaches persisted on-chain evidence when present", () => {
    const account = mockPayment("disputed");
    const paymentEscrow = Keypair.generate().publicKey;
    const receipt = buildPaymentReceiptV1({
      paymentEscrow,
      account,
      paymentEvidence: mockEvidence(paymentEscrow),
      paymentRequirementsHash: "a".repeat(64),
      requestContextHash: "b".repeat(64),
      txSignature: "sig",
      deliveryEvidence: {
        version: 1,
        paymentEscrow: "ignored",
        source: "caller_provided",
        statusCode: 200,
      },
    });

    expect(receipt.paymentRequirementsHash).to.equal("d".repeat(64));
    expect(receipt.requestContextHash).to.equal("e".repeat(64));
    expect(receipt.txSignature).to.equal("sig");
    expect(receipt.deliveryEvidence).to.deep.include({
      version: 1,
      paymentEscrow: paymentEscrow.toBase58(),
      source: "on_chain_account",
      statusCode: 503,
      responseHash: "f".repeat(64),
      failureCode: "NON_2XX",
      evidenceHash: "1".repeat(64),
    });
  });

  it("normalizes unknown or supported payment states", () => {
    expect(getPaymentReceiptState({ settled: {} })).to.equal("settled");
    expect(getPaymentReceiptState({ refunded: {} })).to.equal("refunded");
    expect(getPaymentReceiptState({ somethingElse: {} })).to.equal("unknown");
    expect(getPaymentReceiptState(undefined)).to.equal("unknown");
  });
});
