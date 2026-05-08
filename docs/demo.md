# x402warden — End-to-End Demo Guide

Run the full x402warden demo: merchant server, Python agent, and dashboard.

---

## Overview

The demo shows three scenarios:

1. **Policy Blocks** — Agent tries to exceed spending limits and pay unknown merchants. x402warden blocks both.
2. **Happy Payment** — Agent receives a 402 response, pays through x402warden escrow, gets the data.
3. **Dispute Flow** — Agent pays, detects a garbage response, opens an on-chain dispute for a refund.

---

## Prerequisites

- Solana CLI 1.18+
- Anchor 0.31+ (via avm)
- Node 20+ and Yarn
- Python 3.10+
- (Optional) Phantom or Solflare wallet for the dashboard

---

## Step 1: Start a Local Validator + Deploy

```bash
# Terminal 1
anchor build
anchor deploy
```

This deploys the x402warden program to your local validator. Copy the program ID from the output.

Alternatively, use the helper script:

```bash
bash scripts/start_local.sh
```

---

## Step 2: Start the Demo Server

```bash
# Terminal 2
cd demo/server
cp .env.example .env
# Edit .env if needed (PORT, MERCHANT_ADDRESS, MOCK_MODE)
yarn install
yarn dev
```

The merchant server starts on `http://localhost:3001` with two paywalled endpoints:
- `GET /api/research` — returns valid data (happy path)
- `GET /api/broken` — returns garbage data (dispute path)

---

## Step 3: Run the Python Agent

```bash
# Terminal 3
cd demo/agent
pip install -e .
python -m src.agent
```

The agent auto-detects what's running:
- **Validator reachable** → live on-chain transactions
- **Validator unavailable** → simulated on-chain (policy checks still run locally)
- **Demo server reachable** → real HTTP 402 flow
- **Demo server unavailable** → simulated HTTP responses

### Agent Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SOLANA_RPC_URL` | `http://localhost:8899` | Solana RPC endpoint |
| `DEMO_SERVER_URL` | `http://localhost:3001` | Demo merchant server |
| `PROGRAM_ID` | `111...111` | x402warden program address |

---

## Step 4: Start the Dashboard

```bash
# Terminal 4
cd dashboard
cp .env.example .env.local
# Set NEXT_PUBLIC_PROGRAM_ID to your deployed program ID
yarn install
yarn dev
```

Open `http://localhost:3000`, connect your wallet, and explore:
- Create an agent
- Set spending policies
- View payment history and escrow states
- Open/resolve disputes

---

## Running Everything Together

Quick copy-paste for four terminal windows:

```bash
# Terminal 1 — Validator + deploy
anchor build && anchor deploy

# Terminal 2 — Merchant server
cd demo/server && yarn install && yarn dev

# Terminal 3 — Python agent
cd demo/agent && pip install -e . && python -m src.agent

# Terminal 4 — Dashboard
cd dashboard && yarn install && yarn dev
```

---

## Using Devnet Instead of Localnet

To run against devnet instead of a local validator:

1. Set `SOLANA_RPC_URL=https://api.devnet.solana.com` for the agent
2. Set `NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com` in `dashboard/.env.local`
3. Deploy with `anchor deploy --provider.cluster devnet`
4. Ensure your wallet has devnet SOL (`solana airdrop 2`) and devnet USDC

---

## Troubleshooting

**Agent says "Validator unavailable"**
- Make sure `solana-test-validator` or `anchor localnet` is running
- Check that `SOLANA_RPC_URL` points to the right endpoint

**Server returns 500 on payment endpoints**
- Check `MERCHANT_ADDRESS` in `demo/server/.env` is a valid Solana address
- Set `MOCK_MODE=true` for local testing without a real wallet

**Dashboard can't connect**
- Install a browser wallet extension (Phantom or Solflare)
- Switch the wallet to devnet/localnet as appropriate
- Check `NEXT_PUBLIC_PROGRAM_ID` matches your deployed program
