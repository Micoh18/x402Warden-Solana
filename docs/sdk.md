# x402warden SDK Reference

TypeScript SDK for interacting with the x402warden Solana program.

---

## Installation

```bash
# From the monorepo
yarn workspace @x402warden/sdk build

# Or install from npm (when published)
yarn add @x402warden/sdk
```

---

## Setup

```typescript
import { X402WardenClient } from "@x402warden/sdk";
import { Connection } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

const connection = new Connection("https://api.devnet.solana.com");

const client = new X402WardenClient({
  connection,
  wallet: myWallet,           // Anchor Wallet (has publicKey + signTransaction)
  programId: CUSTOM_ID,       // optional — defaults to deployed program ID
});
```

---

## Instructions

### `createAgent(agentId, usdcTokenAccount, agentPda, policyPda)`

Creates a new AgentAccount and its associated PolicyAccount.

```typescript
import { findAgentAccountPda, findPolicyAccountPda } from "@x402warden/sdk";

const [agentPda] = findAgentAccountPda(wallet.publicKey, 0);
const [policyPda] = findPolicyAccountPda(agentPda);

const txSig = await client.createAgent(0, usdcTokenAccount, agentPda, policyPda);
```

| Param | Type | Description |
|---|---|---|
| `agentId` | `BN \| number` | Local agent ID (0, 1, 2...) |
| `usdcTokenAccount` | `PublicKey` | Your USDC token account |
| `agentPda` | `PublicKey` | Pre-derived agent PDA |
| `policyPda` | `PublicKey` | Pre-derived policy PDA |

**Returns:** Transaction signature (`string`)

---

### `setPolicy(agentPda, params)`

Updates the spending policy for an agent.

```typescript
import BN from "bn.js";

await client.setPolicy(agentPda, {
  maxPerCall: new BN(5_000_000),        // 5 USDC (6 decimals)
  maxPerPeriod: new BN(50_000_000),     // 50 USDC per period
  periodSeconds: new BN(86400),          // 24-hour period
  disputeWindowSeconds: 300,             // 5 minutes
  allowlistEnabled: true,
  autoSettleEnabled: true,
});
```

| Param | Type | Description |
|---|---|---|
| `maxPerCall` | `BN` | Max USDC lamports per individual payment |
| `maxPerPeriod` | `BN` | Max USDC lamports per period |
| `periodSeconds` | `BN` | Period duration in seconds |
| `disputeWindowSeconds` | `number` | Escrow hold time (60-86400) |
| `allowlistEnabled` | `boolean` | Whether to enforce merchant allowlist |
| `autoSettleEnabled` | `boolean` | Auto-release after window |

---

### `addMerchant(agentPda, allowlistPda, merchant, category, maxOverride)`

Adds a merchant to the allowlist.

```typescript
import { findAllowlistAccountPda } from "@x402warden/sdk";

const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);

await client.addMerchant(
  agentPda,
  allowlistPda,
  merchantPubkey,
  0,                    // category (0-255, free-form)
  0                     // maxOverride (0 = use policy default)
);
```

---

### `removeMerchant(agentPda, allowlistPda, merchant)`

Removes a merchant from the allowlist.

```typescript
await client.removeMerchant(agentPda, allowlistPda, merchantPubkey);
```

---

### `processPayment(agentPda, amount, merchant, x402RequestHash, userTokenAccount, usdcMint)`

Validates policies and creates an escrow for an x402 payment.

```typescript
const txSig = await client.processPayment(
  agentPda,
  new BN(3_000_000),                              // 3 USDC
  merchantPubkey,
  new Uint8Array(32),                              // SHA-256 of x402 requirements
  userTokenAccount,
  new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")  // devnet USDC
);
```

The SDK automatically derives `paymentEscrowPda` and `escrowTokenPda` from the agent's `paymentCount`.

---

## Receipt helpers

Use `buildPaymentReceiptV1` to serialize a `PaymentEscrow` account into the
canonical receipt shape shared by CLI, MCP, proxy, and dashboard.

