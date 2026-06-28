import { expect } from "chai";
import { PublicKey } from "@solana/web3.js";
import {
  DELIVERY_FAILURE_SERVICE_ERROR,
  findPaymentEvidencePda,
  PAYMENT_EVIDENCE_SEED,
} from "../sdk/src";
import IDL from "../sdk/src/idl";

describe("18 - Payment Evidence Account", () => {
  const paymentEscrow = new PublicKey("11111111111111111111111111111111");

  it("derives the payment evidence PDA from the escrow", () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [PAYMENT_EVIDENCE_SEED, paymentEscrow.toBuffer()],
      new PublicKey(IDL.address)
    );
    const [actual] = findPaymentEvidencePda(paymentEscrow, new PublicKey(IDL.address));

    expect(actual.toBase58()).to.equal(expected.toBase58());
  });

  it("keeps the checked-in IDL synced for evidence recording", () => {
    const instruction = IDL.instructions.find(
      (item) => item.name === "record_payment_evidence"
    );
    const account = IDL.accounts.find(
      (item) => item.name === "PaymentEvidenceAccount"
    );
    const type = IDL.types.find(
      (item) => item.name === "PaymentEvidenceAccount"
    );

    expect(instruction?.args.map((arg) => arg.name)).to.deep.equal([
      "receipt_version",
      "payment_requirements_hash",
      "request_context_hash",
      "response_hash",
      "evidence_hash",
      "failure_code",
      "status_code",
    ]);
    expect(instruction?.accounts.map((arg) => arg.name)).to.include(
      "payment_evidence"
    );
    expect(account?.discriminator).to.deep.equal([
      90,
      50,
      254,
      227,
      183,
      110,
      190,
      213,
    ]);
    expect(type?.type.kind).to.equal("struct");
    expect(DELIVERY_FAILURE_SERVICE_ERROR).to.equal(6);
  });

  it("keeps the checked-in IDL synced for optional allowlist payment accounts", () => {
    const instruction = IDL.instructions.find(
      (item) => item.name === "process_x402_payment"
    );
    const allowlistAccount = instruction?.accounts.find(
      (item) => item.name === "allowlist_account"
    );

    expect(allowlistAccount?.optional).to.equal(true);
  });
});
