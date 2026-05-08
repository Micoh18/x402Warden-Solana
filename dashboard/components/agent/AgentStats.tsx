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
      color: "text-warden-heart",
      bgColor: "bg-warden-heart/10",
      borderColor: "border-warden-heart/20",
    },
    {
      label: "Total Disputed",
      value: `$${lamportsToUsdc(agent.totalDisputedLifetime)}`,
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    {
      label: "Payment Count",
      value: bnToNumber(agent.paymentCount).toString(),
      icon: Hash,
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/10",
      borderColor: "border-warden-soul/20",
    },
    {
      label: "Dispute Window",
      value: `${policy.disputeWindowSeconds}s`,
      icon: Clock,
      color: "text-warden-deep",
      bgColor: "bg-warden-deep/10",
      borderColor: "border-warden-deep/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card key={s.label} className={`animate-fade-in-up-${i + 1}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`relative h-11 w-11 rounded-lg ${s.bgColor} border ${s.borderColor} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-display font-bold tracking-tight mt-0.5">{s.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
