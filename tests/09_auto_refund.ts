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
  deriveDisputePda,
  createUsdcMint,
  createTokenAccount,
  mintTokens,
  getTokenBalance,
  expectError,
} from "./helpers";

// LIMITATION: auto_refund_dispute requires clock.unix_timestamp to exceed
// the merchant_response_deadline (opened_at + 86400s). The local test
// validator does not support clock warping, so we cannot advance time
// programmatically. The test below documents the expected flow and
// verifies that auto_refund correctly rejects when the deadline has not
// been reached. A full positive-path test would require either:
//   1. A test framework with clock warp (e.g. BanksClient / LiteSVM)
//   2. Waiting 86400 real seconds (not practical)

describe("09 - Auto Refund Dispute", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;
  const merchantKeypair = Keypair.generate();

  let agentPda: PublicKey;
  let policyPda: PublicKey;
  let usdcMint: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    [agentPda] = deriveAgentPda(owner, 0, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);

    usdcMint = await createUsdcMint(provider);
    userTokenAccount = await createTokenAccount(provider, usdcMint, owner);
    await mintTokens(provider, usdcMint, userTokenAccount, 100_000_000);

    await program.methods
      .setPolicy({
        maxPerCall: new anchor.BN(10_000_000),
        maxPerPeriod: new anchor.BN(50_000_000),
        periodSeconds: new anchor.BN(86400),
        disputeWindowSeconds: 300,
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

  async function processAndDispute(): Promise<{
    paymentPda: PublicKey;
    escrowTokenPda: PublicKey;
    disputePda: PublicKey;
  }> {
    const agent = await program.account.agentAccount.fetch(agentPda);
    const count = agent.paymentCount.toNumber();

    const [paymentPda] = derivePaymentPda(agentPda, count, program.programId);
    const [escrowTokenPda] = deriveEscrowTokenPda(
      paymentPda,
      program.programId
    );
    const [disputePda] = deriveDisputePda(paymentPda, program.programId);

    await program.methods
      .processX402Payment(
        new anchor.BN(5_000_000),
        merchantKeypair.publicKey,
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
        allowlistAccount: null,
      })
      .rpc();

    await program.methods
      .openDispute(1, Array(64).fill(0))
      .accountsPartial({
        opener: owner,
        agentAccount: agentPda,
        paymentEscrow: paymentPda,
        disputeAccount: disputePda,
        owner,
      })
      .rpc();

    return { paymentPda, escrowTokenPda, disputePda };
  }

  it("rejects auto_refund before merchant_response_deadline", async () => {
    const { paymentPda, escrowTokenPda, disputePda } =
      await processAndDispute();

    await expectError(
      program.methods
        .autoRefundDispute()
        .accountsPartial({
          caller: owner,
          paymentEscrow: paymentPda,
          disputeAccount: disputePda,
          escrowTokenAccount: escrowTokenPda,
          ownerTokenAccount: userTokenAccount,
          agentAccount: agentPda,
        })
        .rpc(),
      "DeadlineNotReached"
    );
  });

  // Positive-path test: requires clock warp (not available on local validator)
  //
  // it("auto-refunds after merchant_response_deadline passes", async () => {
  //   const { paymentPda, escrowTokenPda, disputePda } =
  //     await processAndDispute();
  //
  //   // Would need: await warpClock(86401);
  //
  //   const balanceBefore = await getTokenBalance(provider, userTokenAccount);
  //
  //   await program.methods
  //     .autoRefundDispute()
  //     .accountsPartial({
  //       caller: owner,
  //       paymentEscrow: paymentPda,
  //       disputeAccount: disputePda,
  //       escrowTokenAccount: escrowTokenPda,
  //       ownerTokenAccount: userTokenAccount,
  //       agentAccount: agentPda,
  //     })
  //     .rpc();
  //
  //   const balanceAfter = await getTokenBalance(provider, userTokenAccount);
  //   expect(balanceAfter).to.equal(balanceBefore + 5_000_000);
  //
  //   const escrow = await program.account.paymentEscrow.fetch(paymentPda);
  //   expect(Object.keys(escrow.state)[0]).to.equal("refunded");
  //
  //   const dispute = await program.account.disputeAccount.fetch(disputePda);
  //   expect(Object.keys(dispute.state)[0]).to.equal("autoRefunded");
  //   expect(dispute.resolution).to.equal(1);
  // });
});
