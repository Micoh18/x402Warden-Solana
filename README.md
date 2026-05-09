<p align="center">
  <img src="dashboard/public/logo.svg" width="80" height="80" alt="x402warden" />
</p>

<h1 align="center">x402warden</h1>

<p align="center">
  <strong>The security smart account for AI agents paying x402 services on Solana.</strong><br/>
  Set spending policies. Escrow every payment. Get refunds when services fail.
</p>

<p align="center">
  <a href="https://x402-warden-solana-dashboard.vercel.app"><img src="https://img.shields.io/badge/dashboard-live-56FFE8?style=flat-square" alt="Dashboard" /></a>
  <a href="https://explorer.solana.com/address/9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A?cluster=devnet"><img src="https://img.shields.io/badge/devnet-deployed-9945FF?style=flat-square" alt="Devnet" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/anchor-0.31-orange?style=flat-square" alt="Anchor" />
  <img src="https://img.shields.io/badge/x402-compatible-green?style=flat-square" alt="x402" />
</p>

<p align="center">
  <a href="https://x402-warden-solana-dashboard.vercel.app">Live Dashboard</a> · 
  <a href="docs/architecture.md">Architecture</a> · 
  <a href="#quick-start">Quick Start</a> · 
  <a href="#integrate-with-your-agent">Integration Guide</a>
</p>

---

## The Problem

When an AI agent pays an x402 service today, you lose money in two ways:

1. **A buggy agent drains your wallet** — no spending limits, no allowlist, no rate limiting
2. **A failed service keeps your money** — no refund mechanism if it returns garbage

Every existing player (MCPay, Latinum, Kora, Crossmint) solves the **merchant side**. Nobody protects the **buyer**.

## The Solution

**x402warden** is an on-chain smart account that sits between your agent and every payment:

```
Your Agent → x402warden (policy check + escrow) → Merchant Service
                  ↓
         Payment blocked? → Agent gets clear error
         Service failed?  → Open dispute → Get refund
```

- **Pre-pay**: per-call limits, period budgets, merchant allowlists
- **Post-pay**: 5-minute escrow window, dispute resolution, auto-refund

---

## Verified on Devnet

The full flow has been tested end-to-end on Solana devnet with real USDC:

```bash
$ x402warden balance
{"sol":"4.38","usdc":"20","usdcAccount":"3A1yf1X6tjqk52h2ZMdxG1ybAQvqZsLAKCi2MkQajooD"}

$ x402warden init --agent-id 0 --usdc-account 3A1yf1X6...
{"status":"ok","txSignature":"5hTDW2N1zsb...","agentPda":"2Afgp3eWPN..."}

$ x402warden policy --max-per-call 5000000 --max-per-period 50000000
{"status":"ok","txSignature":"3Cx12vQNay6..."}

$ x402warden pay http://localhost:3001/api/research
{"status":"paid","txSignature":"5y3nmKt3HME...","amountPaid":5000000,"body":{"report":"Solana DeFi Market Analysis"}}
```

