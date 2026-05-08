"use client";

import { useQuery } from "@tanstack/react-query";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import { findPolicyAccountPda } from "@x402warden/sdk";
import type { AgentAccount, PolicyAccount } from "@x402warden/sdk";

export interface AgentWithPolicy {
  agent: AgentAccount;
  policy: PolicyAccount;
  agentPda: PublicKey;
  policyPda: PublicKey;
}

export function useAgent(agentPda: PublicKey | null) {
  const client = useProgram();

  return useQuery<AgentWithPolicy | null>({
    queryKey: ["agent", agentPda?.toBase58()],
    queryFn: async () => {
      if (!client || !agentPda) return null;
      const agent = await client.getAgent(agentPda);
      const [policyPda] = findPolicyAccountPda(agentPda);
      const policy = await client.getPolicy(policyPda);
      return { agent, policy, agentPda, policyPda };
    },
    enabled: !!client && !!agentPda,
    refetchInterval: 10000,
  });
}
