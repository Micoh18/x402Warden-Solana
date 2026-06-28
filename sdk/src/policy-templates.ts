import BN from "bn.js";
import type { PolicyAccount, SetPolicyParams } from "./types";

export type PolicyTemplatePresetName =
  | "conservative"
  | "balanced"
  | "exploration"
  | "high_value";

export type PolicySimulationResult =
  | "allowed"
  | "blocked";

export type PolicySimulationReasonCode =
  | "AGENT_PAUSED"
  | "PER_CALL_LIMIT"
  | "MERCHANT_NOT_ALLOWED"
  | "MERCHANT_LIMIT"
  | "PERIOD_LIMIT"
  | "ALLOWED";

export interface PolicyTemplateV1 {
  version: 1;
  name: string;
  description?: string;
  source: "local_template";
  policy: {
    maxPerCall: string;
    maxPerPeriod: string;
    periodSeconds: string;
    disputeWindowSeconds: number;
    allowlistEnabled: boolean;
    autoSettleEnabled: boolean;
  };
  merchants?: PolicyTemplateMerchantV1[];
}

export interface PolicyTemplateMerchantV1 {
  merchant: string;
  category?: number;
  maxPerCallOverride?: string;
}

export interface PolicySimulationInput {
  template?: PolicyTemplateV1;
  policy?: Pick<
    PolicyAccount,
    | "maxPerCall"
    | "maxPerPeriod"
    | "periodSeconds"
    | "periodStart"
    | "spentInPeriod"
    | "allowlistEnabled"
  > & {
    merchantEntries?: PolicyTemplateMerchantV1[];
  };
  amount: string | number | { toString(): string };
  merchant?: string;
  now?: string | number | { toString(): string };
  periodStart?: string | number | { toString(): string };
  spentInPeriod?: string | number | { toString(): string };
  paused?: boolean;
  merchants?: PolicyTemplateMerchantV1[];
}

export interface PolicySimulationDecision {
  version: 1;
  result: PolicySimulationResult;
  reasonCode: PolicySimulationReasonCode;
  reason: string;
  source: "local_policy_simulator";
  amount: string;
  merchant?: string;
  effectiveMaxPerCall: string;
  maxPerPeriod: string;
  spentInPeriod: string;
  projectedSpentInPeriod: string;
  periodSeconds: string;
  periodStart: string;
  periodReset: boolean;
  allowlistEnabled: boolean;
  merchantAllowlisted?: boolean;
  merchantMaxPerCallOverride?: string;
  mirrorsOnChainOrder: true;
}

export const POLICY_TEMPLATE_PRESETS: Record<
  PolicyTemplatePresetName,
  PolicyTemplateV1
> = {
  conservative: {
    version: 1,
    source: "local_template",
    name: "conservative",
    description: "Production agent with known merchants and low limits.",
    policy: {
      maxPerCall: "2000000",
      maxPerPeriod: "20000000",
      periodSeconds: "86400",
      disputeWindowSeconds: 600,
      allowlistEnabled: true,
      autoSettleEnabled: true,
    },
    merchants: [],
  },
  balanced: {
    version: 1,
    source: "local_template",
    name: "balanced",
    description: "Development or controlled production agent.",
    policy: {
      maxPerCall: "10000000",
      maxPerPeriod: "100000000",
      periodSeconds: "86400",
      disputeWindowSeconds: 300,
      allowlistEnabled: true,
      autoSettleEnabled: true,
    },
    merchants: [],
  },
  exploration: {
    version: 1,
    source: "local_template",
    name: "exploration",
    description: "Discovery agent that can pay arbitrary merchants.",
    policy: {
      maxPerCall: "50000000",
      maxPerPeriod: "500000000",
      periodSeconds: "86400",
      disputeWindowSeconds: 300,
      allowlistEnabled: false,
      autoSettleEnabled: true,
    },
    merchants: [],
  },
  high_value: {
    version: 1,
    source: "local_template",
    name: "high_value",
    description: "Known high-value services with tighter period windows.",
    policy: {
      maxPerCall: "100000000",
      maxPerPeriod: "1000000000",
      periodSeconds: "3600",
      disputeWindowSeconds: 1800,
      allowlistEnabled: true,
      autoSettleEnabled: true,
    },
    merchants: [],
  },
};

function toBn(value: string | number | { toString(): string } | undefined): BN {
  if (value == null) return new BN(0);
  if (BN.isBN(value)) return value as BN;
  return new BN(typeof value === "number" ? String(value) : value.toString());
}

function toBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function requireDecimalString(value: unknown, field: string): string {
  const str = typeof value === "number" ? String(value) : String(value ?? "");
  if (!/^\d+$/.test(str)) {
    throw new Error(`${field} must be a non-negative integer string`);
  }
  return str;
}

function optionalDecimalString(
  value: unknown,
  field: string
): string | undefined {
  if (value == null || value === "") return undefined;
  return requireDecimalString(value, field);
}

function normalizeMerchant(value: unknown, index: number): PolicyTemplateMerchantV1 {
  if (!value || typeof value !== "object") {
    throw new Error(`merchants[${index}] must be an object`);
  }
  const obj = value as Record<string, unknown>;
  const merchant = String(obj.merchant ?? "");
  if (!merchant) throw new Error(`merchants[${index}].merchant is required`);

  const category =
    obj.category == null ? undefined : Number.parseInt(String(obj.category), 10);
  if (category != null && (!Number.isInteger(category) || category < 0 || category > 255)) {
    throw new Error(`merchants[${index}].category must be 0-255`);
  }

  return {
    merchant,
    category,
    maxPerCallOverride: optionalDecimalString(
      obj.maxPerCallOverride,
      `merchants[${index}].maxPerCallOverride`
    ),
  };
}

export function buildPolicyTemplatePreset(
  name: PolicyTemplatePresetName
): PolicyTemplateV1 {
  return JSON.parse(JSON.stringify(POLICY_TEMPLATE_PRESETS[name]));
}

export function validatePolicyTemplateV1(value: unknown): PolicyTemplateV1 {
  if (!value || typeof value !== "object") {
    throw new Error("Policy template must be an object");
  }

  const obj = value as Record<string, unknown>;
  const policy = obj.policy as Record<string, unknown> | undefined;
  if (!policy || typeof policy !== "object") {
    throw new Error("Policy template requires policy object");
  }

  if (obj.version !== 1) throw new Error("Policy template version must be 1");

  const template: PolicyTemplateV1 = {
    version: 1,
    source: "local_template",
    name: String(obj.name || "custom"),
    description:
      obj.description == null ? undefined : String(obj.description),
    policy: {
      maxPerCall: requireDecimalString(policy.maxPerCall, "policy.maxPerCall"),
      maxPerPeriod: requireDecimalString(
        policy.maxPerPeriod,
        "policy.maxPerPeriod"
      ),
      periodSeconds: requireDecimalString(
        policy.periodSeconds,
        "policy.periodSeconds"
      ),
      disputeWindowSeconds: Number.parseInt(
        String(policy.disputeWindowSeconds),
        10
      ),
      allowlistEnabled: toBoolean(
        policy.allowlistEnabled,
        "policy.allowlistEnabled"
      ),
      autoSettleEnabled: toBoolean(
        policy.autoSettleEnabled,
        "policy.autoSettleEnabled"
      ),
    },
    merchants: Array.isArray(obj.merchants)
      ? obj.merchants.map(normalizeMerchant)
      : [],
  };

  if (
    !Number.isInteger(template.policy.disputeWindowSeconds) ||
    template.policy.disputeWindowSeconds < 0
  ) {
    throw new Error("policy.disputeWindowSeconds must be a non-negative integer");
  }

  return template;
}

export function parsePolicyTemplateJson(json: string): PolicyTemplateV1 {
  return validatePolicyTemplateV1(JSON.parse(json));
}

export function serializePolicyTemplateJson(template: PolicyTemplateV1): string {
  return JSON.stringify(validatePolicyTemplateV1(template), null, 2);
}

export function policyTemplateToSetPolicyParams(
  template: PolicyTemplateV1
): SetPolicyParams {
  const normalized = validatePolicyTemplateV1(template);
  return {
    maxPerCall: new BN(normalized.policy.maxPerCall),
    maxPerPeriod: new BN(normalized.policy.maxPerPeriod),
    periodSeconds: new BN(normalized.policy.periodSeconds),
    disputeWindowSeconds: normalized.policy.disputeWindowSeconds,
    allowlistEnabled: normalized.policy.allowlistEnabled,
    autoSettleEnabled: normalized.policy.autoSettleEnabled,
  };
}

