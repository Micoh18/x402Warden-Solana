import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A"
);

export const AGENT_SEED = Buffer.from("agent");
export const POLICY_SEED = Buffer.from("policy");
export const ALLOWLIST_SEED = Buffer.from("allowlist");
export const PAYMENT_SEED = Buffer.from("payment");
export const DISPUTE_SEED = Buffer.from("dispute");
export const PAYMENT_EVIDENCE_SEED = Buffer.from("payment_evidence");
export const ESCROW_TOKEN_SEED = Buffer.from("escrow_token");

export const DEFAULT_DISPUTE_WINDOW_SEC = 300;
export const MIN_DISPUTE_WINDOW_SEC = 60;
export const MAX_DISPUTE_WINDOW_SEC = 86400;
export const MERCHANT_RESPONSE_DEADLINE_SEC = 86400;
export const MAX_MERCHANTS_PER_PAGE = 32;

export const RESOLUTION_NONE = 0;
export const RESOLUTION_FULL_REFUND = 1;
export const RESOLUTION_MERCHANT_WINS = 2;

export const REASON_NO_RESPONSE = 0;
export const REASON_BAD_RESPONSE = 1;
export const REASON_TIMEOUT = 2;
export const REASON_OTHER = 99;

export const RECEIPT_VERSION_V1 = 1;

export const DELIVERY_FAILURE_NONE = 0;
export const DELIVERY_FAILURE_NO_RESPONSE = 1;
export const DELIVERY_FAILURE_TIMEOUT = 2;
export const DELIVERY_FAILURE_NON_2XX = 3;
export const DELIVERY_FAILURE_INVALID_JSON = 4;
export const DELIVERY_FAILURE_EMPTY_BODY = 5;
export const DELIVERY_FAILURE_SERVICE_ERROR = 6;
export const DELIVERY_FAILURE_OTHER = 99;
