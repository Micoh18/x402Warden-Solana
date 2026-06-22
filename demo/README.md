# x402warden Demo

End-to-end demo of x402warden: a merchant server (Node/Express) and a Python AI agent that demonstrates payment guardrails.

## Components

### `server/` — Demo Merchant Server

Express server that simulates an x402-compatible merchant with paywalled endpoints.

```bash
cd server
cp .env.example .env
yarn install
yarn dev          # http://localhost:3001
```

Endpoints:
- `GET /api/research` — returns valid research data (requires x402 payment)
- `GET /api/enterprise-report` — expensive endpoint for blocked-payment demos
- `GET /api/broken` — returns garbage data (triggers dispute flow)
- `GET /health` — health check

### `agent/` — Demo Python Agent

Python agent that runs three scenarios against x402warden:

1. **Policy Blocks** — $100 request exceeds $5/call limit, unknown merchant blocked
2. **Happy Payment** — 402 → pay via x402warden → retry → receive data
3. **Dispute Flow** — pay → detect garbage response → open on-chain dispute

```bash
cd agent
pip install -e .
python -m src.agent
```

The agent auto-detects whether the validator and server are running and falls back to simulation mode if they're not.

## Running Both Together

```bash
# Terminal 1: start the merchant server
cd server && yarn install && yarn dev

# Terminal 2: run the agent
cd agent && pip install -e . && python -m src.agent
```

For the full E2E guide including the validator and dashboard, see [docs/demo.md](../docs/demo.md).
