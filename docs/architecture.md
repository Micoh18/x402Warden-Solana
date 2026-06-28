# x402warden — Architecture Deep Dive

This document covers the full technical architecture of x402warden, including the account model, instruction set, payment flows, and dispute resolution.

For deployment gates, security checklist, and mainnet controls, see
[Production Readiness](./production-readiness.md).

---

## System Diagram

```
+-------------------------------------------------------------+
|                          USER (Dev)                           |
|  - Owns wallet with USDC                                      |
|  - Configures policies via Dashboard                          |
+-----------------------------+-------------------------------+
                              |
                              | Setup phase (once)
                              v
+-------------------------------------------------------------+
|              DASHBOARD (Next.js + Solana Wallet Adapter)      |
|  - Create AgentAccount                                        |
|  - Configure policies (limits, allowlists)                    |
|  - View payment history                                       |
|  - Open / resolve disputes                                    |
+-----------------------------+-------------------------------+
                              |
                              | Signed Transactions
                              v
+-------------------------------------------------------------+
|              x402warden PROGRAM (Rust / Anchor 0.31)          |
|                                                               |
|   Instructions:                                               |
|   - initialize_agent_account                                  |
|   - set_policy                                                |
|   - add_merchant_to_allowlist                                 |
|   - remove_merchant_from_allowlist                            |
|   - process_x402_payment ----+                                |
|   - settle_payment           |                                |
|   - open_dispute             |                                |
|   - merchant_accept_dispute  |                                |
|   - merchant_contest_dispute |                                |
|   - auto_refund_dispute      |                                |
|   - pause_agent              |                                |
|   - unpause_agent            |                                |
|                              |                                |
|   Account types (PDAs):      |                                |
|   - AgentAccount             |                                |
|   - PolicyAccount            |                                |
|   - MerchantAllowlistAccount |                                |
|   - PaymentEscrow            |                                |
|   - DisputeAccount           |                                |
|   - PaymentEvidenceAccount   |                                |
+------------------------------+-------------------------------+
                               | SPL Token transfers
                               v
+-------------------------------------------------------------+
|              SPL Token Program (USDC)                         |
|              Standard token transfer primitive                |
+-------------------------------------------------------------+


-------------- RUNTIME (every x402 payment) ------------------

+-----------+    HTTP 402    +------------------+
|   AGENT   |--------------->|  x402 SERVICE    |
|  (Python/ |                |  (MCP server,    |
|   Node)   |<----payment----|   API, etc.)     |
+-----+-----+   requirements+------------------+
      |                              ^
      | Signs payment via SDK        | Forwarded
      v                              | USDC payment
+------------------------------+     |
|  x402warden SDK (TypeScript)  |-----+
|  - intercepts x402 flow       |
|  - calls program              |
|  - waits for confirmation     |
|  - forwards to merchant       |
+------------------------------+
```

---

## Account Model (6 PDA Types)

### 1. AgentAccount

Identifies a specific agent under an owner. One user can have N agents.

| Field | Type | Size | Description |
|---|---|---|---|
| `owner` | Pubkey | 32 | Wallet of the dev/owner |
| `agent_id` | u64 | 8 | Local ID (0, 1, 2...) |
| `usdc_token_account` | Pubkey | 32 | Token account to pull funds from |
| `policy_account` | Pubkey | 32 | PDA of the associated PolicyAccount |
| `total_spent_lifetime` | u64 | 8 | Cumulative USDC spent (analytics) |
| `total_disputed_lifetime` | u64 | 8 | Cumulative USDC disputed (analytics) |
| `payment_count` | u64 | 8 | Auto-incrementing payment counter |
| `created_at` | i64 | 8 | Unix timestamp |
| `paused` | bool | 1 | Emergency pause flag |
| `bump` | u8 | 1 | PDA bump seed |

**Seeds:** `["agent", owner.key(), agent_id.to_le_bytes()]`

### 2. PolicyAccount

The spending rules. One per agent.

| Field | Type | Size | Description |
|---|---|---|---|
| `agent` | Pubkey | 32 | Back-reference to AgentAccount |
| `max_per_call` | u64 | 8 | Max USDC per individual payment (lamports) |
| `max_per_day` | u64 | 8 | Max USDC per day |
| `max_per_period` | u64 | 8 | Max USDC per configurable period |
| `period_seconds` | u64 | 8 | Period length (default 86400 = 24h) |
| `period_start` | i64 | 8 | Start of current period |
| `spent_in_period` | u64 | 8 | Amount spent in current period |
| `allowlist_enabled` | bool | 1 | Whether allowlist is enforced |
| `allowlist_count` | u8 | 1 | Number of merchants in allowlist |
| `dispute_window_seconds` | u32 | 4 | How long escrow holds (default 300 = 5 min) |
| `auto_settle_enabled` | bool | 1 | Auto-release after window |
| `bump` | u8 | 1 | PDA bump seed |

