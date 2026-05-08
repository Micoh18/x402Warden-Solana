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
