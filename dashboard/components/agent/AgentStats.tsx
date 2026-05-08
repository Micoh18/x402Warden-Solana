"use client";

import { Card, CardContent } from "@/components/ui/card";
import { lamportsToUsdc, bnToNumber } from "@/lib/utils";
import type { AgentAccount, PolicyAccount } from "@x402warden/sdk";
import { DollarSign, AlertTriangle, Hash, Clock } from "lucide-react";

interface AgentStatsProps {
  agent: AgentAccount;
  policy: PolicyAccount;
}

export function AgentStats({ agent, policy }: AgentStatsProps) {
  const stats = [
    {
      label: "Total Spent",
      value: `$${lamportsToUsdc(agent.totalSpentLifetime)}`,
      icon: DollarSign,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "Total Disputed",
      value: `$${lamportsToUsdc(agent.totalDisputedLifetime)}`,
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-400/10",
    },
    {
      label: "Payment Count",
      value: bnToNumber(agent.paymentCount).toString(),
      icon: Hash,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      label: "Dispute Window",
      value: `${policy.disputeWindowSeconds}s`,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bgColor} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
