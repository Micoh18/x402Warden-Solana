# x402Warden

> The security smart account for AI agents paying x402 services on Solana.
> Set spending policies before payment. Get refunds when services fail.

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Devnet](https://img.shields.io/badge/devnet-deployed-blue)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Solana](https://img.shields.io/badge/solana-anchor%200.31-9945FF)]()
[![x402](https://img.shields.io/badge/x402-compatible-green)]()

[**Demo Video** (3 min)](#) · [**Live Demo** (devnet)](#) · [**Architecture**](docs/architecture.md) · [**Twitter**](#)

---

## TL;DR

When an AI agent pays an x402 service today, you lose money in two ways:

1. **A buggy or compromised agent drains your wallet** — there's no spending limit, no domain allowlist, no rate limiting.
2. **A failed service keeps your money** — once payment is sent, there's no refund mechanism if the service returns garbage or doesn't deliver.

**x402warden** solves both. It's a smart account on Solana where you define spending policies that gate every payment, and a **5-minute dispute window** that lets you recover funds when services fail.

Built on top of the [Solana SPL Token Program](https://spl.solana.com/token) for composability — we don't reinvent token transfers, we add the security layer on top.

---

## Why This Matters

The x402 protocol on Solana already moved **35M+ transactions and over $10M in volume** since launch. AI agents are paying for inference, datasets, MCP tools, and increasingly, agents are paying other agents. This is real, growing, and irreversible.

But every existing player solves the **merchant side**: how do I charge for my service? MCPay, Latinum, PayAI, Kora, Crossmint x402 — all serve the recipient.

**Nobody is building the buyer side.** When your agent has a budget, you have no enforcement primitive. When your agent gets ripped off, you have no recourse. You're trusting raw HTTP transactions with money flowing automatically.

Production deployments of agents are blocked on this gap. Companies that want to put autonomous agents in front of real money are building one-off security wrappers themselves, or they're not deploying at all.

**x402warden** is the missing piece: a **composable, on-chain, programmable security layer** for any agent paying x402 on Solana. Drop in our SDK, set policies once, and your agent is protected from both itself and from bad merchants.

---

## How It Works

### The 60-Second Mental Model

```
+-------------------------------------------------------------+
|                                                               |
|   YOU set policies once    ->    AGENT pays through us        |
|   (max/call, allowlist,          (every x402 payment is       |
|    dispute window)                filtered, then escrowed)    |
|                                                               |
|                  |                          |                 |
|                  v                          v                 |
|                                                               |
|         Bad payment blocked        Service fails ->           |
|         (over budget, etc.)        you open dispute ->        |
|                                    money comes back           |
|                                                               |
+-------------------------------------------------------------+
```

### The Full Flow

1. **Setup (once).** As an agent owner, you create an `AgentAccount` on-chain. You set policies: max USDC per call, max per period, dispute window length. You add merchants you trust to an allowlist.

2. **Runtime (every payment).** Your agent uses our SDK to make x402 requests. The SDK intercepts the HTTP 402 response, validates the payment against your on-chain policies, and only proceeds if all checks pass.

3. **Escrow window.** Approved payments don't go to the merchant immediately. They sit in a per-payment escrow PDA for 5 minutes (configurable). The merchant can see the payment is committed but can't withdraw yet.

4. **Settlement or dispute.** If 5 minutes pass and nobody disputes, anyone can call `settle_payment` to release funds to the merchant. If you (or the agent itself, programmatically) detect the service failed, you call `open_dispute` and funds are locked pending resolution.

5. **Resolution.** The merchant has 24 hours to accept the dispute (refund) or contest it. If they don't respond, funds auto-refund to you.

---

## Architecture

### System Diagram

```
+-------------------------------------------------------------+
|                       AGENT OWNER                             |
|              (you, the dev configuring policies)              |
+-----------------------------+-------------------------------+
                              | TX: setPolicy, addMerchant
                              v
+-------------------------------------------------------------+
|                       DASHBOARD                               |
|              (Next.js + Solana Wallet Adapter)                |
+-----------------------------+-------------------------------+
                              | TX
                              v
+-------------------------------------------------------------+
|              x402warden PROGRAM (Rust / Anchor)               |
|                                                               |
|   Pre-pay                 |       Post-pay                    |
|   ---------               |       --------                    |
|   - AgentAccount          |       - PaymentEscrow (per-pay)   |
|   - PolicyAccount         |       - DisputeAccount            |
|   - MerchantAllowlist     |       - Auto-refund logic         |
|                           |                                   |
+-----------------------------+-------------------------------+
                              | SPL Token Transfers
                              v
+-------------------------------------------------------------+
|              SPL Token Program (USDC)                         |
|              Standard token transfer primitive                |
+-------------------------------------------------------------+


-------- RUNTIME (every x402 payment by your agent) --------

+-----------+   HTTP 402   +------------------+
|   AGENT   |------------->|  x402 SERVICE    |
|  (Python  |              |  (MCP, API...)   |
|   /Node)  |<---payment---|                  |
+-----+-----+  requirements+------------------+
      |                            ^
      | Sign payment via SDK       | Forwarded
      v                            | payment
+----------------------------+     |
| x402warden SDK (TypeScript)|-----+
| - intercepts 402           |
| - validates policies       |
| - escrows funds            |
| - retries with payment     |
+----------------------------+
```

### What's On-Chain (5 PDA Account Types)

| Account | Seeds | Purpose |
|---|---|---|
| **`AgentAccount`** | `["agent", owner, agent_id]` | Owner reference, pause state, USDC token account, payment counter |
| **`PolicyAccount`** | `["policy", agent]` | Spending limits (per-call, per-period), allowlist toggle, dispute window, period tracking |
| **`MerchantAllowlistAccount`** | `["allowlist", agent, page_index]` | Paginated list of approved merchants with optional per-merchant overrides |
| **`PaymentEscrow`** | `["payment", agent, payment_id]` | Per-payment ephemeral account that holds USDC during dispute window |
| **`DisputeAccount`** | `["dispute", payment_escrow]` | Dispute state machine with merchant response deadline |

### What's Off-Chain

- **TypeScript SDK** — Drop into your agent code. Handles the full x402 dance + on-chain calls
- **Dashboard** — Configure policies, view payments, manage disputes, audit trail
- **Demo agent + server** — Reference implementation showing three demo scenarios

For full architecture details, instruction reference, and account schemas, see [docs/architecture.md](docs/architecture.md).

---

## Quick Start

### Prerequisites

- [Solana CLI](https://docs.solanalabs.com/cli/install) 1.18+
- [Anchor](https://www.anchor-lang.com/docs/installation) 0.31+ via avm
- Node 20+ and Yarn
- A Phantom or Solflare wallet on devnet

### Run Locally

```bash
# 1. Clone
git clone https://github.com/Micoh18/x402Warden-Solana.git
cd x402Warden-Solana

# 2. Install dependencies
yarn install

# 3. Build the Anchor program
anchor build

# 4. Deploy to localnet or devnet
anchor deploy                          # localnet (default)
anchor deploy --provider.cluster devnet  # devnet

# 5. Run the dashboard
cd dashboard
cp .env.example .env.local              # edit with your program ID
yarn dev                               # opens http://localhost:3000

# 6. Run the demo x402 server
cd demo/server && yarn dev             # x402 merchant on :3001

# 7. Run the demo Python agent
cd demo/agent && pip install -e . && python -m src.agent

# 8. Run tests
anchor test
```

### Use the SDK in Your Own Agent

```typescript
import { X402WardenClient } from "@x402warden/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const client = new X402WardenClient({
  connection: new Connection("https://api.devnet.solana.com"),
  wallet: myWalletAdapter,
});

// One-time setup
const tx1 = await client.createAgent(0, usdcTokenAccount, agentPda, policyPda);

await client.setPolicy(agentPda, {
  maxPerCall: new BN(5_000_000),       // 5 USDC
  maxPerPeriod: new BN(50_000_000),    // 50 USDC/day
  periodSeconds: new BN(86400),
  disputeWindowSeconds: 300,
  allowlistEnabled: true,
  autoSettleEnabled: true,
});

await client.addMerchant(agentPda, allowlistPda, trustedMerchant, 0, 0);

// Process an x402 payment
await client.processPayment(
  agentPda,
  new BN(5_000_000),
  merchantPubkey,
  requestHash,
  userTokenAccount,
  usdcMint
);

// Open dispute if the service failed
await client.openDispute(agentPda, escrowPda, 1, reasonUriBytes);
```

---

## Devnet Deployment

| Item | Value |
|---|---|
| **Program ID** | `9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A` |
| **Cluster** | `devnet` |
| **USDC mint (devnet)** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| **Live dashboard** | [x402warden.vercel.app](#) |

You can interact with the program directly using the IDL in [`target/idl/x402_warden.json`](target/idl/x402_warden.json) or via the TypeScript SDK.

---

## Project Structure

```
.
├── programs/x402warden/       # Rust program (Anchor 0.31)
│   └── src/
│       ├── lib.rs             # Entry point — 12 instructions
│       ├── state/             # Account structs (5 PDAs)
│       ├── instructions/      # Instruction handlers
│       ├── errors.rs          # 16 custom error codes
│       └── events.rs          # 10 on-chain events
├── sdk/                       # TypeScript SDK
│   └── src/
│       ├── client.ts          # X402WardenClient class
│       ├── pda.ts             # PDA derivation helpers
│       ├── types.ts           # Account & param types
│       ├── constants.ts       # Seeds, defaults, reason codes
│       ├── idl.ts             # Program IDL
│       └── index.ts           # Public re-exports
├── dashboard/                 # Next.js + shadcn/ui dashboard
├── demo/
│   ├── agent/                 # Python demo agent
│   │   └── src/
│   │       ├── agent.py       # X402Agent — 3 demo scenarios
│   │       ├── solana_helpers.py  # PDA derivation + instruction builders
│   │       └── x402_client.py # x402 protocol helpers
│   └── server/                # Express x402 demo merchant server
│       └── src/
│           ├── index.ts       # Server entry + health check
│           ├── routes/api.ts  # Paywalled endpoints (/research, /broken)
│           └── middleware/    # x402 paywall middleware
├── tests/                     # Anchor integration tests
├── scripts/                   # Deploy + utility scripts
├── docs/                      # Deep documentation
│   ├── architecture.md        # System deep-dive
│   ├── sdk.md                 # SDK reference
│   ├── policies.md            # Policy configuration guide
│   └── demo.md                # E2E demo guide
└── Anchor.toml                # Anchor config
```

---

## Differentiation

We're often asked: "isn't this just MCPay/Latinum?" Short answer: no, we're complementary.

| | MCPay / Latinum | Kora / PayAI | **x402warden** |
|---|---|---|---|
| **Side served** | Merchant | Settlement infra | **Buyer (agent owner)** |
| **Helps with charging** | Yes | Yes | No (not the goal) |
| **Spending limits** | No | No | **Yes** |
| **Merchant allowlist** | No | No | **Yes** |
| **Dispute / refund** | No | No | **Yes** |
| **Emergency pause** | No | No | **Yes** |
| **Composes with others** | n/a | n/a | **Yes** — pays *to* MCPay servers |

A correctly-built agent uses **all of these together**: x402-native servers (MCPay), gas abstraction (Kora), and security layer (x402warden).

---

## Built With

- **[Solana](https://solana.com)** — The chain
- **[Anchor](https://anchor-lang.com)** — Rust framework for Solana programs
- **[SPL Token](https://spl.solana.com/token)** — USDC token transfer primitive
- **[x402](https://x402.org)** — HTTP 402 payment protocol
- **[Next.js](https://nextjs.org)** + **[shadcn/ui](https://ui.shadcn.com)** — Dashboard
- **[Tailwind CSS](https://tailwindcss.com)** — Styling

---

## Roadmap

### v0.x (hackathon submission)
- [x] Core Rust program with 12 instructions — policy engine + dispute system
- [x] TypeScript SDK with full client + PDA helpers
- [x] Dashboard with agent lifecycle management
- [x] Demo x402 merchant server with paywalled endpoints
- [x] Devnet deployment

### v0.next (post-hackathon)
- [ ] Stake-based dispute juries (Kleros-light)
- [ ] Token-2022 support for confidential transfers
- [ ] Native Python SDK
- [ ] Mainnet deployment with audited release
- [ ] Integration guides for MCPay, Latinum, Kora

### v1.0 (vision)
- [ ] Multi-sig override for enterprise (large payments require human approval)
- [ ] Webhook integrations for ops alerts
- [ ] Per-category spending budgets
- [ ] Reputation graph for merchants (Solana Attestation Service)
- [ ] Cross-chain extension (EVM x402 with Solana settlement)

---

## Team

Built solo by [@Micoh18](https://github.com/Micoh18) from Santiago, Chile, for the dev3pack Global Hackathon Kickoff.

The core insight: every existing player on Solana x402 is solving for the merchant. Nobody was solving for the autonomous agent that needs to spend safely. So we built it.

---

## Contributing

This project is open-source under MIT license. Issues, PRs, and questions are welcome. Open an issue first for anything substantial so we can align before you put work in.

If you're integrating x402warden into your own agent or x402 service, reach out — we want to know who's using it.

---

## Security

**This is hackathon-grade software deployed only on devnet. Do not use with mainnet funds.**

A formal audit and bug bounty program is on the roadmap before any mainnet release. If you find a security issue, please open a private issue instead of a public one.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- The Coinbase x402 team for the HTTP 402 payment standard
- Solana Foundation for the SPL ecosystem
- The dev3pack and Superteam Chile community
- Built with assistance from [Claude Code](https://claude.ai/code)

---

<p align="center">
  <em>Cloudflare + Stripe Disputes for AI agents on Solana.</em><br/>
  <em>Made with coffee in Santiago, Chile.</em>
</p>