| Detail | Value |
|---|---|
| **Program ID** | [`9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A`](https://explorer.solana.com/address/9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A?cluster=devnet) |
| **Cluster** | Solana Devnet |
| **USDC Mint** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **Dashboard** | [x402-warden-solana-dashboard.vercel.app](https://x402-warden-solana-dashboard.vercel.app) |

---

## Quick Start

### Prerequisites

- [Solana CLI](https://docs.solanalabs.com/cli/install) 1.18+ &nbsp;·&nbsp; [Anchor](https://www.anchor-lang.com/docs/installation) 0.31+ &nbsp;·&nbsp; Node 20+ &nbsp;·&nbsp; Phantom or Solflare wallet on devnet

### Install & Run

```bash
git clone https://github.com/Micoh18/x402Warden-Solana.git
cd x402Warden-Solana

npm install --legacy-peer-deps    # install all workspaces
anchor build                       # build the Solana program
anchor deploy --provider.cluster devnet

# Dashboard
cd dashboard && cp .env.example .env.local && npm run dev

# Demo x402 server
cd demo/server && npm run dev      # merchant on :3001

# Tests
anchor test
```

---

## Integrate with Your Agent

x402warden works with **any AI agent, any language, any framework**. Two paths:

### Path A — CLI (your agent calls a command)

```bash
# 1. Check your wallet
npx x402warden balance

# 2. Create an agent account on-chain
npx x402warden init --agent-id 0 --usdc-account <YOUR_USDC_TOKEN_ACCOUNT>

# 3. Set spending limits
npx x402warden policy \
  --max-per-call 5000000 \       # max 5 USDC per payment
  --max-per-period 50000000 \    # max 50 USDC per 24h
  --period-seconds 86400 \       # reset period = 24 hours
  --dispute-window 300           # 5-min dispute window

# 4. Pay any x402 service
npx x402warden pay https://api.example.com/research
```

**Use from any language:**

```python
# Python
import subprocess, json
result = subprocess.run(
    ["npx", "x402warden", "pay", "https://api.example.com/research"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(data["body"])  # The actual API response
```

```javascript
// Node.js
import { execSync } from "child_process";
const result = JSON.parse(
  execSync("npx x402warden pay https://api.example.com/research").toString()
);
console.log(result.body);
```

**Exit codes:** `0` success · `1` blocked by policy · `2` error

### Path B — HTTP Proxy (zero code changes)

```bash
# Start the proxy
npx x402warden-proxy --port 4020

# Your agent just uses it — payments happen transparently
curl -x http://localhost:4020 http://api.example.com/research
HTTP_PROXY=http://localhost:4020 python my_agent.py
```

```python
import httpx
client = httpx.Client(proxy="http://localhost:4020")
response = client.get("http://api.example.com/research")
print(response.json())  # x402warden handled the payment
```

### Configuration

Both CLI and Proxy read from environment variables:

| Variable | Default | Description |
|---|---|---|
| `SOLANA_KEYPAIR_PATH` | `~/.config/solana/id.json` | Path to Solana keypair |
| `SOLANA_RPC_URL` | Devnet | Solana RPC endpoint |
| `AGENT_ID` | `0` | Which agent account to use |
| `USDC_MINT` | Devnet USDC | USDC token mint address |

> **What is a USDC Token Account?** On Solana, tokens live in separate "token accounts" linked to your wallet. Get free devnet USDC at [faucet.circle.com](https://faucet.circle.com) — it creates the account automatically. The `balance` command shows its address.

---

## How It Works

```
1. Agent requests a service
2. Service returns HTTP 402 with price + merchant address
3. x402warden checks spending policy on-chain
4. If allowed → USDC moves to escrow (not directly to merchant)
5. Request retried with payment proof → service responds with data
6. 5-min dispute window → get refund if service failed
7. After window → funds released to merchant
```

---

## Architecture

```
AGENT OWNER (you)
      │ setPolicy, addMerchant
      ▼
┌─────────────────────────────────────────────┐
│           x402warden Program (Rust)          │
│                                              │
│  Pre-pay              │  Post-pay            │
│  ────────             │  ────────            │
│  AgentAccount         │  PaymentEscrow       │
│  PolicyAccount        │  DisputeAccount      │
│  MerchantAllowlist    │  Auto-refund         │
└──────────────────────┬──────────────────────┘
                       │ SPL Token transfers
                       ▼
              USDC on Solana Devnet
```

### On-Chain Accounts (5 PDAs)

| Account | Seeds | Purpose |
|---|---|---|
| `AgentAccount` | `["agent", owner, id]` | Owner, pause state, payment counter |
| `PolicyAccount` | `["policy", agent]` | Limits, period tracking, dispute window |
| `MerchantAllowlistAccount` | `["allowlist", agent, page]` | Approved merchants with overrides |
| `PaymentEscrow` | `["payment", agent, id]` | Holds USDC during dispute window |
| `DisputeAccount` | `["dispute", escrow]` | Dispute state + merchant deadline |

### Program Instructions (13)

`initialize_agent` · `set_policy` · `create_allowlist` · `add_merchant` · `remove_merchant` · `process_payment` · `settle_payment` · `open_dispute` · `merchant_accept` · `merchant_contest` · `auto_refund` · `pause` · `unpause`

For the full reference, see [docs/architecture.md](docs/architecture.md).

---

## Project Structure

```
x402Warden-Solana/
├── programs/x402warden/    # Anchor program (Rust) — 13 instructions, 5 accounts
├── sdk/                    # TypeScript SDK — client, PDA helpers, types
├── cli/                    # CLI tool — x402warden pay/init/policy/status/balance
├── proxy/                  # HTTP proxy — transparent x402 payment interception
├── dashboard/              # Next.js dashboard — agent management UI
├── demo/
│   ├── server/             # Express x402 merchant (paywalled endpoints)
│   └── agent/              # Python demo agent (3 scenarios)
├── tests/                  # Anchor integration tests (9 files)
├── docs/                   # Architecture, SDK, policies, demo guides
└── scripts/                # Deploy + utility scripts
```

---

## Differentiation

| | MCPay / Latinum | Kora / PayAI | **x402warden** |
|---|---|---|---|
| **Side** | Merchant | Settlement | **Buyer** |
| **Spending limits** | — | — | Per-call + per-period |
| **Merchant allowlist** | — | — | On-chain, paginated |
| **Dispute / refund** | — | — | 5-min escrow + auto-refund |
| **Emergency pause** | — | — | Instant kill switch |
| **Composes with others** | — | — | Pays *to* MCPay servers |

---

## Roadmap

**v0.x** &nbsp; Core program · SDK · CLI · Proxy · Dashboard · Devnet deploy · E2E verified

**v1.0** &nbsp; Mainnet audit · Stake-based dispute juries · Token-2022 · Python SDK · Multi-sig enterprise overrides · Webhook alerts · Merchant reputation graph

---

## Built With

[Solana](https://solana.com) · [Anchor](https://anchor-lang.com) · [x402](https://x402.org) · [Next.js](https://nextjs.org) · [shadcn/ui](https://ui.shadcn.com) · [Tailwind](https://tailwindcss.com)

## Team

Built by [@Micoh18](https://github.com/Micoh18) from Santiago, Chile for the dev3pack Global Hackathon.

## License

[MIT](LICENSE)

---

<p align="center">
  <img src="dashboard/public/logo.svg" width="32" height="32" alt="" /><br/>
  <em>Cloudflare + Stripe Disputes for AI agents on Solana.</em>
</p>
