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
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      glowClass: "glow-blue",
    },
    {
      label: "Total Disputed",
      value: `$${lamportsToUsdc(agent.totalDisputedLifetime)}`,
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      glowClass: "glow-red",
    },
    {
      label: "Payment Count",
      value: bnToNumber(agent.paymentCount).toString(),
      icon: Hash,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      glowClass: "glow-primary",
    },
    {
      label: "Dispute Window",
      value: `${policy.disputeWindowSeconds}s`,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      glowClass: "glow-amber",
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
