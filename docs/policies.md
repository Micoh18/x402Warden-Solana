# x402warden — Policy Configuration Guide

Policies are the core of x402warden's security model. They define what your agent is allowed to spend, who it can pay, and how long you have to dispute a payment.

---

## PolicyAccount Fields

When you call `set_policy`, you configure these parameters:

### `maxPerCall` (u64, USDC lamports)

The maximum amount a single payment can be. Any payment exceeding this amount is rejected immediately with `ExceedsPerCallLimit`.

- **Unit:** USDC lamports (1 USDC = 1,000,000 lamports)
- **Example:** `5_000_000` = max 5 USDC per call
- **Recommended range:** 1-50 USDC for most API services

### `maxPerPeriod` (u64, USDC lamports)

The total budget for the agent across one period. When `spent_in_period + amount` exceeds this, the payment is rejected with `ExceedsPeriodLimit`.

The period counter auto-resets when `current_time - period_start > period_seconds`.

- **Example:** `50_000_000` = max 50 USDC per period
- **Tip:** Set this to your worst-case acceptable daily/weekly spend

### `periodSeconds` (u64, seconds)

How long each spending period lasts. When a period expires, `spent_in_period` resets to 0.

- **Default:** `86400` (24 hours)
- **Common values:**
  - `3600` = 1 hour (high-frequency agents)
  - `86400` = 1 day (most use cases)
  - `604800` = 1 week (low-frequency agents)

### `disputeWindowSeconds` (u32, seconds)

How long USDC stays in escrow before it can be released to the merchant. During this window, you can call `open_dispute` to recover funds.

- **Default:** `300` (5 minutes)
- **Min:** `60` (1 minute)
- **Max:** `86400` (24 hours)
- **See:** [Choosing the right dispute window](#choosing-the-right-dispute-window) below

### `allowlistEnabled` (bool)

When `true`, only merchants present in the `MerchantAllowlistAccount` can receive payments. Unknown merchants are rejected with `MerchantNotInAllowlist`.

When `false`, any merchant address is accepted (only spending limits apply).

- **Recommended:** `true` for production agents
- **When to use `false`:** Development/testing, or agents that need to pay arbitrary services

### `autoSettleEnabled` (bool)

When `true`, anyone can call `settle_payment` after the dispute window expires to release funds to the merchant. This is the normal flow.

When `false`, settlement requires explicit action (not currently enforced differently — reserved for future multi-sig flows).

---

## Example Configurations

### Conservative (production agent, known services)

```typescript
await client.setPolicy(agentPda, {
  maxPerCall: new BN(2_000_000),       // 2 USDC max per call
  maxPerPeriod: new BN(20_000_000),    // 20 USDC per day
  periodSeconds: new BN(86400),         // 24-hour periods
  disputeWindowSeconds: 600,            // 10-minute dispute window
  allowlistEnabled: true,               // only approved merchants
  autoSettleEnabled: true,
});
```

Best for: production agents paying known API services. Low risk tolerance.

### Moderate (development / testing)

```typescript
await client.setPolicy(agentPda, {
  maxPerCall: new BN(10_000_000),      // 10 USDC max per call
  maxPerPeriod: new BN(100_000_000),   // 100 USDC per day
  periodSeconds: new BN(86400),
  disputeWindowSeconds: 300,            // 5-minute default
  allowlistEnabled: true,
  autoSettleEnabled: true,
});
```

Best for: active development with devnet USDC. Moderate limits to catch bugs.

### Permissive (exploration agent)

```typescript
await client.setPolicy(agentPda, {
  maxPerCall: new BN(50_000_000),      // 50 USDC max per call
  maxPerPeriod: new BN(500_000_000),   // 500 USDC per day
  periodSeconds: new BN(86400),
  disputeWindowSeconds: 300,
  allowlistEnabled: false,              // any merchant accepted
  autoSettleEnabled: true,
});
```

Best for: research agents that need to discover and pay new services. **Use with caution** — the allowlist is your strongest protection.

### High-value services (data feeds, inference)

```typescript
await client.setPolicy(agentPda, {
  maxPerCall: new BN(100_000_000),     // 100 USDC max per call
  maxPerPeriod: new BN(1_000_000_000), // 1000 USDC per day
  periodSeconds: new BN(3600),          // 1-hour periods (tighter window)
  disputeWindowSeconds: 1800,           // 30-minute dispute window
  allowlistEnabled: true,
  autoSettleEnabled: true,
});
```

Best for: agents consuming expensive services (large inference, premium data). Shorter period means tighter control. Longer dispute window for services that take time to validate.

---

## Choosing the Right Dispute Window

The dispute window is the time between payment and settlement. Choose based on how quickly you can validate the service response:

| Service Type | Validation Time | Recommended Window |
|---|---|---|
| Simple API calls (JSON response) | Immediate | 60-120 seconds |
| AI inference (text generation) | Seconds | 300 seconds (5 min) |
| Data delivery (reports, datasets) | Minutes | 600-1800 seconds |
| Async jobs (processing pipelines) | Minutes to hours | 3600-86400 seconds |

### Tradeoffs

**Shorter window (60-300s):**
- Merchants get paid faster (better for them)
- Less time to detect problems
- Good for well-known, reliable services

**Longer window (600-86400s):**
- More time to validate response quality
- Merchants wait longer for payment
- Some merchants may refuse long windows
- Good for expensive or complex services

### Rule of thumb

Set the dispute window to **2x the expected time it takes your agent to validate the service response**. If your agent can check a response in 30 seconds, a 60-second window is fine. If validation requires running the response through a quality check, use 5-10 minutes.

---

## Merchant Allowlist

### When to use it

Enable the allowlist when:
- Your agent is in production with real funds
- You know which services the agent will pay
- You want protection against prompt injection redirecting payments

Disable the allowlist when:
- You're developing/testing with devnet USDC
- Your agent needs to discover and pay new services dynamically

### Adding merchants

```typescript
import { findAllowlistAccountPda } from "@x402warden/sdk";

const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);  // page 0

await client.addMerchant(
  agentPda,
  allowlistPda,
  new PublicKey("MerchantWalletAddressHere"),
  0,              // category (free-form, 0-255)
  0               // per-merchant max override (0 = use policy default)
);
```

### Per-merchant overrides

Each merchant entry has an optional `max_per_call_override`. When set to a non-zero value, it overrides the policy's `max_per_call` for that specific merchant.

```typescript
// Allow this premium merchant up to 100 USDC per call,
// even though the global policy is 5 USDC
await client.addMerchant(
  agentPda,
  allowlistPda,
  premiumMerchant,
  1,                              // category = 1 (e.g., "inference")
  new BN(100_000_000)             // 100 USDC override
);
```

### Categories

The `category` field (0-255) is free-form. Use it to organize merchants by service type:

| Category | Suggested Use |
|---|---|
| 0 | General / uncategorized |
| 1 | AI inference |
| 2 | Data / research |
| 3 | MCP tools |
| 4 | Agent-to-agent payments |
| 5-254 | Custom |
| 255 | Reserved |

Categories are informational in the current version. Future versions may support per-category spending limits.

### Pagination

Each allowlist page holds up to 32 merchants. If you need more, create additional pages:

```typescript
const [page0] = findAllowlistAccountPda(agentPda, 0);
const [page1] = findAllowlistAccountPda(agentPda, 1);

// Add to page 0
await client.addMerchant(agentPda, page0, merchant1, 0, 0);

// When page 0 is full (32 merchants), use page 1
await client.addMerchant(agentPda, page1, merchant33, 0, 0);
```

For most use cases, a single page (32 merchants) is more than sufficient.
