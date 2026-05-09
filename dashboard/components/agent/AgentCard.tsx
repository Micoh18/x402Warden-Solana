"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lamportsToUsdc, bnToNumber } from "@/lib/utils";
import type { AgentWithPda } from "@/hooks/useAgents";
import { SolarIcon } from "@/components/ui/icon";

interface AgentCardProps {
  agent: AgentWithPda;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { account, publicKey } = agent;
  const agentId = bnToNumber(account.agentId);

  return (
    <Link href={`/agents/${publicKey.toBase58()}`}>
      <Card className="cursor-pointer group relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warden-lichen/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-lg bg-warden-lichen/8 border border-warden-lichen/20 flex items-center justify-center group-hover:border-warden-lichen/35 transition-all duration-300">
              <SolarIcon name="shield" size={20} className="text-warden-lichen" />
              <div className="absolute inset-0 blur-md bg-warden-lichen/0 group-hover:bg-warden-lichen/8 rounded-lg transition-all duration-300" />
            </div>
            <div>
              <CardTitle className="text-base tracking-wide">Agent #{agentId}</CardTitle>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5 tracking-wider">
                {publicKey.toBase58().slice(0, 16)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {account.paused ? (
              <Badge variant="warning" className="flex items-center gap-1">
                <SolarIcon name="pause" size={12} /> Paused
              </Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
            <SolarIcon name="chevron-right" size={16} className="text-muted-foreground/40 group-hover:text-primary transition-all duration-200" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mt-2 pt-3 border-t border-border/50">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <SolarIcon name="dollar" size={12} className="text-warden-lichen/70" />
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Spent</p>
              </div>
              <p className="text-sm font-mono font-semibold">${lamportsToUsdc(account.totalSpentLifetime)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <SolarIcon name="hash" size={12} className="text-warden-bone/60" />
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Txns</p>
              </div>
              <p className="text-sm font-mono font-semibold">{bnToNumber(account.paymentCount)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <SolarIcon name="alert-triangle" size={12} className="text-warden-moss/70" />
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Disputes</p>
              </div>
              <p className="text-sm font-mono font-semibold">${lamportsToUsdc(account.totalDisputedLifetime)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
