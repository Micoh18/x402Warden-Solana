"use client";

import { useQuery } from "@tanstack/react-query";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import type { PaymentEscrowAccount } from "@x402warden/sdk";

export interface PaymentWithPda {
  publicKey: PublicKey;
  account: PaymentEscrowAccount;
}

export function usePayments(agentPda: PublicKey | null) {
  const client = useProgram();

  return useQuery<PaymentWithPda[]>({
    queryKey: ["payments", agentPda?.toBase58()],
    queryFn: async () => {
      if (!client || !agentPda) return [];
      const allPayments = await (client.program.account as any)["paymentEscrow"].all([
        { memcmp: { offset: 8, bytes: agentPda.toBase58() } },
      ]);
      return allPayments.map((p: any) => ({
        publicKey: p.publicKey,
        account: p.account as PaymentEscrowAccount,
      }));
    },
    enabled: !!client && !!agentPda,
    refetchInterval: 10000,
  });
}
