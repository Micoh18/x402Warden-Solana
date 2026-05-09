"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { usePayments } from "@/hooks/usePayments";
import { PaymentTable } from "@/components/payment/PaymentTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SolarIcon } from "@/components/ui/icon";

export default function PaymentsPage() {
  const params = useParams();
  const agentPdaStr = params.id as string;
  const agentPda = useMemo(() => {
    try { return new PublicKey(agentPdaStr); } catch { return null; }
  }, [agentPdaStr]);

  const { data: payments, isLoading } = usePayments(agentPda);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/agents/${agentPdaStr}`} className="text-muted-foreground hover:text-foreground">
          <SolarIcon name="arrow-left" size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            All payment escrows for this agent
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {payments ? `${payments.length} payment(s)` : "Loading..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <SolarIcon name="loader" size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <PaymentTable payments={payments || []} agentPda={agentPda!} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
