# x402warden Production Readiness

This checklist separates what is currently verified in code from what still
requires localnet/devnet/manual validation before real funds.

## Current Verification Evidence

| Area | Evidence | Status |
|---|---|---|
| Anchor host compile | `cargo build` | Passing with existing Anchor/Solana cfg warnings |
| SDK/CLI/MCP/proxy/dashboard type builds | workspace `npm run build` commands | Passing locally |
| Delivery evidence helpers | `tests/10_delivery_evidence.ts` | Passing |
| Signed blocked receipts | `tests/11_blocked_payment_receipts.ts` | Passing |
| Proxy pre-payment block path | `tests/12_proxy_protection.ts` | Passing offline |
| Protection metrics | `tests/13_protection_metrics.ts` | Passing |
| Merchant risk profile | `tests/14_merchant_risk.ts` | Passing |
| Policy templates/simulator | `tests/15_policy_templates.ts` | Passing |
| Program source invariants | `tests/16_program_security_invariants.ts` | Passing offline |
| Payment receipts/evidence IDL | `tests/17_payment_receipt.ts`, `tests/18_payment_evidence.ts` | Passing offline |

Offline invariant tests check critical signer, token-account, state-transition,
and deadline constraints in the Anchor source. They are regression checks, not a
replacement for transaction-level tests.

## On-Chain Security Checklist

### Seeds and Authorities

- `AgentAccount` is derived from `["agent", owner, agent_id]`.
- `PolicyAccount` is derived from `["policy", agent_account]`.
- `PaymentEscrow` is derived from `["payment", agent_account, payment_count]`.
- `DisputeAccount` is derived from `["dispute", payment_escrow]`.
- `PaymentEvidenceAccount` is derived from
  `["payment_evidence", payment_escrow]`.
- `escrow_token_account` is derived from `["escrow_token", payment_escrow]` and
  has `payment_escrow` as token authority.
- Settlement and refund transfers use PDA signer seeds for `PaymentEscrow`.

### Signer Constraints

- Policy updates require the agent owner signer.
- Payment processing requires the owner signer and enforces `has_one = owner`.
- Merchant accept/contest requires the merchant signer.
- Payment evidence recording requires the agent owner signer and only stores
  hashes/codes for a payment escrow owned by that agent.
- Settlement is permissionless after the dispute window, but only for pending
  escrows and only to the merchant token account.
- Auto-refund is permissionless after the merchant response deadline, but only
  returns escrowed funds to the owner token account.

### SPL Token Constraints

- Payment source token account must be owned by the agent owner and match the
  configured USDC mint.
- Escrow token account must match `PaymentEscrow.escrow_token_account` and be
  owned by the `PaymentEscrow` PDA.
- Merchant settlement token account must be owned by `PaymentEscrow.merchant`
  and use the escrow token mint.
- Refund owner token account must be owned by `AgentAccount.owner` and use the
  escrow token mint.

### State Transitions

| From | Instruction | To | Guard |
|---|---|---|---|
| none | `process_x402_payment` | `pending` | policy checks and SPL transfer succeed |
| `pending` | `open_dispute` | `disputed` | inside dispute window and valid reason code |
| `pending` | `settle_payment` | `settled` | `clock >= settle_after` |
| `disputed` | `merchant_accept_dispute` | `refunded` | merchant signer and open dispute |
| `disputed` | `auto_refund_dispute` | `refunded` | response deadline passed |
| `disputed` | `merchant_contest_dispute` | disputed contest marker | response deadline not expired |

## Local Gates Before Devnet

Run these before any devnet test:

```bash
npm.cmd run build --workspace @x402warden/sdk
npm.cmd run build --workspace @x402warden/cli
npm.cmd run build --workspace x402warden-mcp
npm.cmd run build --workspace @x402warden/proxy
npm.cmd run build --workspace @x402warden/dashboard
npx.cmd ts-mocha -p ./tsconfig.json -t 100000 tests/10_delivery_evidence.ts tests/11_blocked_payment_receipts.ts tests/12_proxy_protection.ts tests/13_protection_metrics.ts tests/14_merchant_risk.ts tests/15_policy_templates.ts tests/16_program_security_invariants.ts tests/17_payment_receipt.ts tests/18_payment_evidence.ts
cargo build
```

Do not treat `cargo build` as a Solana BPF/deployment gate. It is only a host
compile check. `anchor build` or `cargo build-sbf` is still required before
deployment.

## Devnet Manual Gates

These require explicit approval because they sign and send transactions.

1. Initialize a devnet agent and policy.
2. Run a successful x402 CLI payment against a real x402 endpoint.
3. Confirm the CLI receipt matches the on-chain `PaymentEscrow` account:
   `paymentEscrow`, `paymentId`, `merchant`, `amount`, `x402RequestHash`, state,
   and token escrow account.
4. Run `x402_pay` through MCP against the same endpoint and compare receipt
   fields with CLI output.
5. Run proxy payment against a real x402 endpoint and decode the
   `x-x402warden-receipt` and `x-x402warden-delivery` headers.
6. Force an objective paid delivery failure with on-chain evidence recording
   enabled and confirm `PaymentEvidenceAccount.evidence_hash` plus
   `DisputeAccount.reason_uri` match the CLI/MCP/proxy evidence hash.
7. Exercise merchant accept refund and auto-refund positive paths.
8. Exercise settlement after the dispute window.
9. Compare CLI `spend-report`, MCP `x402_spend_report`, and dashboard metrics on
   the same agent.

## Mainnet Checklist

Do not move real funds until these are complete:

- Freeze the program ID and deployment artifact.
- Build with Solana SBF tooling and record artifact hashes.
- Use a dedicated deploy authority; do not use a personal hot wallet.
- Transfer upgrade authority to a multisig or explicitly make the program
  immutable after audit.
- Define an incident response process: pause agents, notify integrators, rotate
  keys, and publish known affected program IDs.
- Configure RPC providers with monitoring and fallback.
- Track escrow counts, disputed counts, refund counts, settlement failures, and
  proxy/MCP error rates.
- Use bounded HTTP retry settings for transient transport failures only; failed
  HTTP delivery responses must remain visible to delivery checks and disputes.
- Confirm all production wallets use SPL token accounts for the intended USDC
  mint and cluster.
- Run an external security review for PDA seeds, SPL transfers, authority
  checks, and state transitions.

## Known Limits

- Delivery evidence defaults to off-chain/caller-provided data. CLI, MCP, and
  proxy can opt in to `PaymentEvidenceAccount` creation for on-chain hash
  anchoring, but they still do not store response bodies on-chain. Strict mode
  (`--require-evidence-on-chain`, `requireEvidenceOnChain`, or
  `X402WARDEN_PROXY_REQUIRE_EVIDENCE_ON_CHAIN`) reports an explicit protection
  failure when the evidence transaction is required but not recorded.
- `USDC blocked` is only production-grade when backed by verified signed
  `BlockedPaymentReceiptV1` objects or a future on-chain block event.
- Merchant risk profiles are basic escrow-history summaries, not broad
  reputation scores.
- Positive settlement and auto-refund tests still need clock control or real
  waiting on a local validator/devnet.