**Seeds:** `["policy", agent_account.key()]`

### 3. MerchantAllowlistAccount

Paginated allowlist. Each page holds up to 32 merchant entries.

| Field | Type | Size | Description |
|---|---|---|---|
| `agent` | Pubkey | 32 | Back-reference to AgentAccount |
| `page_index` | u16 | 2 | Page number (0, 1, 2...) |
| `merchants` | Vec\<MerchantEntry\> | dynamic | Up to 32 entries per page |
| `bump` | u8 | 1 | PDA bump seed |

Each `MerchantEntry`:

| Field | Type | Size | Description |
|---|---|---|---|
| `merchant_pubkey` | Pubkey | 32 | Merchant's receiving wallet |
| `category` | u8 | 1 | Free-form category (0-255) |
| `max_per_call_override` | u64 | 8 | 0 = use policy default |

**Seeds:** `["allowlist", agent_account.key(), page_index.to_le_bytes()]`

### 4. PaymentEscrow

Per-payment ephemeral PDA. Created on payment, closed on settlement or refund.

| Field | Type | Size | Description |
|---|---|---|---|
| `agent` | Pubkey | 32 | Back-reference to AgentAccount |
| `payment_id` | u64 | 8 | Auto-incrementing ID |
| `merchant` | Pubkey | 32 | Recipient |
| `amount` | u64 | 8 | USDC amount in escrow |
| `escrow_token_account` | Pubkey | 32 | Token account holding escrowed USDC |
| `created_at` | i64 | 8 | Unix timestamp |
| `settle_after` | i64 | 8 | created_at + dispute_window_seconds |
| `state` | PaymentState | 1 | Pending / Disputed / Settled / Refunded |
| `x402_request_hash` | [u8; 32] | 32 | SHA-256 of x402 PaymentRequirements |
| `bump` | u8 | 1 | PDA bump seed |

**Seeds:** `["payment", agent_account.key(), payment_id.to_le_bytes()]`

Escrow token account seeds: `["escrow_token", payment_escrow.key()]`

### 5. DisputeAccount

Per-dispute state machine.

| Field | Type | Size | Description |
|---|---|---|---|
| `payment` | Pubkey | 32 | Back-reference to PaymentEscrow |
| `opener` | Pubkey | 32 | Who opened the dispute (owner) |
| `reason_code` | u8 | 1 | 0=NoResponse, 1=BadResponse, 2=Timeout, 99=Other |
| `reason_uri` | [u8; 64] | 64 | IPFS hash or URL for off-chain evidence |
| `opened_at` | i64 | 8 | Unix timestamp |
| `merchant_response_deadline` | i64 | 8 | opened_at + 24h |
| `state` | DisputeState | 1 | Open / MerchantAccepted / MerchantContested / AutoRefunded / Resolved |
| `resolution` | u8 | 1 | 0=None, 1=FullRefund, 2=MerchantWins |
| `bump` | u8 | 1 | PDA bump seed |

**Seeds:** `["dispute", payment_escrow.key()]`

### 6. PaymentEvidenceAccount

Optional per-payment evidence anchor. Created only when CLI or MCP callers opt
in to on-chain evidence recording after the paid retry.

| Field | Type | Size | Description |
|---|---|---|---|
| `payment` | Pubkey | 32 | Back-reference to PaymentEscrow |
| `recorder` | Pubkey | 32 | Owner wallet that recorded the evidence |
| `receipt_version` | u8 | 1 | Receipt/evidence version, currently 1 |
| `payment_requirements_hash` | [u8; 32] | 32 | Hash of x402 payment requirements observed by caller |
| `request_context_hash` | [u8; 32] | 32 | Hash of URL, method, body hash, and headers hash |
| `response_hash` | [u8; 32] | 32 | Hash of paid retry response body, or zero bytes |
| `evidence_hash` | [u8; 32] | 32 | Hash of DeliveryEvidenceV1 |
| `failure_code` | u8 | 1 | Compact delivery failure code; 0 means no failure |
| `status_code` | u16 | 2 | HTTP status code, or 0 when no response exists |
| `recorded_at` | i64 | 8 | Unix timestamp |
| `bump` | u8 | 1 | PDA bump seed |

**Seeds:** `["payment_evidence", payment_escrow.key()]`

---

## Instructions Reference

### Setup Instructions (called once per agent)

