import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  AnchorProvider,
  Program,
  Wallet,
  BN,
} from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID } from "./constants.js";
import {
  findPolicyAccountPda,
  findAllowlistAccountPda,
  findPaymentEscrowPda,
  findDisputeAccountPda,
  findEscrowTokenAccountPda,
} from "./pda.js";
import type {
  AgentAccount,
  PolicyAccount,
  MerchantAllowlistAccount,
  PaymentEscrowAccount,
  DisputeAccount,
  SetPolicyParams,
} from "./types.js";
import IDL from "./idl.js";

export interface X402WardenClientConfig {
  connection: Connection;
  wallet: Wallet;
  programId?: PublicKey;
}

export class X402WardenClient {
  readonly program: Program;
  readonly provider: AnchorProvider;
  readonly programId: PublicKey;

  constructor(config: X402WardenClientConfig) {
    this.programId = config.programId ?? PROGRAM_ID;
    this.provider = new AnchorProvider(config.connection, config.wallet, {
      commitment: "confirmed",
    });
    this.program = new Program(IDL as any, this.provider);
  }

  // ── Instructions ──

  async createAgent(
    agentId: BN | number,
    usdcTokenAccount: PublicKey,
    agentPda: PublicKey,
    policyPda: PublicKey
  ): Promise<string> {
    return this.program.methods
      .initializeAgentAccount(new BN(agentId))
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        policyAccount: policyPda,
        usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async setPolicy(
    agentPda: PublicKey,
    params: SetPolicyParams
  ): Promise<string> {
    const [policyPda] = findPolicyAccountPda(agentPda, this.programId);

    return this.program.methods
      .setPolicy({
        maxPerCall: params.maxPerCall,
        maxPerPeriod: params.maxPerPeriod,
        periodSeconds: params.periodSeconds,
        disputeWindowSeconds: params.disputeWindowSeconds,
        allowlistEnabled: params.allowlistEnabled,
        autoSettleEnabled: params.autoSettleEnabled,
      })
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        policyAccount: policyPda,
      })
      .rpc();
  }

  async createAllowlist(
    agentPda: PublicKey,
    pageIndex: number = 0
  ): Promise<string> {
    const [allowlistPda] = findAllowlistAccountPda(agentPda, pageIndex, this.programId);

    return this.program.methods
      .createAllowlist(pageIndex)
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async addMerchant(
    agentPda: PublicKey,
    allowlistPda: PublicKey,
    merchant: PublicKey,
    category: number,
    maxOverride: BN | number
  ): Promise<string> {
    const [policyPda] = findPolicyAccountPda(agentPda, this.programId);

    return this.program.methods
      .addMerchantToAllowlist(merchant, category, new BN(maxOverride))
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        policyAccount: policyPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async removeMerchant(
    agentPda: PublicKey,
    allowlistPda: PublicKey,
    merchant: PublicKey
  ): Promise<string> {
    const [policyPda] = findPolicyAccountPda(agentPda, this.programId);

    return this.program.methods
      .removeMerchantFromAllowlist(merchant)
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        allowlistAccount: allowlistPda,
        policyAccount: policyPda,
      })
      .rpc();
  }

  async processPayment(
    agentPda: PublicKey,
    amount: BN | number,
    merchant: PublicKey,
    x402RequestHash: number[] | Uint8Array,
    userTokenAccount: PublicKey,
    usdcMint: PublicKey
  ): Promise<string> {
    const agentData = await this.getAgent(agentPda);
    const paymentCount = agentData.paymentCount;
    const [policyPda] = findPolicyAccountPda(agentPda, this.programId);
    const [paymentEscrowPda] = findPaymentEscrowPda(
      agentPda,
      paymentCount,
      this.programId
    );
    const [escrowTokenPda] = findEscrowTokenAccountPda(
      paymentEscrowPda,
      this.programId
    );

    return this.program.methods
      .processX402Payment(
        new BN(amount),
        merchant,
        Array.from(x402RequestHash)
      )
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        policyAccount: policyPda,
        paymentEscrow: paymentEscrowPda,
        userTokenAccount,
        escrowTokenAccount: escrowTokenPda,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
  }

  async settlePayment(
    escrowPda: PublicKey,
    merchantTokenAccount: PublicKey
  ): Promise<string> {
    const [escrowTokenPda] = findEscrowTokenAccountPda(
      escrowPda,
      this.programId
    );

    return this.program.methods
      .settlePayment()
      .accounts({
        settler: this.provider.wallet.publicKey,
        paymentEscrow: escrowPda,
        escrowTokenAccount: escrowTokenPda,
        merchantTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async openDispute(
    agentPda: PublicKey,
    escrowPda: PublicKey,
    reasonCode: number,
    reasonUri: number[] | Uint8Array
  ): Promise<string> {
    const [disputePda] = findDisputeAccountPda(escrowPda, this.programId);
    const agentData = await this.getAgent(agentPda);

    const uriArray = Array.from(reasonUri);
    while (uriArray.length < 64) uriArray.push(0);

    return this.program.methods
      .openDispute(reasonCode, uriArray.slice(0, 64))
      .accounts({
        opener: this.provider.wallet.publicKey,
        agentAccount: agentPda,
        paymentEscrow: escrowPda,
        disputeAccount: disputePda,
        owner: agentData.owner,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async merchantAcceptDispute(
    escrowPda: PublicKey,
    disputePda: PublicKey,
    ownerTokenAccount: PublicKey,
    agentPda: PublicKey
  ): Promise<string> {
    const [escrowTokenPda] = findEscrowTokenAccountPda(
      escrowPda,
      this.programId
    );

    return this.program.methods
      .merchantAcceptDispute()
      .accounts({
        merchant: this.provider.wallet.publicKey,
        paymentEscrow: escrowPda,
        disputeAccount: disputePda,
        escrowTokenAccount: escrowTokenPda,
        ownerTokenAccount,
        agentAccount: agentPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async merchantContestDispute(
    escrowPda: PublicKey,
    disputePda: PublicKey
  ): Promise<string> {
    return this.program.methods
      .merchantContestDispute()
      .accounts({
        merchant: this.provider.wallet.publicKey,
        paymentEscrow: escrowPda,
        disputeAccount: disputePda,
      })
      .rpc();
  }

  async autoRefundDispute(
    escrowPda: PublicKey,
    disputePda: PublicKey,
    ownerTokenAccount: PublicKey,
    agentPda: PublicKey
  ): Promise<string> {
    const [escrowTokenPda] = findEscrowTokenAccountPda(
      escrowPda,
      this.programId
    );

    return this.program.methods
      .autoRefundDispute()
      .accounts({
        caller: this.provider.wallet.publicKey,
        paymentEscrow: escrowPda,
        disputeAccount: disputePda,
        escrowTokenAccount: escrowTokenPda,
        ownerTokenAccount,
        agentAccount: agentPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async pauseAgent(agentPda: PublicKey): Promise<string> {
    return this.program.methods
      .pauseAgent()
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
      })
      .rpc();
  }

  async unpauseAgent(agentPda: PublicKey): Promise<string> {
    return this.program.methods
      .unpauseAgent()
      .accounts({
        owner: this.provider.wallet.publicKey,
        agentAccount: agentPda,
      })
      .rpc();
  }

  // ── Account readers ──

  async getAgent(pda: PublicKey): Promise<AgentAccount> {
    const acc = (this.program.account as any)["agentAccount"];
    return acc.fetch(pda) as Promise<AgentAccount>;
  }

  async getPolicy(pda: PublicKey): Promise<PolicyAccount> {
    const acc = (this.program.account as any)["policyAccount"];
    return acc.fetch(pda) as Promise<PolicyAccount>;
  }

  async getAllowlist(pda: PublicKey): Promise<MerchantAllowlistAccount> {
    const acc = (this.program.account as any)["merchantAllowlistAccount"];
    return acc.fetch(pda) as Promise<MerchantAllowlistAccount>;
  }

  async getPayment(pda: PublicKey): Promise<PaymentEscrowAccount> {
    const acc = (this.program.account as any)["paymentEscrow"];
    return acc.fetch(pda) as Promise<PaymentEscrowAccount>;
  }

  async getDispute(pda: PublicKey): Promise<DisputeAccount> {
    const acc = (this.program.account as any)["disputeAccount"];
    return acc.fetch(pda) as Promise<DisputeAccount>;
  }
}
