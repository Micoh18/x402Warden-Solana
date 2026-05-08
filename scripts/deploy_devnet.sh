#!/usr/bin/env bash
set -euo pipefail

# Deploy x402warden to Solana devnet

echo "============================================"
echo "  x402warden — Deploy to Devnet"
echo "============================================"
echo ""

# Check prerequisites
command -v solana >/dev/null 2>&1 || { echo "ERROR: solana CLI not found. Install: https://docs.solanalabs.com/cli/install"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "ERROR: anchor not found. Install: https://www.anchor-lang.com/docs/installation"; exit 1; }

# Switch to devnet
echo "[1/5] Switching to devnet..."
solana config set --url devnet
echo ""

# Check wallet balance
BALANCE=$(solana balance --url devnet 2>/dev/null | awk '{print $1}')
echo "[2/5] Wallet balance: ${BALANCE} SOL"
if (( $(echo "$BALANCE < 2" | bc -l 2>/dev/null || echo 1) )); then
  echo "       Low balance. Requesting airdrop..."
  solana airdrop 2 --url devnet || echo "       Airdrop failed — you may need to use https://faucet.solana.com"
fi
echo ""

# Build
echo "[3/5] Building program..."
anchor build
echo ""

# Get program ID from keypair
PROGRAM_KEYPAIR="target/deploy/x402_warden-keypair.json"
if [ -f "$PROGRAM_KEYPAIR" ]; then
  PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
  echo "[4/5] Program ID: $PROGRAM_ID"
else
  echo "[4/5] WARNING: No keypair found at $PROGRAM_KEYPAIR"
  echo "       Run 'anchor build' first to generate the keypair."
  exit 1
fi
echo ""

# Deploy
echo "[5/5] Deploying to devnet..."
anchor deploy --provider.cluster devnet
echo ""

echo "============================================"
echo "  Deployment complete!"
echo "============================================"
echo ""
echo "  Program ID: $PROGRAM_ID"
echo "  Cluster:    devnet"
echo "  IDL:        target/idl/x402_warden.json"
echo ""
echo "  Next steps:"
echo "    1. Update Anchor.toml with the program ID above"
echo "    2. Update sdk/src/constants.ts PROGRAM_ID"
echo "    3. Run 'anchor test --provider.cluster devnet' to verify"
echo ""
