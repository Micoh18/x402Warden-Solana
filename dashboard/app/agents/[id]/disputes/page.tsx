"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { usePayments } from "@/hooks/usePayments";
import { useDisputes } from "@/hooks/useDisputes";
import { DisputeCard } from "@/components/dispute/DisputeCard";
import { SolarIcon } from "@/components/ui/icon";

export default function DisputesPage() {
  const params = useParams();
  const agentPdaStr = params.id as string;
  const agentPda = useMemo(() => {
    try { return new PublicKey(agentPdaStr); } catch { return null; }
  }, [agentPdaStr]);

  const { data: payments } = usePayments(agentPda);
  const { data: disputes, isLoading } = useDisputes(payments || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/agents/${agentPdaStr}`} className="text-muted-foreground hover:text-foreground">
          <SolarIcon name="arrow-left" size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Disputes</h1>
          <p className="text-sm text-muted-foreground">
            Active and resolved disputes for this agent
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <SolarIcon name="loader" size={32} className="animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (!disputes || disputes.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <SolarIcon name="shield-off" size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No disputes</h2>
          <p className="text-muted-foreground">
            Disputes will appear here when you challenge a payment.
          </p>
        </div>
      )}

      {disputes && disputes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disputes.map((d) => (
            <DisputeCard key={d.publicKey.toBase58()} dispute={d} />
          ))}
        </div>
      )}
    </div>
  );
}
