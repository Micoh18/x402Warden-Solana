import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import {
  buildBlockedPaymentReceiptV1,
  canonicalJson,
  signBlockedPaymentReceiptV1,
  verifyBlockedPaymentReceiptV1,
} from "../sdk/src";

describe("11 - Blocked Payment Receipts", () => {
  it("signs and verifies a blocked payment receipt", () => {
    const signer = Keypair.generate();
    const unsigned = buildBlockedPaymentReceiptV1({
      signer: signer.publicKey,
      agentPda: Keypair.generate().publicKey,
      agentId: 7,
      endpoint: "https://api.example.com/research",
      method: "GET",
      merchant: Keypair.generate().publicKey.toBase58(),
      amountRequested: 10_000_000,
      maxAllowed: 5_000_000,
      reasonCode: "MAX_AMOUNT_EXCEEDED",
      reason: "Price 10000000 exceeds max-amount 5000000",
      requestContextHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      x402RequestHash:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      createdAt: "2026-06-28T00:00:00.000Z",
    });

    const receipt = signBlockedPaymentReceiptV1(unsigned, signer.secretKey);

    expect(receipt.source).to.equal("signed_off_chain_record");
    expect(receipt.signature.scheme).to.equal("ed25519");
    expect(receipt.signature.value).to.have.length(128);
    expect(verifyBlockedPaymentReceiptV1(receipt)).to.equal(true);
  });

  it("rejects tampered signed receipts", () => {
    const signer = Keypair.generate();
    const receipt = signBlockedPaymentReceiptV1(
      buildBlockedPaymentReceiptV1({
        signer: signer.publicKey,
        amountRequested: 2_000_000,
        maxAllowed: 1_000_000,
        reasonCode: "MAX_AMOUNT_EXCEEDED",
        reason: "Too expensive",
        createdAt: "2026-06-28T00:00:00.000Z",
      }),
      signer.secretKey
    );

    const tampered = {
      ...receipt,
      amountRequested: "1",
    };

    expect(verifyBlockedPaymentReceiptV1(tampered)).to.equal(false);
  });

  it("returns false for malformed receipt signatures", () => {
    const signer = Keypair.generate();
    const receipt = signBlockedPaymentReceiptV1(
      buildBlockedPaymentReceiptV1({
        signer: signer.publicKey,
        reasonCode: "OTHER",
        reason: "Malformed input test",
        createdAt: "2026-06-28T00:00:00.000Z",
      }),
      signer.secretKey
    );

    expect(
      verifyBlockedPaymentReceiptV1({
        ...receipt,
        signature: {
          ...receipt.signature,
          value: "not-hex",
        },
      })
    ).to.equal(false);
  });

  it("canonicalizes object keys before signing", () => {
    expect(canonicalJson({ b: 2, a: 1 })).to.equal('{"a":1,"b":2}');
  });
});
