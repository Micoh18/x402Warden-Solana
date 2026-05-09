# Plan: CLI + HTTP Proxy for AI Agent Compatibility

## Overview

Two tools that let any AI agent (Claude MCP, LangChain, AutoGPT, custom scripts) use x402warden as a security layer without code changes:

1. **CLI** (`cli/`): Agent shells out to `x402warden pay <url>`, gets JSON back
2. **HTTP Proxy** (`proxy/`): Agent points HTTP client to `localhost:4020`, proxy handles 402 payments transparently

## x402 Flow (both tools implement this)

```
Agent request → target URL → 402 response with payment requirements
    → parse price + merchant → call processPayment via SDK (on-chain policy check + escrow)
    → retry request with X-PAYMENT header containing tx signature
    → return final response to agent
```

## CLI Commands

```bash
x402warden pay <url> [--method GET] [--body '{}'] [--headers '{}'] [--max-amount 10000000] [--agent-id 0]
x402warden init --agent-id 0 --usdc-account <pubkey>
x402warden policy --max-per-call 5000000 --max-per-period 50000000
x402warden status [--agent-id 0]
x402warden balance
```

## Proxy Usage

```bash
x402warden-proxy --port 4020
# Then: HTTP_PROXY=http://localhost:4020 python my_agent.py
# Or:   curl -x http://localhost:4020 http://api.example.com/data
# HTTPS via gateway: X-TARGET-URL header
```

## Config (shared, env vars)

```
SOLANA_KEYPAIR_PATH=~/.config/solana/id.json
SOLANA_RPC_URL=https://api.devnet.solana.com
AGENT_ID=0
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## File Structure

### CLI (`cli/`)
- `package.json` — `@x402warden/cli`, bin: `x402warden`
- `tsconfig.json`
- `src/index.ts` — commander entry point with shebang
- `src/config.ts` — wallet/RPC/agent-id loading
- `src/x402-flow.ts` — parse 402 response, build X-PAYMENT header, execute payment flow
- `src/output.ts` — JSON stdout helpers, exit codes (0=ok, 1=policy block, 2=error)
- `src/commands/pay.ts` — main command, full x402 flow
- `src/commands/init.ts` — createAgent via SDK
- `src/commands/policy.ts` — setPolicy via SDK
- `src/commands/status.ts` — getAgent + getPolicy display
- `src/commands/balance.ts` — SOL + USDC balance query

### Proxy (`proxy/`)
- `package.json` — `@x402warden/proxy`, bin: `x402warden-proxy`
- `tsconfig.json`
- `src/index.ts` — entry point, --port flag
- `src/server.ts` — http.createServer, request forwarding, 402 interception
- `src/interceptor.ts` — 402 detection + payment execution + retry logic
- `src/config.ts` — same pattern as CLI config
- `src/logger.ts` — structured payment logging to stderr

## Key Implementation Details

- Both use `@x402warden/sdk` (X402WardenClient, PDA helpers, types)
- Wallet loaded from JSON keypair file: `Keypair.fromSecretKey(Uint8Array.from(JSON.parse(file)))`
- Anchor Wallet: `new Wallet(keypair)` wraps the keypair for SDK
- processPayment needs: agentPda, amount (from 402), merchant pubkey (from 402 payTo), requestHash (SHA-256 of url+method), userTokenAccount (from on-chain agent data), usdcMint
- X-PAYMENT header format: `{"x402Version":1,"scheme":"exact","network":"solana-devnet","payload":{"signature":"TX_SIG"}}`
- Proxy must serialize payment transactions (mutex) to avoid paymentCount race conditions
- Exit codes: 0=success, 1=policy block, 2=error

## Dependencies
- CLI: commander, @x402warden/sdk, @coral-xyz/anchor, @solana/web3.js, @solana/spl-token, bn.js
- Proxy: @x402warden/sdk, @coral-xyz/anchor, @solana/web3.js, @solana/spl-token, bn.js (no http-proxy lib needed, use native http + fetch)
