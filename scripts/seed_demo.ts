import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Wallet, BN } from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { X402WardenClient } from "../sdk/src/client";
import {
  findAgentAccountPda,
  findPolicyAccountPda,
  findAllowlistAccountPda,
} from "../sdk/src/pda";

const RPC_URL = process.env.RPC_URL || "http://localhost:8899";

const DEMO_MERCHANT = Keypair.generate();

async function main() {
  console.log("============================================");
  console.log("  x402warden — Seed Demo Data");
  console.log("============================================\n");

  const connection = new Connection(RPC_URL, "confirmed");

  // -- Generate or load keypair --
  const owner = Keypair.generate();
  const wallet = new Wallet(owner);

  console.log(`  Owner:    ${owner.publicKey.toBase58()}`);
  console.log(`  Merchant: ${DEMO_MERCHANT.publicKey.toBase58()}`);
  console.log(`  RPC:      ${RPC_URL}\n`);

  // -- Airdrop SOL --
  console.log("[1/6] Airdropping SOL...");
  const airdropSig = await connection.requestAirdrop(
    owner.publicKey,
    10 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSig);
  console.log("  Done.\n");

  // -- Create mock USDC mint --
  console.log("[2/6] Creating mock USDC mint...");
  const usdcMint = await createMint(
    connection,
    owner,
    owner.publicKey,
    null,
    6
  );
  console.log(`  USDC Mint: ${usdcMint.toBase58()}\n`);

  // -- Create token accounts and mint USDC --
  console.log("[3/6] Setting up token accounts...");
  const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    owner,
    usdcMint,
    owner.publicKey
  );

  await mintTo(
    connection,
    owner,
    usdcMint,
    ownerTokenAccount.address,
    owner,
    1000_000_000 // 1000 USDC
  );
  console.log(`  Owner token account: ${ownerTokenAccount.address.toBase58()}`);
  console.log("  Minted 1000 USDC to owner.\n");

  // -- Initialize x402warden client --
  const client = new X402WardenClient({
    connection,
    wallet,
  });

  // -- Create agent --
  console.log("[4/6] Creating agent...");
  const agentId = 0;
  const [agentPda] = findAgentAccountPda(owner.publicKey, agentId);
  const [policyPda] = findPolicyAccountPda(agentPda);

  const txCreateAgent = await client.createAgent(
    agentId,
    ownerTokenAccount.address,
    agentPda,
    policyPda
  );
  console.log(`  Agent PDA:  ${agentPda.toBase58()}`);
  console.log(`  Policy PDA: ${policyPda.toBase58()}`);
  console.log(`  TX: ${txCreateAgent}\n`);

  // -- Set policy --
  console.log("[5/6] Configuring policy...");
  const txSetPolicy = await client.setPolicy(agentPda, {
    maxPerCall: new BN(10_000_000),       // 10 USDC max per call
    maxPerPeriod: new BN(100_000_000),    // 100 USDC per day
    periodSeconds: new BN(86400),          // 24-hour period
    disputeWindowSeconds: 300,             // 5-minute dispute window
    allowlistEnabled: true,
    autoSettleEnabled: true,
  });
  console.log("  Policy set:");
  console.log("    - Max per call:     10 USDC");
  console.log("    - Max per period:   100 USDC");
  console.log("    - Period:           24 hours");
  console.log("    - Dispute window:   5 minutes");
  console.log("    - Allowlist:        enabled");
  console.log(`  TX: ${txSetPolicy}\n`);

  // -- Add merchant to allowlist --
  console.log("[6/6] Adding merchant to allowlist...");
  const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);

  const txAddMerchant = await client.addMerchant(
    agentPda,
    allowlistPda,
    DEMO_MERCHANT.publicKey,
    0,                  // category: general
    new BN(0)           // no per-merchant override
  );
  console.log(`  Merchant:      ${DEMO_MERCHANT.publicKey.toBase58()}`);
  console.log(`  Allowlist PDA: ${allowlistPda.toBase58()}`);
  console.log(`  TX: ${txAddMerchant}\n`);

  // -- Summary --
  console.log("============================================");
  console.log("  Demo data seeded successfully!");
  console.log("============================================\n");
  console.log("  Accounts created:");
  console.log(`    Owner keypair:   (generated — save if needed)`);
  console.log(`    Agent PDA:       ${agentPda.toBase58()}`);
  console.log(`    Policy PDA:      ${policyPda.toBase58()}`);
  console.log(`    Allowlist PDA:   ${allowlistPda.toBase58()}`);
  console.log(`    USDC Mint:       ${usdcMint.toBase58()}`);
  console.log(`    Owner USDC:      ${ownerTokenAccount.address.toBase58()}`);
  console.log(`    Demo Merchant:   ${DEMO_MERCHANT.publicKey.toBase58()}`);
  console.log("");
  console.log("  You can now:");
  console.log("    - Run the demo server: yarn dev:server");
  console.log("    - Open the dashboard:  yarn dev:dashboard");
  console.log("    - Process a payment via the SDK");
  console.log("");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
