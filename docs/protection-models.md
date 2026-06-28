# Protection Models and Evidence Sources

x402warden should only present a product claim when the backing evidence is
clear. The TypeScript SDK exports the canonical v1 models from
`@x402warden/sdk`.

## Evidence Sources

| Source | Meaning | Product strength |
|---|---|---|
| `on_chain_account` | Current Solana account state, such as `PaymentEscrow` or `DisputeAccount`. | Strong for current state. |
| `on_chain_event` | Program event emitted by a confirmed transaction. | Strong when indexed with signature context. |
| `signed_off_chain_record` | JSON or log signed by the buyer/agent wallet. | Verifiable off-chain. |
| `caller_provided` | Runtime data returned by CLI, MCP, proxy, or dashboard caller. | Useful DX, not independently indexed. |
| `local_dev_only` | Browser storage, mock server, fixtures, or demo-only state. | Never a production metric. |
| `unavailable` | No reliable source exists yet. | Must be shown as unavailable. |

## PaymentReceiptV1

`PaymentReceiptV1` is anchored on `PaymentEscrow`. The v1 receipt must be valid
even when no indexer exists.

```ts
type PaymentReceiptV1 = {
  version: 1;
  source: "on_chain_payment_escrow";
  agentPda: string;
  paymentEscrow: string;
  paymentId: string;
  merchant: string;
  amount: string;
  escrowTokenAccount: string;
  x402RequestHash: string;
  paymentRequirementsHash?: string;
  requestContextHash?: string;
  txSignature?: string;
  state: "pending" | "disputed" | "settled" | "refunded" | "unknown";
  createdAt: string;
  settleAfter: string;
  deliveryEvidence?: DeliveryEvidenceV1;
};
```

The dashboard builds this receipt from the on-chain escrow and automatically
attaches `PaymentEvidenceAccount` hashes when that account exists. CLI, MCP,
and proxy can also add `paymentRequirementsHash`, `requestContextHash`,
`txSignature`, and caller-provided `deliveryEvidence` because they observe the
HTTP exchange.

## PaymentDecision

Payment decisions are split into three explicit stages:

| Stage | When it runs | Typical result |
|---|---|---|
| `should_pay` | Before funds move. | `allowed` or `blocked`. |
| `did_deliver` | After retrying the paid HTTP request. | `delivered` or `failed`. |
| `should_settle` | Before escrow release. | `settle`, `refund`, or `hold`. |

Early versions should keep `did_deliver` objective: status code, timeout,
non-empty body, JSON parse, explicit service error, or other machine-checkable
signals.

## DeliveryEvidenceV1

```ts
type DeliveryEvidenceV1 = {
  version: 1;
  paymentEscrow: string;
  source: EvidenceSource;
  statusCode?: number;
  responseHash?: string;
  failureCode?:
    | "NO_RESPONSE"
    | "TIMEOUT"
    | "NON_2XX"
    | "INVALID_JSON"
    | "EMPTY_BODY"
    | "SERVICE_ERROR"
    | "OTHER";
  evidenceUri?: string;
  evidenceHash?: string;
};
```

Current CLI, MCP, and proxy receipts include caller-provided response status,
response hash, failure code, and an `evidenceHash` over the evidence object. When
auto-dispute is enabled, the existing `DisputeAccount.reason_uri` field stores
that evidence hash as 64 ASCII bytes. This ties the dispute to the off-chain
evidence without storing large payloads on-chain.

For stronger evidence, CLI, MCP, and proxy can opt in to
`PaymentEvidenceAccount` creation after the paid retry. This account is keyed
by the payment escrow and stores only compact fields:

| Field | Source |
|---|---|
| `payment_requirements_hash` | Hash of the x402 payment requirements payload observed by the caller |
| `request_context_hash` | Hash of URL, method, request body hash, and request headers hash |
| `response_hash` | Hash of the paid retry response body, or zero bytes when no response exists |
| `evidence_hash` | Hash of the canonical `DeliveryEvidenceV1` object |
| `failure_code` | Compact on-chain delivery failure code; `0` means delivered/no failure |
| `status_code` | HTTP status code, or `0` when no response exists |

This is still not a payload archive. It gives receipts and disputes an on-chain
hash anchor while keeping response bodies and large logs off-chain.

## Protection Metrics

| Metric | Valid v1 source | Current behavior |
|---|---|---|
| USDC protected | Sum of `PaymentEscrow.amount`. | Available from on-chain escrows. |
| Active escrow | `PaymentEscrow.state` in `pending` or `disputed`. | Available from on-chain escrows. |
| USDC recovered | Sum of `PaymentEscrow.amount` where state is `refunded`. | Available from on-chain escrows. |
| USDC settled | Sum of `PaymentEscrow.amount` where state is `settled`. | Available from on-chain escrows. |
| USDC blocked | Signed block receipt or on-chain block event. | Unavailable unless caller provides a local estimate. |

`AgentAccount.totalDisputedLifetime` is useful historical context, but it is not
the same as recovered funds. It must not be labeled as recovered.

`buildProtectionMetricsV1` in the SDK implements these aggregation rules for
CLI, MCP, and dashboard. It marks caller-provided blocked amounts as
`local_estimate`; only verified signed `BlockedPaymentReceiptV1` objects are
counted as available blocked USDC.

## Merchant Risk Profile

`buildMerchantRiskProfile` creates a basic profile from `PaymentEscrow` accounts
for one merchant:

```ts
type MerchantRiskProfile = {
  version: 1;
  merchant: string;
  source: "on_chain_payment_escrow";
  totalVolume: string;
  paymentCount: number;
  settledCount: number;
  disputedCount: number;
  refundedCount: number;
  activeDisputedCount: number;
  disputeRate: number;
  refundRate: number;
  riskLevel: "low" | "medium" | "high" | "unknown";
};
```

CLI, MCP, and the dashboard payment table use this same helper. The score is
intentionally narrow: no social reputation, votes, reviews, or LLM judgement.
Small samples return `unknown` until enough escrow history exists.

## BlockedPaymentReceiptV1

Blocked payments do not create escrow. For early product use, CLI and MCP can
emit a signed off-chain receipt when a payment is blocked before funds move.

```ts
type BlockedPaymentReceiptV1 = {
  version: 1;
  source: "signed_off_chain_record";
  signer: string;
  agentPda?: string;
  agentId?: string;
  endpoint?: string;
  method?: string;
  merchant?: string;
  amountRequested?: string;
  maxAllowed?: string;
  reasonCode:
    | "MAX_AMOUNT_EXCEEDED"
    | "PER_CALL_LIMIT"
    | "PERIOD_LIMIT"
    | "AGENT_PAUSED"
    | "MERCHANT_NOT_ALLOWED"
    | "POLICY_BLOCK"
    | "OTHER";
  reason: string;
  requestContextHash?: string;
  x402RequestHash?: string;
  createdAt: string;
  signature: {
    scheme: "ed25519";
    value: string;
    signedPayloadHash: string;
  };
};
```

The signature is produced over canonical JSON for every field except
`signature`. It proves the configured wallet created the block receipt, but it
is still off-chain until an indexer, API, or dashboard stores and aggregates it.
