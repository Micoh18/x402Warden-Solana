import { expect } from "chai";
import {
  buildPolicyTemplatePreset,
  parsePolicyTemplateJson,
  policyTemplateToSetPolicyParams,
  serializePolicyTemplateJson,
  simulatePolicyPayment,
  type PolicyTemplateV1,
} from "../sdk/src";

describe("15 - Policy Templates and Simulator", () => {
  it("exports and parses policy templates as versioned JSON", () => {
    const template = buildPolicyTemplatePreset("conservative");
    const json = serializePolicyTemplateJson(template);
    const parsed = parsePolicyTemplateJson(json);
    const params = policyTemplateToSetPolicyParams(parsed);

    expect(parsed.version).to.equal(1);
    expect(parsed.source).to.equal("local_template");
    expect(params.maxPerCall.toString()).to.equal("2000000");
    expect(params.maxPerPeriod.toString()).to.equal("20000000");
    expect(params.allowlistEnabled).to.equal(true);
  });

  it("allows a payment that fits limits and allowlist", () => {
    const template: PolicyTemplateV1 = {
      ...buildPolicyTemplatePreset("conservative"),
      merchants: [{ merchant: "Merchant111", maxPerCallOverride: "0" }],
    };

    const decision = simulatePolicyPayment({
      template,
      amount: "1000000",
      merchant: "Merchant111",
      spentInPeriod: "1000000",
    });

    expect(decision.result).to.equal("allowed");
    expect(decision.reasonCode).to.equal("ALLOWED");
    expect(decision.projectedSpentInPeriod).to.equal("2000000");
  });

  it("blocks paused agents before limit checks", () => {
    const decision = simulatePolicyPayment({
      template: buildPolicyTemplatePreset("exploration"),
      amount: "1",
      paused: true,
    });

    expect(decision.result).to.equal("blocked");
    expect(decision.reasonCode).to.equal("AGENT_PAUSED");
  });

  it("mirrors on-chain order by checking global per-call before merchant override", () => {
    const template: PolicyTemplateV1 = {
      ...buildPolicyTemplatePreset("conservative"),
      policy: {
        ...buildPolicyTemplatePreset("conservative").policy,
        maxPerCall: "5000000",
        allowlistEnabled: true,
      },
      merchants: [{ merchant: "Merchant111", maxPerCallOverride: "10000000" }],
    };

    const decision = simulatePolicyPayment({
      template,
      amount: "6000000",
      merchant: "Merchant111",
    });

    expect(decision.result).to.equal("blocked");
    expect(decision.reasonCode).to.equal("PER_CALL_LIMIT");
    expect(decision.mirrorsOnChainOrder).to.equal(true);
  });

  it("blocks missing allowlist merchants and period budget overflow", () => {
    const allowlistDecision = simulatePolicyPayment({
      template: buildPolicyTemplatePreset("conservative"),
      amount: "1000000",
      merchant: "UnknownMerchant",
    });

    expect(allowlistDecision.reasonCode).to.equal("MERCHANT_NOT_ALLOWED");

    const periodDecision = simulatePolicyPayment({
      template: buildPolicyTemplatePreset("exploration"),
      amount: "1000000",
      spentInPeriod: "500000000",
    });

    expect(periodDecision.result).to.equal("blocked");
    expect(periodDecision.reasonCode).to.equal("PERIOD_LIMIT");
  });

  it("resets period spending when the simulated period has expired", () => {
    const decision = simulatePolicyPayment({
      template: buildPolicyTemplatePreset("exploration"),
      amount: "1000000",
      spentInPeriod: "500000000",
      periodStart: "1000",
      now: "90000",
    });

    expect(decision.result).to.equal("allowed");
    expect(decision.periodReset).to.equal(true);
    expect(decision.spentInPeriod).to.equal("0");
  });
});
