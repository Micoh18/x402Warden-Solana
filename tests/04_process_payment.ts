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
  getTokenBalance,
} from "./helpers";

describe("04 - Process Payment", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;
  const merchant = Keypair.generate().publicKey;

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

  it("processes 5 USDC payment to escrow", async () => {
    const agentBefore = await program.account.agentAccount.fetch(agentPda);
    const countBefore = agentBefore.paymentCount.toNumber();
    const spentBefore = agentBefore.totalSpentLifetime.toNumber();

    const [paymentPda] = derivePaymentPda(
      agentPda,
      countBefore,
      program.programId
    );
    const [escrowTokenPda] = deriveEscrowTokenPda(
      paymentPda,
      program.programId
    );

    const balanceBefore = await getTokenBalance(provider, userTokenAccount);

    await program.methods
      .processX402Payment(
        new anchor.BN(5_000_000),
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

    const escrowBalance = await getTokenBalance(provider, escrowTokenPda);
    expect(escrowBalance).to.equal(5_000_000);

    const balanceAfter = await getTokenBalance(provider, userTokenAccount);
    expect(balanceAfter).to.equal(balanceBefore - 5_000_000);

    const escrow = await program.account.paymentEscrow.fetch(paymentPda);
    expect(escrow.agent.toBase58()).to.equal(agentPda.toBase58());
    expect(escrow.paymentId.toNumber()).to.equal(countBefore);
    expect(escrow.merchant.toBase58()).to.equal(merchant.toBase58());
    expect(escrow.amount.toNumber()).to.equal(5_000_000);
    expect(escrow.escrowTokenAccount.toBase58()).to.equal(
      escrowTokenPda.toBase58()
    );
    expect(Object.keys(escrow.state)[0]).to.equal("pending");
    expect(escrow.settleAfter.toNumber()).to.equal(
      escrow.createdAt.toNumber() + 300
    );
  });

  it("increments agent payment_count and total_spent_lifetime", async () => {
    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.paymentCount.toNumber()).to.be.at.least(1);
    expect(agent.totalSpentLifetime.toNumber()).to.be.at.least(5_000_000);
  });

  it("updates policy spent_in_period", async () => {
    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.spentInPeriod.toNumber()).to.be.at.least(5_000_000);
  });
});
