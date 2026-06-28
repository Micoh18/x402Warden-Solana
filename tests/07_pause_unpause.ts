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

describe("07 - Pause / Unpause", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let agentPda: PublicKey;
  let policyPda: PublicKey;
  let usdcMint: PublicKey;
  let userTokenAccount: PublicKey;

  before(async () => {
    [agentPda] = deriveAgentPda(owner, 0, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);

    usdcMint = await createUsdcMint(provider);
    userTokenAccount = await createTokenAccount(provider, usdcMint, owner);
    await mintTokens(provider, usdcMint, userTokenAccount, 50_000_000);

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

  it("pauses agent", async () => {
    await program.methods
      .pauseAgent()
      .accountsPartial({
        owner,
        agentAccount: agentPda,
      })
      .rpc();

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.paused).to.equal(true);
  });

  it("rejects payment while agent is paused", async () => {
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
          allowlistAccount: null,
        })
        .rpc(),
      "AgentPaused"
    );
  });

  it("unpauses agent", async () => {
    await program.methods
      .unpauseAgent()
      .accountsPartial({
        owner,
        agentAccount: agentPda,
      })
      .rpc();

    const agent = await program.account.agentAccount.fetch(agentPda);
    expect(agent.paused).to.equal(false);
  });

  it("rejects unpause when agent is not paused", async () => {
    await expectError(
      program.methods
        .unpauseAgent()
        .accountsPartial({
          owner,
          agentAccount: agentPda,
        })
        .rpc(),
      "AgentNotPaused"
    );
  });
});
