"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useProgram } from "@/hooks/useProgram";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { REASON_BAD_RESPONSE } from "@x402warden/sdk";
import { SolarIcon } from "@/components/ui/icon";

interface DisputeButtonProps {
  agentPda: PublicKey;
  escrowPda: PublicKey;
}

export function DisputeButton({ agentPda, escrowPda }: DisputeButtonProps) {
  const client = useProgram();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleDispute() {
    if (!client) return;
    setLoading(true);
    try {
      const reasonUri = new TextEncoder().encode("Dashboard dispute");
      await client.openDispute(agentPda, escrowPda, REASON_BAD_RESPONSE, reasonUri);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
    } catch (err) {
      console.error("Failed to open dispute:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDispute}
      disabled={loading || !client}
    >
      {loading ? (
        <SolarIcon name="loader" size={12} className="animate-spin mr-1" />
      ) : (
        <SolarIcon name="alert-triangle" size={12} className="mr-1" />
      )}
      Dispute
    </Button>
  );
}