| # | Instruction | Signer | What it does |
|---|---|---|---|
| 1 | `initialize_agent_account` | Owner | Creates AgentAccount + PolicyAccount PDAs |
| 2 | `set_policy` | Owner | Updates policy params (limits, window, allowlist toggle) |
| 3 | `add_merchant_to_allowlist` | Owner | Adds merchant to allowlist page (creates page if needed) |
| 4 | `remove_merchant_from_allowlist` | Owner | Removes merchant from allowlist |

### Payment Instructions (called every x402 payment)

| # | Instruction | Signer | What it does |
|---|---|---|---|
| 5 | `process_x402_payment` | Owner | Validates policies, creates escrow PDA, transfers USDC to escrow |
| 6 | `record_payment_evidence` | Owner | Optionally records receipt and delivery hashes for a payment escrow |
| 7 | `settle_payment` | Anyone | Releases escrowed funds to merchant (after dispute window) |

### Dispute Instructions

| # | Instruction | Signer | What it does |
|---|---|---|---|
| 8 | `open_dispute` | Owner | Opens dispute before window expires, locks funds |
| 9 | `merchant_accept_dispute` | Merchant | Merchant accepts, funds refunded to owner |
| 10 | `merchant_contest_dispute` | Merchant | Merchant contests, dispute marked for resolution |
| 11 | `auto_refund_dispute` | Anyone | If merchant missed 24h deadline, auto-refund to owner |

### Admin Instructions

| # | Instruction | Signer | What it does |
|---|---|---|---|
| 12 | `pause_agent` | Owner | Pauses all payments for this agent |
| 13 | `unpause_agent` | Owner | Resumes payments |

---

## Payment Flow (Step by Step)

```
Agent receives HTTP 402 from x402 service
         |
         v
SDK intercepts, extracts payment requirements
         |
         v
SDK calls process_x402_payment on-chain
         |
         v
+-----------------------------------------------------+
| ON-CHAIN VALIDATION (process_x402_payment)           |
|                                                       |
| 1. Check agent is not paused                          |
| 2. Check amount <= policy.max_per_call                |
| 3. If period expired, reset period counter            |
| 4. Check spent_in_period + amount <= max_per_period   |
| 5. If allowlist_enabled:                              |
|    - Find merchant in allowlist pages                 |
|    - Check per-merchant override if set               |
| 6. Create PaymentEscrow PDA                           |
| 7. Create escrow token account                        |
| 8. Transfer USDC: user -> escrow                      |
| 9. Update spent_in_period, payment_count              |
| 10. Emit PaymentInitiated event                       |
+-----------------------------------------------------+
         |
         v
Escrow holds funds for dispute_window_seconds (default: 300s)
         |
         +------ No dispute ------> settle_payment
         |                          (funds -> merchant)
         |
         +------ Dispute opened --> open_dispute
                                    (funds locked)
                                         |
                   +---------------------+-------------------+
                   |                     |                   |
          merchant_accept      merchant_contest     auto_refund (24h)
          (refund to owner)    (marked contested)   (refund to owner)
```

---

## Payment Decision Model

x402warden should classify a payment in three stages:

```text
1. ShouldPay?
   Runs before funds move.
   Checks policy, amount, period budget, pause state, merchant allowlist,
   and any caller-provided max amount.

2. DidDeliver?
   Runs after the protected request is retried with payment proof.
   Checks whether the paid service objectively delivered a valid response.

3. ShouldSettle?
   Runs before escrow release.
   Uses payment state and delivery/dispute evidence to decide whether funds
   should settle, remain disputed, or be refunded.
```

`DidDeliver` is intentionally objective. Early versions should avoid subjective
"AI judged this answer bad" arbitration and instead rely on machine-checkable
failure signals:

| Check | Good delivery | Failed delivery |
|---|---|---|
| HTTP status | `2xx` | non-`2xx` |
| Timeout | response before deadline | request timeout |
| Body | non-empty | empty response |
| Format | valid expected format | invalid JSON / parse failure |
| Schema | required fields present | missing fields / schema mismatch |
| Service error | no explicit error | explicit error payload |
| Evidence | response hash can be recorded | no reliable response evidence |

A payment is therefore not considered fully good just because
`process_x402_payment` succeeded. It is good when it passes policy, enters
escrow, and the service passes `DidDeliver`. Failed `DidDeliver` results should
feed the dispute path and the PaymentReceipt.

Canonical `PaymentReceipt`, `PaymentDecision`, `DeliveryEvidence`, and
`ProtectionMetric` shapes are documented in
[`docs/protection-models.md`](./protection-models.md). Any UI, CLI, MCP, or
proxy claim should also name its evidence source: on-chain account, on-chain
event, signed off-chain record, caller-provided runtime data, local/dev-only
state, or unavailable.

