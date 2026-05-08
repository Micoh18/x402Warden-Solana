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

describe("05 - Settle Payment", () => {
  const provider = getProvider();
  anchor.setProvider(provider);
  const program = getProgram();
  const owner = provider.wallet.publicKey;
  const merchantKeypair = Keypair.generate();

  let agentPda: PublicKey;
  let policyPda: PublicKey;
  let usdcMint: PublicKey;
  let userTokenAccount: PublicKey;
  let merchantTokenAccount: PublicKey;
  let paymentPda: PublicKey;
  let escrowTokenPda: PublicKey;

  before(async () => {
    [agentPda] = deriveAgentPda(owner, 0, program.programId);
    [policyPda] = derivePolicyPda(agentPda, program.programId);

    usdcMint = await createUsdcMint(provider);
    userTokenAccount = await createTokenAccount(provider, usdcMint, owner);
    merchantTokenAccount = await createTokenAccount(
      provider,
      usdcMint,
      merchantKeypair.publicKey
    );
    await mintTokens(provider, usdcMint, userTokenAccount, 50_000_000);

    await program.methods
      .setPolicy({
        maxPerCall: new anchor.BN(10_000_000),
        maxPerPeriod: new anchor.BN(50_000_000),
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

    const agent = await program.account.agentAccount.fetch(agentPda);
    const count = agent.paymentCount.toNumber();

    [paymentPda] = derivePaymentPda(agentPda, count, program.programId);
    [escrowTokenPda] = deriveEscrowTokenPda(paymentPda, program.programId);

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
      })
      .rpc();
  });

  it("rejects immediate settle (dispute window still open)", async () => {
    await expectError(
      program.methods
        .settlePayment()
        .accountsPartial({
          settler: owner,
          paymentEscrow: paymentPda,
          escrowTokenAccount: escrowTokenPda,
          merchantTokenAccount,
        })
        .rpc(),
      "DisputeWindowOpen"
    );
  });

  // Localnet (solana-test-validator) does not support clock manipulation.
  // To fully test settle_payment, either:
  //   1. Use bankrun / solana-program-test which allows warping time
  //   2. Wait for the dispute window to expire (60s minimum)
  //
  // Uncomment the test below to wait the full dispute window.
  // Mocha timeout is set high enough (-t 1000000) to support this.

  // it("settles after dispute window expires (waits 65s)", async function () {
  //   this.timeout(120_000);
  //   await new Promise((r) => setTimeout(r, 65_000));
  //
  //   await program.methods
  //     .settlePayment()
  //     .accountsPartial({
  //       settler: owner,
  //       paymentEscrow: paymentPda,
  //       escrowTokenAccount: escrowTokenPda,
  //       merchantTokenAccount,
  //     })
  //     .rpc();
  //
  //   const escrow = await program.account.paymentEscrow.fetch(paymentPda);
  //   expect(Object.keys(escrow.state)[0]).to.equal("settled");
  // });
});