function sourcePolicy(input: PolicySimulationInput): {
  maxPerCall: BN;
  maxPerPeriod: BN;
  periodSeconds: BN;
  periodStart: BN;
  spentInPeriod: BN;
  allowlistEnabled: boolean;
  merchants: PolicyTemplateMerchantV1[];
} {
  if (input.template) {
    const template = validatePolicyTemplateV1(input.template);
    return {
      maxPerCall: new BN(template.policy.maxPerCall),
      maxPerPeriod: new BN(template.policy.maxPerPeriod),
      periodSeconds: new BN(template.policy.periodSeconds),
      periodStart: toBn(input.periodStart),
      spentInPeriod: toBn(input.spentInPeriod),
      allowlistEnabled: template.policy.allowlistEnabled,
      merchants: input.merchants ?? template.merchants ?? [],
    };
  }

  if (!input.policy) {
    throw new Error("Policy simulation requires template or policy");
  }

  return {
    maxPerCall: toBn(input.policy.maxPerCall),
    maxPerPeriod: toBn(input.policy.maxPerPeriod),
    periodSeconds: toBn(input.policy.periodSeconds),
    periodStart: toBn(input.periodStart ?? input.policy.periodStart),
    spentInPeriod: toBn(input.spentInPeriod ?? input.policy.spentInPeriod),
    allowlistEnabled: Boolean(input.policy.allowlistEnabled),
    merchants: input.merchants ?? input.policy.merchantEntries ?? [],
  };
}

export function simulatePolicyPayment(
  input: PolicySimulationInput
): PolicySimulationDecision {
  const policy = sourcePolicy(input);
  const amount = toBn(input.amount);
  const now = toBn(input.now);
  const merchant = input.merchant;
  const merchantEntry = merchant
    ? policy.merchants.find((entry) => entry.merchant === merchant)
    : undefined;
  const merchantMaxPerCallOverride = merchantEntry?.maxPerCallOverride
    ? toBn(merchantEntry.maxPerCallOverride)
    : new BN(0);
  const periodReset =
    now.gt(new BN(0)) &&
    now.sub(policy.periodStart).gt(policy.periodSeconds);
  const spentInPeriod = periodReset ? new BN(0) : policy.spentInPeriod;
  const projectedSpentInPeriod = spentInPeriod.add(amount);

  const base = {
    version: 1 as const,
    source: "local_policy_simulator" as const,
    amount: amount.toString(),
    merchant,
    effectiveMaxPerCall: policy.maxPerCall.toString(),
    maxPerPeriod: policy.maxPerPeriod.toString(),
    spentInPeriod: spentInPeriod.toString(),
    projectedSpentInPeriod: projectedSpentInPeriod.toString(),
    periodSeconds: policy.periodSeconds.toString(),
    periodStart: (periodReset ? now : policy.periodStart).toString(),
    periodReset,
    allowlistEnabled: policy.allowlistEnabled,
    merchantAllowlisted: policy.allowlistEnabled
      ? Boolean(merchantEntry)
      : undefined,
    merchantMaxPerCallOverride:
      merchantMaxPerCallOverride.gt(new BN(0))
        ? merchantMaxPerCallOverride.toString()
        : undefined,
    mirrorsOnChainOrder: true as const,
  };

  if (input.paused) {
    return {
      ...base,
      result: "blocked",
      reasonCode: "AGENT_PAUSED",
      reason: "Agent is paused.",
    };
  }

  if (amount.gt(policy.maxPerCall)) {
    return {
      ...base,
      result: "blocked",
      reasonCode: "PER_CALL_LIMIT",
      reason: "Amount exceeds global per-call policy.",
    };
  }

  if (policy.allowlistEnabled) {
    if (!merchantEntry) {
      return {
        ...base,
        result: "blocked",
        reasonCode: "MERCHANT_NOT_ALLOWED",
        reason: "Merchant is not in the allowlist.",
      };
    }

    if (
      merchantMaxPerCallOverride.gt(new BN(0)) &&
      amount.gt(merchantMaxPerCallOverride)
    ) {
      return {
        ...base,
        result: "blocked",
        reasonCode: "MERCHANT_LIMIT",
        reason: "Amount exceeds merchant-specific per-call override.",
      };
    }
  }

  if (projectedSpentInPeriod.gt(policy.maxPerPeriod)) {
    return {
      ...base,
      result: "blocked",
      reasonCode: "PERIOD_LIMIT",
      reason: "Amount would exceed the period budget.",
    };
  }

  return {
    ...base,
    result: "allowed",
    reasonCode: "ALLOWED",
    reason: "Payment fits the simulated policy.",
  };
}
