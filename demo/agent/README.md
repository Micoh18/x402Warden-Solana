# x402warden Demo Agent

Python AI agent that demonstrates x402warden payment guardrails across three scenarios:

1. **Policy Blocks** — agent tries to exceed spending limits, x402warden blocks it
2. **Happy Payment** — agent pays for a service, receives data, payment settles
3. **Dispute Flow** — service returns garbage, agent opens on-chain dispute

## Prerequisites

- Python 3.10+
- (Optional) Demo server running: `cd demo/server && npm run dev`
- (Optional) Solana validator with x402warden deployed for live mode

## Quick Start

```bash
cd demo/agent

# Install dependencies
pip install -e .

# Run the demo
python -m src.agent
```

The agent auto-detects what's available:
- **Validator reachable** → live on-chain transactions
- **Validator unavailable** → simulated on-chain (policy checks still run locally)
- **Demo server reachable** → real HTTP with x402 protocol
- **Demo server unavailable** → simulated HTTP responses

## Configuration

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `SOLANA_RPC_URL` | `http://localhost:8899` | Solana RPC endpoint |
| `DEMO_SERVER_URL` | `http://localhost:3001` | Demo merchant server |
| `PROGRAM_ID` | `111...111` | x402warden program address |

## Full Live Demo

```bash
# Terminal 1: Start validator with program deployed
anchor build && anchor deploy --provider.cluster localnet
solana-test-validator  # if not already running

# Terminal 2: Start demo server
cd demo/server && npm run dev

# Terminal 3: Run agent
cd demo/agent && python -m src.agent
```
