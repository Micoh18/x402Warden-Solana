import {
  DELIVERY_FAILURE_EMPTY_BODY,
  DELIVERY_FAILURE_INVALID_JSON,
  DELIVERY_FAILURE_NO_RESPONSE,
  DELIVERY_FAILURE_NON_2XX,
  DELIVERY_FAILURE_NONE,
  DELIVERY_FAILURE_OTHER,
  DELIVERY_FAILURE_SERVICE_ERROR,
  DELIVERY_FAILURE_TIMEOUT,
  REASON_BAD_RESPONSE,
  REASON_NO_RESPONSE,
  REASON_OTHER,
  REASON_TIMEOUT,
} from "./constants";
import type {
  DeliveryEvidenceV1,
  DeliveryFailureCode,
  EvidenceSource,
  PaymentDecision,
} from "./receipts";

export interface DeliveryCheckInput {
  paymentEscrow: string;
  source?: EvidenceSource;
  statusCode?: number;
  responseHash?: string;
  bodyText?: string;
  parsedJson?: unknown;
  parseError?: boolean;
  timedOut?: boolean;
}

export interface DeliveryCheckOptions {
  expectJson?: boolean;
  expectNonEmpty?: boolean;
  serviceErrorKeys?: string[];
}

export interface DeliveryCheckResult {
  delivered: boolean;
  decision: PaymentDecision;
  evidence: DeliveryEvidenceV1;
}

const DEFAULT_SERVICE_ERROR_KEYS = ["error", "errors"];

function hasExplicitServiceError(
  parsedJson: unknown,
  errorKeys: string[]
): boolean {
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    return false;
  }

  const obj = parsedJson as Record<string, unknown>;
  return errorKeys.some((key) => {
    const value = obj[key];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  });
}

function failureReason(failureCode: DeliveryFailureCode): string {
  switch (failureCode) {
    case "NO_RESPONSE":
      return "Paid request did not return a response.";
    case "TIMEOUT":
      return "Paid request timed out.";
    case "NON_2XX":
      return "Paid request returned a non-2xx HTTP status.";
    case "INVALID_JSON":
      return "Paid request did not return valid JSON.";
    case "EMPTY_BODY":
      return "Paid request returned an empty body.";
    case "SERVICE_ERROR":
      return "Paid request returned an explicit service error payload.";
    case "OTHER":
      return "Paid request failed an objective delivery check.";
  }
}

export function evaluateDelivery(
  input: DeliveryCheckInput,
  options: DeliveryCheckOptions = {}
): DeliveryCheckResult {
  const source = input.source ?? "caller_provided";
  const bodyText = input.bodyText ?? "";
  const errorKeys = options.serviceErrorKeys ?? DEFAULT_SERVICE_ERROR_KEYS;

  let failureCode: DeliveryFailureCode | undefined;

  if (input.timedOut) {
    failureCode = "TIMEOUT";
  } else if (input.statusCode == null) {
    failureCode = "NO_RESPONSE";
  } else if (input.statusCode < 200 || input.statusCode >= 300) {
    failureCode = "NON_2XX";
  } else if (options.expectNonEmpty && bodyText.trim().length === 0) {
    failureCode = "EMPTY_BODY";
  } else if (options.expectJson && input.parseError) {
    failureCode = "INVALID_JSON";
  } else if (hasExplicitServiceError(input.parsedJson, errorKeys)) {
    failureCode = "SERVICE_ERROR";
  }

  const evidence: DeliveryEvidenceV1 = {
    version: 1,
    paymentEscrow: input.paymentEscrow,
    source,
    statusCode: input.statusCode,
    responseHash: input.responseHash,
    failureCode,
  };

  if (!failureCode) {
    return {
      delivered: true,
      decision: {
        version: 1,
        stage: "did_deliver",
        result: "delivered",
        source,
      },
      evidence,
    };
  }

  return {
    delivered: false,
    decision: {
      version: 1,
      stage: "did_deliver",
      result: "failed",
      reason: failureReason(failureCode),
      source,
    },
    evidence,
  };
}

export function deliveryFailureCodeToReasonCode(
  failureCode: DeliveryFailureCode | undefined
): number {
  switch (failureCode) {
    case "NO_RESPONSE":
      return REASON_NO_RESPONSE;
    case "TIMEOUT":
      return REASON_TIMEOUT;
    case "NON_2XX":
    case "INVALID_JSON":
    case "EMPTY_BODY":
    case "SERVICE_ERROR":
      return REASON_BAD_RESPONSE;
    case "OTHER":
    default:
      return REASON_OTHER;
  }
}

export function deliveryFailureCodeToOnChainCode(
  failureCode: DeliveryFailureCode | undefined
): number {
  switch (failureCode) {
    case "NO_RESPONSE":
      return DELIVERY_FAILURE_NO_RESPONSE;
    case "TIMEOUT":
      return DELIVERY_FAILURE_TIMEOUT;
    case "NON_2XX":
      return DELIVERY_FAILURE_NON_2XX;
    case "INVALID_JSON":
      return DELIVERY_FAILURE_INVALID_JSON;
    case "EMPTY_BODY":
      return DELIVERY_FAILURE_EMPTY_BODY;
    case "SERVICE_ERROR":
      return DELIVERY_FAILURE_SERVICE_ERROR;
    case "OTHER":
      return DELIVERY_FAILURE_OTHER;
    default:
      return DELIVERY_FAILURE_NONE;
  }
}

export function onChainDeliveryFailureCodeToFailureCode(
  code: number
): DeliveryFailureCode | undefined {
  switch (code) {
    case DELIVERY_FAILURE_NONE:
      return undefined;
    case DELIVERY_FAILURE_NO_RESPONSE:
      return "NO_RESPONSE";
    case DELIVERY_FAILURE_TIMEOUT:
      return "TIMEOUT";
    case DELIVERY_FAILURE_NON_2XX:
      return "NON_2XX";
    case DELIVERY_FAILURE_INVALID_JSON:
      return "INVALID_JSON";
    case DELIVERY_FAILURE_EMPTY_BODY:
      return "EMPTY_BODY";
    case DELIVERY_FAILURE_SERVICE_ERROR:
      return "SERVICE_ERROR";
    case DELIVERY_FAILURE_OTHER:
      return "OTHER";
    default:
      return "OTHER";
  }
}

export function evidenceHashToReasonUri(evidenceHash: string): number[] {
  const normalized = evidenceHash.startsWith("0x")
    ? evidenceHash.slice(2)
    : evidenceHash;
  const chars = normalized.slice(0, 64).padEnd(64, "0");
  return Array.from(chars).map((char) => char.charCodeAt(0));
}

export function reasonUriToEvidenceHash(reasonUri: ArrayLike<number>): string {
  return Array.from(reasonUri)
    .map((byte) => String.fromCharCode(byte))
    .join("")
    .replace(/\0+$/g, "")
    .trim();
}
