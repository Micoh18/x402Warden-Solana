#!/usr/bin/env bash
set -euo pipefail

# Start local Solana validator for x402warden development

echo "============================================"
echo "  x402warden — Local Development Setup"
echo "============================================"
echo ""

# Check prerequisites
command -v solana >/dev/null 2>&1 || { echo "ERROR: solana CLI not found. Install: https://docs.solanalabs.com/cli/install"; exit 1; }
command -v solana-test-validator >/dev/null 2>&1 || { echo "ERROR: solana-test-validator not found. It ships with Solana CLI."; exit 1; }

# Switch to localnet
echo "[1/3] Switching to localnet..."
solana config set --url localhost
echo ""

# Start validator
echo "[2/3] Starting local validator (with reset)..."
echo ""
echo "  The validator will start fresh each time."
echo "  Press Ctrl+C to stop."
echo ""

# Start with reset to get a clean slate
# Clone the SPL Token program (needed for USDC operations)
echo "[3/3] Launching solana-test-validator..."
echo ""

solana-test-validator \
  --reset \
  --quiet \
  --bind-address 0.0.0.0 \
  --rpc-port 8899 \
  --faucet-port 9900 &

VALIDATOR_PID=$!

# Wait for validator to be ready
echo "  Waiting for validator to start..."
for i in $(seq 1 30); do
  if solana cluster-version --url localhost >/dev/null 2>&1; then
    echo "  Validator is running (PID: $VALIDATOR_PID)"
    break
  fi
  sleep 1
done

echo ""

# Airdrop SOL to default wallet
echo "  Airdropping 100 SOL to default wallet..."
solana airdrop 100 --url localhost 2>/dev/null || true
echo ""

echo "============================================"
echo "  Local validator is running!"
echo "============================================"
echo ""
echo "  RPC URL:    http://localhost:8899"
echo "  Faucet:     http://localhost:9900"
echo "  Validator:  PID $VALIDATOR_PID"
echo ""
echo "  Next steps:"
echo "    1. In another terminal: anchor deploy"
echo "    2. Run tests: anchor test --skip-local-validator"
echo "    3. Start dashboard: yarn dev:dashboard"
echo ""
echo "  Press Ctrl+C to stop the validator."
echo ""

# Wait for the validator process
wait $VALIDATOR_PID
