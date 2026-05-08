import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { expect } from "chai";
import {
  getProgram,
  getProvider,
  deriveAgentPda,
  derivePolicyPda,
  derivePaymentPda,
  deriveEscrowTokenPda,
  createUsdcMint,
  createTokenAccount,
  mintTokens,
  expectError,
} from "./helpers";

describe("08 - Error Cases", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let agentPda: PublicKey;
  let policyPda: PublicKey;
  let usdcMint: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    // Use agent 1 (created in test 01, never used) for clean spending state
    [agentPda] = deriveAgentPda(owner, 1, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);

    usdcMint = await createUsdcMint(provider);
    userTokenAccount = await createTokenAccount(provider, usdcMint, owner);
    await mintTokens(provider, usdcMint, userTokenAccount, 100_000_000);

    await program.methods
      .setPolicy({
        maxPerCall: new anchor.BN(1_000_000),
        maxPerPeriod: new anchor.BN(2_000_000),
        periodSeconds: new anchor.BN(86400),
        disputeWindowSeconds: 60,
        allowlistEnabled: false,
        autoSettleEnabled: true,
      })
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        policyAccount: policyPda,
      })
      .rpc();
  });

  it("ExceedsPerCallLimit: rejects amount above max_per_call", async () => {
    const agent = await program.account.agentAccount.fetch(agentPda);
    const count = agent.paymentCount.toNumber();
    const merchant = Keypair.generate().publicKey;
    const [paymentPda] = derivePaymentPda(agentPda, count, program.programId);
    const [escrowTokenPda] = deriveEscrowTokenPda(
      paymentPda,
      program.programId
    );

    await expectError(
      program.methods
        .processX402Payment(
          new anchor.BN(2_000_000), // exceeds 1M per-call limit
          merchant,
          Array(32).fill(0)
        )
        .accountsPartial({
          owner,
          agentAccount: agentPda,
          policyAccount: policyPda,
          paymentEscrow: paymentPda,
          userTokenAccount,
          escrowTokenAccount: escrowTokenPda,
          usdcMint,
        })
        .rpc(),
      "ExceedsPerCallLimit"
    );
  });

  it("ExceedsPeriodLimit: rejects after period budget exhausted", async () => {
    const merchant = Keypair.generate().publicKey;

    // Process two 1M payments to exhaust the 2M period budget
    for (let i = 0; i < 2; i++) {
      const agent = await program.account.agentAccount.fetch(agentPda);
      const count = agent.paymentCount.toNumber();
      const [paymentPda] = derivePaymentPda(
        agentPda,
        count,
        program.programId
      );
      const [escrowTokenPda] = deriveEscrowTokenPda(
        paymentPda,
        program.programId
      );

      await program.methods
        .processX402Payment(
          new anchor.BN(1_000_000),
          merchant,
          Array(32).fill(0)
        )
        .accountsPartial({
          owner,
          agentAccount: agentPda,
          policyAccount: policyPda,
          paymentEscrow: paymentPda,
          userTokenAccount,
          escrowTokenAccount: escrowTokenPda,
          usdcMint,
        })
        .rpc();
    }

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.spentInPeriod.toNumber()).to.equal(2_000_000);

    // Third payment should fail — period budget exhausted
    const agent = await program.account.agentAccount.fetch(agentPda);
    const count = agent.paymentCount.toNumber();
    const [paymentPda] = derivePaymentPda(agentPda, count, program.programId);
    const [escrowTokenPda] = deriveEscrowTokenPda(
      paymentPda,
      program.programId
    );

    await expectError(
      program.methods
        .processX402Payment(
          new anchor.BN(1_000_000),
          merchant,
          Array(32).fill(0)
        )
        .accountsPartial({
          owner,
          agentAccount: agentPda,
          policyAccount: policyPda,
          paymentEscrow: paymentPda,
          userTokenAccount,
          escrowTokenAccount: escrowTokenPda,
          usdcMint,
        })
        .rpc(),
      "ExceedsPeriodLimit"
    );
  });

  it("InvalidDisputeWindow: rejects window above maximum (> 86400s)", async () => {
    const [agent0Pda] = deriveAgentPda(owner, 0, program.programId);
    const [policy0Pda] = derivePolicyPda(agent0Pda, program.programId);

    await expectError(
      program.methods
        .setPolicy({
          maxPerCall: new anchor.BN(10_000_000),
          maxPerPeriod: new anchor.BN(50_000_000),
          periodSeconds: new anchor.BN(86400),
          disputeWindowSeconds: 100_000,
          allowlistEnabled: false,
          autoSettleEnabled: true,
        })
        .accountsPartial({
          owner,
          agentAccount: agent0Pda,
          policyAccount: policy0Pda,
        })
        .rpc(),
      "InvalidDisputeWindow"
    );
  });
});