---

## Dispute Flow (Step by Step)

```
1. Owner detects service failure (bad response, timeout, garbage data)
         |
         v
2. Owner calls open_dispute(reason_code, reason_uri)
   - Must be within dispute window (escrow.settle_after)
   - PaymentEscrow state: Pending -> Disputed
   - DisputeAccount created with 24h merchant deadline
   - Emits DisputeOpened event
         |
         v
3. Merchant has 24 hours to respond:
         |
         +--- merchant_accept_dispute
         |    - DisputeState: Open -> MerchantAccepted
         |    - USDC transferred from escrow -> owner
         |    - PaymentEscrow state -> Refunded
         |    - Emits DisputeResolved(FullRefund)
         |
         +--- merchant_contest_dispute
         |    - DisputeState: Open -> MerchantContested
         |    - Funds remain locked (future: jury resolution)
         |    - Must be within deadline
         |
         +--- No response (24h passes)
              - Anyone calls auto_refund_dispute
              - DisputeState: Open -> AutoRefunded
              - USDC transferred from escrow -> owner
              - PaymentEscrow state -> Refunded
              - Emits DisputeResolved(FullRefund)
```

---

## Error Codes Reference

| Code | Name | Message | When |
|---|---|---|---|
| 6000 | `AgentPaused` | Agent is paused | process_x402_payment on paused agent |
| 6001 | `ExceedsPerCallLimit` | Amount exceeds per-call limit | amount > policy.max_per_call |
| 6002 | `ExceedsPeriodLimit` | Amount exceeds period limit | spent_in_period + amount > max_per_period |
| 6003 | `ExceedsMerchantLimit` | Amount exceeds merchant-specific limit | amount > merchant override |
| 6004 | `MerchantNotInAllowlist` | Merchant not in allowlist | allowlist_enabled && merchant not found |
| 6005 | `InvalidPaymentState` | Invalid payment state for this action | Wrong state for settle/dispute |
| 6006 | `DisputeWindowOpen` | Dispute window still open | settle_payment called too early |
| 6007 | `DisputeWindowExpired` | Dispute window has expired | open_dispute called too late |
| 6008 | `Unauthorized` | Unauthorized action | Non-owner calling owner-only instruction |
| 6009 | `Overflow` | Arithmetic overflow | Numeric overflow in spending calculation |
| 6010 | `AllowlistPageFull` | Allowlist page is full | Page has 32 merchants already |
| 6011 | `MerchantNotFound` | Merchant not found in allowlist | remove_merchant for unknown merchant |
| 6012 | `DeadlineNotReached` | Merchant response deadline not reached | auto_refund called too early |
| 6013 | `DeadlineExpired` | Merchant response deadline expired | Merchant trying to respond after 24h |
| 6014 | `AgentNotPaused` | Agent is not paused | unpause_agent on already-unpaused agent |
| 6015 | `InvalidDisputeWindow` | Invalid dispute window duration | Window outside 60s-86400s range |

---

## On-Chain Events

| Event | Fields | Emitted by |
|---|---|---|
| `AgentCreated` | owner, agent, agent_id | initialize_agent_account |
| `PolicyUpdated` | agent, max_per_call, max_per_period, period_seconds, dispute_window_seconds | set_policy |
| `MerchantAdded` | agent, merchant, category | add_merchant_to_allowlist |
| `MerchantRemoved` | agent, merchant | remove_merchant_from_allowlist |
| `PaymentInitiated` | agent, payment, merchant, amount, settle_after | process_x402_payment |
| `PaymentSettled` | payment, merchant, amount | settle_payment |
| `DisputeOpened` | payment, dispute, reason_code | open_dispute |
| `DisputeResolved` | dispute, payment, resolution | merchant_accept, auto_refund |
| `AgentPausedEvent` | agent | pause_agent |
| `AgentUnpausedEvent` | agent | unpause_agent |

---

## State Machine Diagrams

### PaymentState

```
               process_x402_payment
                       |
                       v
                   [Pending]
                   /       \
        open_dispute       settle_payment
              |                  |
              v                  v
          [Disputed]        [Settled]
              |
     merchant_accept / auto_refund
              |
              v
          [Refunded]
```

### DisputeState

```
               open_dispute
                    |
                    v
                 [Open]
              /    |     \
  merchant_   merchant_   auto_refund
   accept     contest     (24h timeout)
      |          |              |
      v          v              v
[MerchantAccepted] [MerchantContested] [AutoRefunded]
```
