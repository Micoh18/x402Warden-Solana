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
} from "./helpers";

describe("06 - Dispute Flow", () => {
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

  async function processPayment(): Promise<{
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

    return { paymentPda, escrowTokenPda, disputePda };
  }

  async function openDispute(
    paymentPda: PublicKey,
    disputePda: PublicKey
  ): Promise<void> {
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
  }

  // --- Open dispute and verify state ---

  let disputePaymentPda: PublicKey;
  let disputeEscrowPda: PublicKey;
  let disputePda: PublicKey;

  it("opens dispute on a pending payment", async () => {
    const result = await processPayment();
    disputePaymentPda = result.paymentPda;
    disputeEscrowPda = result.escrowTokenPda;
    disputePda = result.disputePda;

    await openDispute(disputePaymentPda, disputePda);
  });

  it("escrow state is Disputed after dispute opened", async () => {
    const escrow = await program.account.paymentEscrow.fetch(
      disputePaymentPda
    );
    expect(Object.keys(escrow.state)[0]).to.equal("disputed");
  });

  it("dispute state is Open with correct deadline", async () => {
    const dispute = await program.account.disputeAccount.fetch(disputePda);
    expect(Object.keys(dispute.state)[0]).to.equal("open");
    expect(dispute.payment.toBase58()).to.equal(disputePaymentPda.toBase58());
    expect(dispute.opener.toBase58()).to.equal(owner.toBase58());
    expect(dispute.reasonCode).to.equal(1);
    expect(dispute.merchantResponseDeadline.toNumber()).to.equal(
      dispute.openedAt.toNumber() + 86400
    );
  });

  // --- Merchant accept dispute ---

  it("merchant accepts dispute and funds return to owner", async () => {
    const { paymentPda: pPda, escrowTokenPda: ePda, disputePda: dPda } =
      await processPayment();
    await openDispute(pPda, dPda);

    const balanceBefore = await getTokenBalance(provider, userTokenAccount);

    await program.methods
      .merchantAcceptDispute()
      .accountsPartial({
        merchant: merchantKeypair.publicKey,
        paymentEscrow: pPda,
        disputeAccount: dPda,
        escrowTokenAccount: ePda,
        ownerTokenAccount: userTokenAccount,
        agentAccount: agentPda,
      })
      .signers([merchantKeypair])
      .rpc();

    const balanceAfter = await getTokenBalance(provider, userTokenAccount);
    expect(balanceAfter).to.equal(balanceBefore + 5_000_000);

    const escrow = await program.account.paymentEscrow.fetch(pPda);
    expect(Object.keys(escrow.state)[0]).to.equal("refunded");

    const dispute = await program.account.disputeAccount.fetch(dPda);
    expect(Object.keys(dispute.state)[0]).to.equal("merchantAccepted");
    expect(dispute.resolution).to.equal(1);

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.totalDisputedLifetime.toNumber()).to.be.greaterThan(0);
  });

  // --- Merchant contest dispute ---

  it("merchant contests dispute on a separate payment", async () => {
    const { paymentPda: pPda, disputePda: dPda } = await processPayment();
    await openDispute(pPda, dPda);

    await program.methods
      .merchantContestDispute()
      .accountsPartial({
        merchant: merchantKeypair.publicKey,
        paymentEscrow: pPda,
        disputeAccount: dPda,
      })
      .signers([merchantKeypair])
      .rpc();

    const dispute = await program.account.disputeAccount.fetch(dPda);
    expect(Object.keys(dispute.state)[0]).to.equal("merchantContested");
  });
});