```typescript
import { buildPaymentReceiptV1 } from "@x402warden/sdk";

const escrow = await client.getPayment(paymentEscrowPda);
const receipt = buildPaymentReceiptV1({
  paymentEscrow: paymentEscrowPda,
  account: escrow,
  paymentRequirementsHash,
  requestContextHash,
  txSignature,
});
```

The receipt's core fields come from the on-chain escrow account. HTTP response
hashes and delivery checks should be attached as `deliveryEvidence` with an
explicit source such as `caller_provided` or `signed_off_chain_record`.
Use `x402warden receipt <payment-id-or-escrow-pda>`, MCP `x402_receipt`, or the
dashboard receipt modal to rebuild this shape from an existing escrow account
without re-running payment. Those lookup paths also attach
`PaymentEvidenceAccount` hashes automatically when the account exists.

See [`protection-models.md`](./protection-models.md) for source semantics.

---

## Delivery evidence helpers

Use `evaluateDelivery` for objective post-payment checks. The helper returns a
`PaymentDecision` plus `DeliveryEvidenceV1`.

```typescript
import {
  deliveryFailureCodeToOnChainCode,
  deliveryFailureCodeToReasonCode,
  evaluateDelivery,
  evidenceHashToReasonUri,
  hexToBytes32,
} from "@x402warden/sdk";

const delivery = evaluateDelivery(
  {
    paymentEscrow: paymentEscrowPda.toBase58(),
    statusCode: retryResponse.status,
    responseHash,
    bodyText,
    parsedJson,
    parseError,
  },
  { expectJson: true, expectNonEmpty: true }
);

if (!delivery.delivered) {
  const reasonCode = deliveryFailureCodeToReasonCode(
    delivery.evidence.failureCode
  );
  const reasonUri = evidenceHashToReasonUri(evidenceHash);
  await client.openDispute(agentPda, paymentEscrowPda, reasonCode, reasonUri);
}
```

To persist the evidence hash anchor on-chain, call `recordPaymentEvidence` after
the paid retry. This creates a `PaymentEvidenceAccount` keyed by the payment
escrow and stores hashes/codes only:

```typescript
await client.recordPaymentEvidence(agentPda, paymentEscrowPda, {
  paymentRequirementsHash: hexToBytes32(paymentRequirementsHash),
  requestContextHash: hexToBytes32(requestContextHash),
  responseHash: hexToBytes32(responseHash),
  evidenceHash: hexToBytes32(evidenceHash),
  failureCode: deliveryFailureCodeToOnChainCode(delivery.evidence.failureCode),
  statusCode: retryResponse.status,
});
```

CLI `pay --record-evidence-on-chain` and MCP `x402_pay` with
`recordEvidenceOnChain: true` use this path. It is an additional transaction and
is therefore opt-in.

Failure codes map to the current on-chain reason codes:

| Failure code | Dispute reason |
|---|---|
| `NO_RESPONSE` | `REASON_NO_RESPONSE` |
| `TIMEOUT` | `REASON_TIMEOUT` |
| `NON_2XX`, `INVALID_JSON`, `EMPTY_BODY`, `SERVICE_ERROR` | `REASON_BAD_RESPONSE` |
| `OTHER` | `REASON_OTHER` |

---

## Blocked payment receipts

Use `buildBlockedPaymentReceiptV1`, `signBlockedPaymentReceiptV1`, and
`verifyBlockedPaymentReceiptV1` for signed off-chain receipts when a payment is
blocked before escrow exists.

```typescript
import {
  buildBlockedPaymentReceiptV1,
  signBlockedPaymentReceiptV1,
  verifyBlockedPaymentReceiptV1,
} from "@x402warden/sdk";

const unsigned = buildBlockedPaymentReceiptV1({
  signer: wallet.publicKey,
  agentPda,
  endpoint,
  method: "GET",
  merchant,
  amountRequested,
  maxAllowed,
  reasonCode: "MAX_AMOUNT_EXCEEDED",
  reason: "Price exceeds max-amount",
  requestContextHash,
  x402RequestHash,
});

const receipt = signBlockedPaymentReceiptV1(unsigned, keypair.secretKey);
const valid = verifyBlockedPaymentReceiptV1(receipt);
```

