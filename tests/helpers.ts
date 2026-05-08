import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { X402Warden } from "../target/types/x402_warden";
import {
  createMint,
  createAccount,
  mintTo as splMintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

export function getProgram(): Program<X402Warden> {
  return anchor.workspace.X402Warden as Program<X402Warden>;
}

export function getProvider(): anchor.AnchorProvider {
  return anchor.AnchorProvider.env();
}

export function payer(provider: anchor.AnchorProvider): anchor.web3.Keypair {
  return (provider.wallet as anchor.Wallet).payer;
}

export async function createUsdcMint(
  provider: anchor.AnchorProvider
): Promise<PublicKey> {
  const p = payer(provider);
  return createMint(provider.connection, p, p.publicKey, null, 6);
}

export async function createTokenAccount(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  return createAccount(provider.connection, payer(provider), mint, owner);
}

export async function mintTokens(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  dest: PublicKey,
  amount: number
): Promise<void> {
  const p = payer(provider);
  await splMintTo(provider.connection, p, mint, dest, p, amount);
}

export async function getTokenBalance(
  provider: anchor.AnchorProvider,
  account: PublicKey
): Promise<number> {
  const info = await getAccount(provider.connection, account);
  return Number(info.amount);
}

export function deriveAgentPda(
  owner: PublicKey,
  agentId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("agent"),
      owner.toBuffer(),
      new anchor.BN(agentId).toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

export function derivePolicyPda(
  agentKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), agentKey.toBuffer()],
    programId
  );
}

export function deriveAllowlistPda(
  agentKey: PublicKey,
  pageIndex: number,
  programId: PublicKey
): [PublicKey, number] {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(pageIndex);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allowlist"), agentKey.toBuffer(), buf],
    programId
  );
}

export function derivePaymentPda(
  agentKey: PublicKey,
  paymentId: number,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("payment"),
      agentKey.toBuffer(),
      new anchor.BN(paymentId).toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

export function deriveDisputePda(
  paymentKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), paymentKey.toBuffer()],
    programId
  );
}

export function deriveEscrowTokenPda(
  paymentKey: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow_token"), paymentKey.toBuffer()],
    programId
  );
}

export async function expectError(
  promise: Promise<any>,
  errorCode: string
): Promise<void> {
  try {
    await promise;
    throw new Error("Expected transaction to fail");
  } catch (e: any) {
    if (e.message === "Expected transaction to fail") throw e;
    const msg = e.toString().toLowerCase();
    expect(msg).to.include(errorCode.toLowerCase());
  }
}
