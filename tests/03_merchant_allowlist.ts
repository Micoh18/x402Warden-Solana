import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  getProgram,
  getProvider,
  deriveAgentPda,
  derivePolicyPda,
  deriveAllowlistPda,
  expectError,
} from "./helpers";

describe("03 - Merchant Allowlist", function () {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;

  let agentPda: PublicKey;
  let policyPda: PublicKey;
  let allowlistPda: PublicKey;
  const merchantA = Keypair.generate().publicKey;
  const merchantB = Keypair.generate().publicKey;

  before(async () => {
    [agentPda] = deriveAgentPda(owner, 0, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);
    [allowlistPda] = deriveAllowlistPda(agentPda, 0, program.programId);
  });

  it("creates allowlist page 0", async () => {
    await program.methods
      .createAllowlist(0)
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const allowlist =
      await program.account.merchantAllowlistAccount.fetch(allowlistPda);
    expect(allowlist.agent.toBase58()).to.equal(agentPda.toBase58());
    expect(allowlist.pageIndex).to.equal(0);
    expect(allowlist.merchants.length).to.equal(0);
  });

  it("adds merchant with category=0 and no override", async () => {
    await program.methods
      .addMerchantToAllowlist(merchantA, 0, new anchor.BN(0))
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        policyAccount: policyPda,
      })
      .rpc();

    const allowlist =
      await program.account.merchantAllowlistAccount.fetch(allowlistPda);
    expect(allowlist.merchants.length).to.equal(1);
    expect(allowlist.merchants[0].merchantPubkey.toBase58()).to.equal(
      merchantA.toBase58()
    );
    expect(allowlist.merchants[0].category).to.equal(0);
    expect(allowlist.merchants[0].maxPerCallOverride.toNumber()).to.equal(0);
  });

  it("adds second merchant with per-call override", async () => {
    await program.methods
      .addMerchantToAllowlist(merchantB, 1, new anchor.BN(2_000_000))
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        policyAccount: policyPda,
      })
      .rpc();

    const allowlist =
      await program.account.merchantAllowlistAccount.fetch(allowlistPda);
    expect(allowlist.merchants.length).to.equal(2);

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.allowlistCount).to.be.at.least(2);
  });

  it("removes merchant and decrements count", async () => {
    await program.methods
      .removeMerchantFromAllowlist(merchantA)
      .accountsPartial({
        owner,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        policyAccount: policyPda,
      })
      .rpc();

    const allowlist =
      await program.account.merchantAllowlistAccount.fetch(allowlistPda);
    expect(allowlist.merchants.length).to.equal(1);

    const policy = await program.account.policyAccount.fetch(policyPda);
    expect(policy.allowlistCount).to.be.at.least(1);
  });

  it("rejects removing non-existent merchant", () => {
    const unknown = Keypair.generate().publicKey;
    return expectError(
      program.methods
        .removeMerchantFromAllowlist(unknown)
        .accountsPartial({
          owner,
          agentAccount: agentPda,
          allowlistAccount: allowlistPda,
          policyAccount: policyPda,
        })
        .rpc(),
      "MerchantNotFound"
    );
  });
});
