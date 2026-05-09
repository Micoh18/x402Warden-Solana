"use client";

import { Card, CardContent } from "@/components/ui/card";
import { lamportsToUsdc, bnToNumber } from "@/lib/utils";
import type { AgentAccount, PolicyAccount } from "@x402warden/sdk";
import { SolarIcon } from "@/components/ui/icon";

interface AgentStatsProps {
  agent: AgentAccount;
  policy: PolicyAccount;
}

export function AgentStats({ agent, policy }: AgentStatsProps) {
  const stats = [
    {
      label: "Total Spent",
      value: `$${lamportsToUsdc(agent.totalSpentLifetime)}`,
      iconName: "dollar",
      color: "text-warden-lichen",
      bgColor: "bg-warden-lichen/8",
      borderColor: "border-warden-lichen/15",
    },
    {
      label: "Total Disputed",
      value: `$${lamportsToUsdc(agent.totalDisputedLifetime)}`,
      iconName: "alert-triangle",
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/5",
      borderColor: "border-warden-soul/10",
    },
    {
      label: "Payment Count",
      value: bnToNumber(agent.paymentCount).toString(),
      iconName: "hash",
      color: "text-warden-bone",
      bgColor: "bg-warden-bone/6",
      borderColor: "border-warden-bone/12",
    },
    {
      label: "Dispute Window",
      value: `${policy.disputeWindowSeconds}s`,
      iconName: "clock",
      color: "text-warden-moss",
      bgColor: "bg-warden-moss/10",
      borderColor: "border-warden-moss/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card key={s.label} className={`animate-fade-in-up-${i + 1}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`relative h-11 w-11 rounded-lg ${s.bgColor} border ${s.borderColor} flex items-center justify-center`}>
                <SolarIcon name={s.iconName} size={20} className={s.color} />
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
