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
| `x402_pay` | Pay an x402 service. Makes HTTP request, handles 402 payment automatically via Solana, returns the response. | `url` |
| `x402_balance` | Check SOL and USDC balances of the configured wallet. | — |
| `x402_status` | Show the on-chain agent account and spending policy status. | — |
| `x402_init` | Create a new agent account on-chain with spending policies. | `agentId`, `usdcAccount` |
| `x402_set_policy` | Update spending limits for an agent. Amounts in USDC micro-units (1 USDC = 1000000). | `maxPerCall`, `maxPerPeriod` |

### x402_pay

| Param | Type | Description |
|-------|------|-------------|
| `url` | string | Target URL to request |
| `method` | string | HTTP method (default: GET) |
| `body` | string | Request body (JSON string) |
| `headers` | string | Request headers (JSON string) |
| `maxAmount` | number | Maximum USDC micro-units willing to pay |

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
