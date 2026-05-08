import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  getProgram,
  getProvider,
  deriveAgentPda,
  derivePolicyPda,
  createUsdcMint,
  createTokenAccount,
} from "./helpers";

describe("01 - Initialize Agent", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let usdcMint: anchor.web3.PublicKey;
  let usdcTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    usdcMint = await createUsdcMint(provider);
    usdcTokenAccount = await createTokenAccount(provider, usdcMint, owner);
  });

  it("initializes agent with agentId=0", async () => {
    const [agentPda] = deriveAgentPda(owner, 0, program.programId);
    const [policyPda] = derivePolicyPda(agentPda, program.programId);

    await program.methods
      .initializeAgentAccount(new anchor.BN(0))
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        policyAccount: policyPda,
        usdcTokenAccount,
      })
      .rpc();

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.owner.toBase58()).to.equal(owner.toBase58());
    expect(agent.agentId.toNumber()).to.equal(0);
    expect(agent.usdcTokenAccount.toBase58()).to.equal(
      usdcTokenAccount.toBase58()
    );
    expect(agent.policyAccount.toBase58()).to.equal(policyPda.toBase58());
    expect(agent.totalSpentLifetime.toNumber()).to.equal(0);
    expect(agent.totalDisputedLifetime.toNumber()).to.equal(0);
    expect(agent.paymentCount.toNumber()).to.equal(0);
    expect(agent.createdAt.toNumber()).to.be.greaterThan(0);
    expect(agent.paused).to.equal(false);
  });

  it("initializes second agent with agentId=1", async () => {
    const [agentPda] = deriveAgentPda(owner, 1, program.programId);
    const [policyPda] = derivePolicyPda(agentPda, program.programId);

    await program.methods
      .initializeAgentAccount(new anchor.BN(1))
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        policyAccount: policyPda,
        usdcTokenAccount,
      })
      .rpc();

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.agentId.toNumber()).to.equal(1);

    const [firstAgentPda] = deriveAgentPda(owner, 0, program.programId);
    const firstAgent = await program.account.agentAccount.fetch(firstAgentPda);
    expect(firstAgent.agentId.toNumber()).to.equal(0);
  });

  it("verifies PolicyAccount created with defaults", async () => {
    const [agentPda] = deriveAgentPda(owner, 0, program.programId);
    const [policyPda] = derivePolicyPda(agentPda, program.programId);

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.agent.toBase58()).to.equal(agentPda.toBase58());

    const U64_MAX = new anchor.BN("18446744073709551615");
    expect(policy.maxPerCall.toString()).to.equal(U64_MAX.toString());
    expect(policy.maxPerDay.toString()).to.equal(U64_MAX.toString());
    expect(policy.maxPerPeriod.toString()).to.equal(U64_MAX.toString());
    expect(policy.periodSeconds.toNumber()).to.equal(86400);
    expect(policy.spentInPeriod.toNumber()).to.equal(0);
    expect(policy.allowlistEnabled).to.equal(false);
    expect(policy.allowlistCount).to.equal(0);
    expect(policy.disputeWindowSeconds).to.equal(300);
    expect(policy.autoSettleEnabled).to.equal(true);
  });
});
