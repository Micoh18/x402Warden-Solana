"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Button } from "@/components/ui/button";
import { useProgram } from "@/hooks/useProgram";
import { useQueryClient } from "@tanstack/react-query";
import { SolarIcon } from "@/components/ui/icon";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

interface SettleButtonProps {
  escrowPda: PublicKey;
  merchant: PublicKey;
}

export function SettleButton({ escrowPda, merchant }: SettleButtonProps) {
  const client = useProgram();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleSettle() {
    if (!client) return;
    setLoading(true);
    try {
      const merchantTokenAccount = await getAssociatedTokenAddress(USDC_MINT, merchant);
      await client.settlePayment(escrowPda, merchantTokenAccount);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["agent"] });
    } catch (err: any) {
      console.error("Settle failed:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSettle} disabled={loading} className="gap-1.5">
      {loading ? (
        <SolarIcon name="loader" size={14} className="animate-spin" />
      ) : (
        <SolarIcon name="check" size={14} />
      )}
      Settle
    </Button>
  );
}
