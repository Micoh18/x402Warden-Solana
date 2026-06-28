# x402warden MCP Server

MCP server that lets Claude, Cursor, and any MCP-compatible client pay for x402 services on Solana — with on-chain spending limits, escrow, and dispute protection.

## Quick Start

```
npx x402warden-mcp
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402warden": {
      "command": "npx",
      "args": ["-y", "x402warden-mcp"],
      "env": {
        "SOLANA_KEYPAIR_PATH": "~/.config/solana/id.json",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "x402warden": {
      "command": "npx",
      "args": ["-y", "x402warden-mcp"],
      "env": {
        "SOLANA_KEYPAIR_PATH": "~/.config/solana/id.json"
      }
    }
  }
}
```

## Tools

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `x402_pay` | Pay an x402 service. Makes HTTP request, handles 402 payment automatically via Solana, and returns the response plus `PaymentReceiptV1`. | `url` |
| `x402_receipt` | Fetch a `PaymentReceiptV1` from an existing on-chain payment escrow. | `payment` |
| `x402_balance` | Check SOL and USDC balances of the configured wallet. | — |
| `x402_status` | Show the on-chain agent account and spending policy status. | — |
| `x402_explain_block` | Explain why a payment was blocked before escrow, with demo-friendly buyer-protection copy. | - |
| `x402_spend_report` | Summarize USDC protected, active escrow, recovered refunds, settled escrow, disputed lifetime, and optional signed blocked receipts for an agent. | - |
| `x402_merchant_score` | Build a merchant risk profile from on-chain `PaymentEscrow` states only. | `merchant` |
| `x402_init` | Create a new agent account on-chain with spending policies. | `agentId`, `usdcAccount` |
| `x402_set_policy` | Update spending limits for an agent. Amounts in USDC micro-units (1 USDC = 1000000). | `maxPerCall`, `maxPerPeriod` |
| `x402_settle` | Settle a payment after its dispute window expires and release escrowed USDC to the merchant. | `paymentId` |

### x402_pay

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | Target URL to request |
| `method` | string | HTTP method (default: GET) |
| `body` | string | Request body (JSON string) |
| `headers` | string | Request headers (JSON string) |
| `maxAmount` | number | Maximum USDC micro-units willing to pay |
| `autoDisputeOnFail` | boolean | Open an on-chain dispute if objective delivery checks fail after payment |
| `recordEvidenceOnChain` | boolean | Persist receipt and delivery evidence hashes in a `PaymentEvidenceAccount` |
| `requireEvidenceOnChain` | boolean | Return `protection_failed` if evidence persistence is requested but not recorded |
| `expectJson` | boolean | Require the paid response body to be valid JSON |
| `expectNonEmpty` | boolean | Require the paid response body to be non-empty |
| `timeoutMs` | number | Timeout for HTTP requests in milliseconds |
| `retries` | number | Additional retry attempts for transport failures/timeouts; HTTP error responses are not retried |

Successful payments include `receipt`, a `PaymentReceiptV1` built from the
on-chain `PaymentEscrow` account. HTTP response hashes and delivery decisions
are attached as caller-provided delivery evidence. If `autoDisputeOnFail` is
enabled, the dispute `reason_uri` stores the evidence hash in the existing
64-byte field.
If `recordEvidenceOnChain` is enabled, x402warden submits an additional
transaction after the paid retry to create a `PaymentEvidenceAccount` keyed by
the payment escrow. The account stores hashes and compact delivery codes, not
response bodies. Add `requireEvidenceOnChain` for strict production flows where
a failed evidence transaction should be surfaced as `protection_failed` while
preserving the payment transaction, receipt, delivery, and error details.

If `x402_pay` blocks before escrow because `maxAmount` is exceeded, the result
includes `blockedReceipt`, a wallet-signed `BlockedPaymentReceiptV1`.

### x402_receipt

| Param | Type | Description |
|-------|------|-------------|
| `payment` | string | Payment ID for the configured agent, or payment escrow public key |
| `escrow` | boolean | Treat `payment` as a payment escrow public key |
| `agentId` | number | Agent ID (default: 0) when `payment` is a payment ID |
| `paymentRequirementsHash` | string | Optional caller-provided payment requirements hash |
| `requestContextHash` | string | Optional caller-provided request context hash |
| `txSignature` | string | Optional transaction signature to attach |

The receipt's core fields are rebuilt from the on-chain `PaymentEscrow`
account. If the matching `PaymentEvidenceAccount` exists, `x402_receipt`
attaches its persisted hashes with `source: "on_chain_account"`. Otherwise,
HTTP-only hashes are included only when the caller provides them.

### x402_explain_block

| Param | Type | Description |
|-------|------|-------------|
| `endpoint` | string | Endpoint that was blocked |
| `merchant` | string | Merchant public key, if known |
| `amountRequested` | number | Requested payment amount in micro-USDC |
| `maxAllowed` | number | Allowed max payment amount in micro-USDC, if known |
| `reason` | string | Raw policy or client block reason |

### x402_spend_report

| Param | Type | Description |
|-------|------|-------------|
| `agentId` | number | Agent ID (default: 0) |
| `blockedReceipts` | array | Optional signed `BlockedPaymentReceiptV1` objects. Verified receipts are aggregated as signed off-chain blocked USDC. |
| `blockedAmount` | number | Optional local estimate in micro-USDC. Prefer `blockedReceipts`; local estimates are marked `local_estimate`. |

`usdcRecovered` is calculated from on-chain escrows with state `refunded`.
`usdcSettled` is calculated from on-chain escrows with state `settled`.
`usdcDisputedLifetime` is reported separately from
`agent.totalDisputedLifetime`.

### x402_merchant_score

| Param | Type | Description |
|-------|------|-------------|
| `merchant` | string | Merchant public key |
| `agentId` | number | Agent ID (default: 0) |
| `minimumSampleSize` | number | Minimum merchant payments before low/medium/high risk is assigned (default: 3) |

The score uses only on-chain `PaymentEscrow` accounts for the configured agent:
total volume, settled count, active disputed count, refunded count, dispute
rate, and refund rate. Small samples return `riskLevel: "unknown"`.

### x402_init

| Param | Type | Description |
|-------|------|-------------|
| `agentId` | number | Agent ID |
| `usdcAccount` | string | USDC token account public key (base58) |

### x402_set_policy

| Param | Type | Description |
|-------|------|-------------|
| `maxPerCall` | number | Max USDC per call (micro-USDC) |
| `maxPerPeriod` | number | Max USDC per period (micro-USDC) |
| `periodSeconds` | number | Policy period in seconds (default: 86400) |
| `disputeWindow` | number | Dispute window in seconds (default: 300) |
| `allowlistEnabled` | boolean | Enable merchant allowlist (default: false) |
| `autoSettleEnabled` | boolean | Enable auto-settle (default: true) |

### x402_settle

| Param | Type | Description |
|-------|------|-------------|
| `paymentId` | number | Payment ID to settle |
| `agentId` | number | Agent ID (default: 0) |

## Prerequisites

- **SOL** for transaction fees — get devnet SOL at [faucet.solana.com](https://faucet.solana.com)
- **USDC** for payments — get devnet USDC at [faucet.circle.com](https://faucet.circle.com)
- A Solana keypair file (default: `~/.config/solana/id.json`)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SOLANA_KEYPAIR_PATH` | Path to Solana keypair JSON file | `~/.config/solana/id.json` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `AGENT_ID` | Agent ID to use | `0` |
| `USDC_MINT` | USDC mint address | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet) |

## License

MIT