This is a verifiable off-chain record. It does not create an escrow, and it is
not an on-chain metric until stored by an indexer or submitted through a future
on-chain preflight/event path.

---

## Protection metrics

Use `buildProtectionMetricsV1` to aggregate buyer-protection metrics with the
same source semantics used by CLI, MCP, and dashboard.

```typescript
import { buildProtectionMetricsV1 } from "@x402warden/sdk";

const paymentEscrows = await program.account.paymentEscrow.all([
  { memcmp: { offset: 8, bytes: agentPda.toBase58() } },
]);

const report = buildProtectionMetricsV1({
  payments: paymentEscrows,
  blockedReceipts: [signedBlockedReceipt],
});
```

Rules:

| Metric | Source |
|---|---|
| `usdc_protected` | Sum of all `PaymentEscrow.amount` values |
| `active_escrow` | Count of `pending` or `disputed` escrows |
| `usdc_recovered` | Sum of `refunded` escrow amounts |
| `usdc_settled` | Sum of `settled` escrow amounts |
| `usdc_blocked` | Sum of verified `BlockedPaymentReceiptV1.amountRequested` values, or `unavailable` |

`localBlockedEstimate` is accepted for development and demos, but the returned
metric is marked `local_estimate` with source `local_dev_only`.

---

## Merchant risk profile

Use `buildMerchantRiskProfile` for a basic merchant profile derived only from
`PaymentEscrow` accounts.

```typescript
import { buildMerchantRiskProfile } from "@x402warden/sdk";

const profile = buildMerchantRiskProfile({
  merchant,
  payments: paymentEscrows,
});
```

The profile reports total escrowed volume, settled count, active disputed count,
refunded count, dispute rate, refund rate, and a conservative risk level:
`low`, `medium`, `high`, or `unknown`. Small samples return `unknown`; no social
reviews, votes, or subjective scoring are included.
The dashboard payment table renders this same risk level per merchant from the
currently loaded on-chain payment escrows.

---

## Policy templates and simulator

Use `buildPolicyTemplatePreset`, `validatePolicyTemplateV1`, and
`simulatePolicyPayment` to work with local policy templates before submitting an
on-chain `set_policy` transaction.

```typescript
import {
  buildPolicyTemplatePreset,
  simulatePolicyPayment,
} from "@x402warden/sdk";

const template = buildPolicyTemplatePreset("balanced");
const decision = simulatePolicyPayment({
  template,
  amount: "1000000",
  merchant,
  spentInPeriod: "0",
});
```

Built-in presets are `conservative`, `balanced`, `exploration`, and
`high_value`.

The simulator mirrors the current on-chain `process_payment` order:

1. paused agent
2. global `maxPerCall`
3. allowlist membership and merchant override
4. period budget

This matters because merchant `maxPerCallOverride` is checked after the global
per-call limit in the current program. The simulator is predictive only; funds
are controlled by on-chain policy state.

---

### `settlePayment(escrowPda, merchantTokenAccount)`

Releases escrowed funds to the merchant after the dispute window has passed.

```typescript
await client.settlePayment(escrowPda, merchantTokenAccount);
```

Can be called by **anyone** — no signer restriction.

---

### `openDispute(agentPda, escrowPda, reasonCode, reasonUri)`

Opens a dispute on a pending payment. Must be called within the dispute window.

```typescript
const reasonUri = new TextEncoder().encode("ipfs://QmHash...");
await client.openDispute(agentPda, escrowPda, 1, reasonUri);
```

| Reason Code | Meaning |
|---|---|
| 0 | No response from service |
| 1 | Bad response / garbage data |
| 2 | Timeout |
| 99 | Other |

---

### `merchantAcceptDispute(escrowPda, disputePda, ownerTokenAccount, agentPda)`

Merchant voluntarily accepts the dispute, refunding the owner.

```typescript
await client.merchantAcceptDispute(escrowPda, disputePda, ownerTokenAccount, agentPda);
```

---

### `merchantContestDispute(escrowPda, disputePda)`

