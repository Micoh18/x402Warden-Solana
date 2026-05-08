"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { usePayments } from "@/hooks/usePayments";
import { PaymentTable } from "@/components/payment/PaymentTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

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
          <ArrowLeft className="h-5 w-5" />
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
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <PaymentTable payments={payments || []} agentPda={agentPda!} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
