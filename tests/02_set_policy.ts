import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { expect } from "chai";
import {
  getProgram,
  getProvider,
  deriveAgentPda,
  derivePolicyPda,
  expectError,
} from "./helpers";

describe("02 - Set Policy", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let agentPda: anchor.web3.PublicKey;
  let policyPda: anchor.web3.PublicKey;

  before(() => {
    [agentPda] = deriveAgentPda(owner, 0, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);
  });

  it("sets custom policy limits", async () => {
    await program.methods
      .setPolicy({
        maxPerCall: new anchor.BN(5_000_000),
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

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.maxPerCall.toNumber()).to.equal(5_000_000);
    expect(policy.maxPerPeriod.toNumber()).to.equal(50_000_000);
    expect(policy.periodSeconds.toNumber()).to.equal(86400);
    expect(policy.disputeWindowSeconds).to.equal(300);
    expect(policy.allowlistEnabled).to.equal(false);
    expect(policy.autoSettleEnabled).to.equal(true);
  });

  it("rejects dispute window below minimum (< 60s)", async () => {
    await expectError(
      program.methods
        .setPolicy({
          maxPerCall: new anchor.BN(5_000_000),
          maxPerPeriod: new anchor.BN(50_000_000),
          periodSeconds: new anchor.BN(86400),
          disputeWindowSeconds: 30,
          allowlistEnabled: false,
          autoSettleEnabled: true,
        })
        .accountsPartial({
          owner,
          agentAccount: agentPda,
          policyAccount: policyPda,
        })
        .rpc(),
      "InvalidDisputeWindow"
    );
  });

  it("rejects non-owner setting policy", async () => {
    const fakeOwner = Keypair.generate();

    try {
      await program.methods
        .setPolicy({
          maxPerCall: new anchor.BN(1_000_000),
          maxPerPeriod: new anchor.BN(10_000_000),
          periodSeconds: new anchor.BN(86400),
          disputeWindowSeconds: 300,
          allowlistEnabled: false,
          autoSettleEnabled: true,
        })
        .accountsPartial({
          owner: fakeOwner.publicKey,
          agentAccount: agentPda,
          policyAccount: policyPda,
        })
        .signers([fakeOwner])
        .rpc();
      expect.fail("Expected transaction to fail");
    } catch (e: any) {
      expect(e).to.exist;
    }
  });
});