Merchant contests the dispute. Must be within 24h deadline.

```typescript
await client.merchantContestDispute(escrowPda, disputePda);
```

---

### `autoRefundDispute(escrowPda, disputePda, ownerTokenAccount, agentPda)`

Auto-refunds if merchant missed the 24h response deadline. Can be called by anyone.

```typescript
await client.autoRefundDispute(escrowPda, disputePda, ownerTokenAccount, agentPda);
```

---

### `pauseAgent(agentPda)` / `unpauseAgent(agentPda)`

Emergency pause/unpause.

```typescript
await client.pauseAgent(agentPda);
await client.unpauseAgent(agentPda);
```

---

## Account Readers

All readers return deserialized account data.

```typescript
const agent: AgentAccount = await client.getAgent(agentPda);
const policy: PolicyAccount = await client.getPolicy(policyPda);
const allowlist: MerchantAllowlistAccount = await client.getAllowlist(allowlistPda);
const payment: PaymentEscrowAccount = await client.getPayment(escrowPda);
const dispute: DisputeAccount = await client.getDispute(disputePda);
```

---

## PDA Helpers

All PDA derivation functions accept an optional `programId` parameter (defaults to deployed program ID).

```typescript
import {
  findAgentAccountPda,
  findPolicyAccountPda,
  findAllowlistAccountPda,
  findPaymentEscrowPda,
  findDisputeAccountPda,
  findEscrowTokenAccountPda,
} from "@x402warden/sdk";

const [agentPda, agentBump] = findAgentAccountPda(ownerPubkey, agentId);
const [policyPda, policyBump] = findPolicyAccountPda(agentPda);
const [allowlistPda, allowlistBump] = findAllowlistAccountPda(agentPda, pageIndex);
const [paymentPda, paymentBump] = findPaymentEscrowPda(agentPda, paymentId);
const [disputePda, disputeBump] = findDisputeAccountPda(paymentPda);
const [escrowTokenPda, escrowBump] = findEscrowTokenAccountPda(paymentPda);
```

### PDA Seeds

| PDA | Seeds |
|---|---|
| AgentAccount | `["agent", owner, agent_id (u64 LE)]` |
| PolicyAccount | `["policy", agent_account]` |
| MerchantAllowlistAccount | `["allowlist", agent_account, page_index (u16 LE)]` |
| PaymentEscrow | `["payment", agent_account, payment_id (u64 LE)]` |
| DisputeAccount | `["dispute", payment_escrow]` |
| EscrowTokenAccount | `["escrow_token", payment_escrow]` |

---

## Types

### Enums

```typescript
enum PaymentState {
  Pending = "pending",
  Disputed = "disputed",
  Settled = "settled",
  Refunded = "refunded",
}

enum DisputeState {
  Open = "open",
  MerchantAccepted = "merchantAccepted",
  MerchantContested = "merchantContested",
  AutoRefunded = "autoRefunded",
  Resolved = "resolved",
}
```

### Constants

```typescript
const DEFAULT_DISPUTE_WINDOW_SEC = 300;    // 5 minutes
const MIN_DISPUTE_WINDOW_SEC = 60;         // 1 minute
const MAX_DISPUTE_WINDOW_SEC = 86400;      // 24 hours
const MERCHANT_RESPONSE_DEADLINE_SEC = 86400;  // 24 hours
const MAX_MERCHANTS_PER_PAGE = 32;

// Reason codes
const REASON_NO_RESPONSE = 0;
const REASON_BAD_RESPONSE = 1;
const REASON_TIMEOUT = 2;
const REASON_OTHER = 99;

// Resolution codes
const RESOLUTION_NONE = 0;
const RESOLUTION_FULL_REFUND = 1;
const RESOLUTION_MERCHANT_WINS = 2;
```

### Account Interfaces

See [types.ts](../sdk/src/types.ts) for full TypeScript interfaces:
- `AgentAccount`
- `PolicyAccount`
- `MerchantAllowlistAccount`
- `MerchantEntry`
- `PaymentEscrowAccount`
- `DisputeAccount`
- `SetPolicyParams`
