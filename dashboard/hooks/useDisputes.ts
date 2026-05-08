"use client";

import { useQuery } from "@tanstack/react-query";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import { findDisputeAccountPda } from "@x402warden/sdk";
import type { DisputeAccount, PaymentEscrowAccount } from "@x402warden/sdk";

export interface DisputeWithPda {
  publicKey: PublicKey;
  account: DisputeAccount;
  paymentPda: PublicKey;
}

export function useDisputes(payments: { publicKey: PublicKey; account: PaymentEscrowAccount }[]) {
  const client = useProgram();

  const disputedPayments = payments.filter(
    (p) => Object.keys(p.account.state)[0] === "disputed"
  );

  return useQuery<DisputeWithPda[]>({
    queryKey: ["disputes", disputedPayments.map((p) => p.publicKey.toBase58()).join(",")],
    queryFn: async () => {
      if (!client) return [];
      const results: DisputeWithPda[] = [];
      for (const payment of disputedPayments) {
        try {
          const [disputePda] = findDisputeAccountPda(payment.publicKey);
          const dispute = await client.getDispute(disputePda);
          results.push({
            publicKey: disputePda,
            account: dispute,
            paymentPda: payment.publicKey,
          });
        } catch {
          // dispute might not exist yet
        }
      }
      return results;
    },
    enabled: !!client && disputedPayments.length > 0,
    refetchInterval: 10000,
  });
}
