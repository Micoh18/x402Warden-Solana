import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  PROGRAM_ID,
  AGENT_SEED,
  POLICY_SEED,
  ALLOWLIST_SEED,
  PAYMENT_SEED,
  DISPUTE_SEED,
  PAYMENT_EVIDENCE_SEED,
  ESCROW_TOKEN_SEED,
} from "./constants";

function bnToLeBytes(value: BN | number, size: number): Buffer {
  const bn = new BN(value);
  return bn.toArrayLike(Buffer, "le", size);
}

export function findAgentAccountPda(
  owner: PublicKey,
  agentId: BN | number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, owner.toBuffer(), bnToLeBytes(agentId, 8)],
    programId
  );
}

export function findPolicyAccountPda(
  agentAccount: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POLICY_SEED, agentAccount.toBuffer()],
    programId
  );
}

export function findAllowlistAccountPda(
  agentAccount: PublicKey,
  pageIndex: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      ALLOWLIST_SEED,
      agentAccount.toBuffer(),
      bnToLeBytes(pageIndex, 2),
    ],
    programId
  );
}

export function findPaymentEscrowPda(
  agentAccount: PublicKey,
  paymentId: BN | number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PAYMENT_SEED, agentAccount.toBuffer(), bnToLeBytes(paymentId, 8)],
    programId
  );
}

export function findDisputeAccountPda(
  paymentEscrow: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [DISPUTE_SEED, paymentEscrow.toBuffer()],
    programId
  );
}

export function findPaymentEvidencePda(
  paymentEscrow: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PAYMENT_EVIDENCE_SEED, paymentEscrow.toBuffer()],
    programId
  );
}

export function findEscrowTokenAccountPda(
  paymentEscrow: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ESCROW_TOKEN_SEED, paymentEscrow.toBuffer()],
    programId
  );
}
