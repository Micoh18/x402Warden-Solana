"use client";

import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import type { AgentAccount } from "@x402warden/sdk";

export interface AgentWithPda {
  publicKey: PublicKey;
  account: AgentAccount;
}

export function useAgents() {
  const { publicKey } = useWallet();
  const client = useProgram();

  return useQuery<AgentWithPda[]>({
    queryKey: ["agents", publicKey?.toBase58()],
    queryFn: async () => {
      if (!client || !publicKey) return [];
      const allAccounts = await (client.program.account as any)["agentAccount"].all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);
      return allAccounts.map((a: any) => ({
        publicKey: a.publicKey,
        account: a.account as AgentAccount,
      }));
    },
    enabled: !!client && !!publicKey,
    refetchInterval: 15000,
  });
}
