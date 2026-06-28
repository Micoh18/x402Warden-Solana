import { expect } from "chai";
import {
  DELIVERY_FAILURE_NONE,
  DELIVERY_FAILURE_NON_2XX,
  deliveryFailureCodeToReasonCode,
  deliveryFailureCodeToOnChainCode,
  evaluateDelivery,
  evidenceHashToReasonUri,
  hexToBytes32,
  onChainDeliveryFailureCodeToFailureCode,
  reasonUriToEvidenceHash,
  REASON_BAD_RESPONSE,
  REASON_NO_RESPONSE,
  REASON_TIMEOUT,
} from "../sdk/src";

describe("10 - Delivery Evidence Helpers", () => {
  const paymentEscrow = "Escrow111111111111111111111111111111111111";
  const responseHash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  it("marks a 2xx response as delivered", () => {
    const result = evaluateDelivery({
      paymentEscrow,
      statusCode: 200,
      responseHash,
      bodyText: '{"ok":true}',
      parsedJson: { ok: true },
    });

    expect(result.delivered).to.equal(true);
    expect(result.decision.result).to.equal("delivered");
    expect(result.evidence.failureCode).to.equal(undefined);
  });

  it("classifies non-2xx responses as objective failures", () => {
    const result = evaluateDelivery({
      paymentEscrow,
      statusCode: 503,
      responseHash,
      bodyText: "service unavailable",
    });

    expect(result.delivered).to.equal(false);
    expect(result.evidence.failureCode).to.equal("NON_2XX");
    expect(deliveryFailureCodeToReasonCode(result.evidence.failureCode)).to.equal(
      REASON_BAD_RESPONSE
    );
  });

  it("classifies expected JSON parse failures", () => {
    const result = evaluateDelivery(
      {
        paymentEscrow,
        statusCode: 200,
        responseHash,
        bodyText: "not json",
        parseError: true,
      },
      { expectJson: true }
    );

    expect(result.delivered).to.equal(false);
    expect(result.evidence.failureCode).to.equal("INVALID_JSON");
  });

  it("classifies empty bodies when non-empty output is required", () => {
    const result = evaluateDelivery(
      {
        paymentEscrow,
        statusCode: 204,
        responseHash,
        bodyText: "",
      },
      { expectNonEmpty: true }
    );

    expect(result.delivered).to.equal(false);
    expect(result.evidence.failureCode).to.equal("EMPTY_BODY");
  });

  it("classifies timeouts and missing responses", () => {
    expect(
      evaluateDelivery({ paymentEscrow, timedOut: true }).evidence.failureCode
    ).to.equal("TIMEOUT");
    expect(deliveryFailureCodeToReasonCode("TIMEOUT")).to.equal(REASON_TIMEOUT);

    expect(evaluateDelivery({ paymentEscrow }).evidence.failureCode).to.equal(
      "NO_RESPONSE"
    );
    expect(deliveryFailureCodeToReasonCode("NO_RESPONSE")).to.equal(
      REASON_NO_RESPONSE
    );
  });

  it("encodes evidence hashes into the existing 64-byte reason_uri field", () => {
    const reasonUri = evidenceHashToReasonUri(responseHash);

    expect(reasonUri).to.have.length(64);
    expect(reasonUriToEvidenceHash(reasonUri)).to.equal(responseHash);
  });

  it("maps delivery failure codes to on-chain compact codes", () => {
    expect(deliveryFailureCodeToOnChainCode(undefined)).to.equal(
      DELIVERY_FAILURE_NONE
    );
    expect(deliveryFailureCodeToOnChainCode("NON_2XX")).to.equal(
      DELIVERY_FAILURE_NON_2XX
    );
    expect(onChainDeliveryFailureCodeToFailureCode(DELIVERY_FAILURE_NON_2XX)).to.equal(
      "NON_2XX"
    );
    expect(onChainDeliveryFailureCodeToFailureCode(DELIVERY_FAILURE_NONE)).to.equal(
      undefined
    );
  });

  it("converts 32-byte hex hashes to fixed on-chain byte arrays", () => {
    expect(hexToBytes32(responseHash)).to.have.length(32);
    expect(hexToBytes32(responseHash)[0]).to.equal(170);
    expect(hexToBytes32(undefined)).to.deep.equal(new Array(32).fill(0));
    expect(() => hexToBytes32("abc")).to.throw("32-byte hex string");
  });
});
