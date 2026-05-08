"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lamportsToUsdc, bnToNumber } from "@/lib/utils";
import type { AgentWithPda } from "@/hooks/useAgents";
import { Shield, DollarSign, Hash, Pause } from "lucide-react";

interface AgentCardProps {
  agent: AgentWithPda;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { account, publicKey } = agent;
  const agentId = bnToNumber(account.agentId);

  return (
    <Link href={`/agents/${publicKey.toBase58()}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Agent #{agentId}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {publicKey.toBase58().slice(0, 16)}...
              </p>
            </div>
          </div>
          {account.paused ? (
            <Badge variant="warning" className="flex items-center gap-1">
              <Pause className="h-3 w-3" /> Paused
            </Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-sm font-semibold">${lamportsToUsdc(account.totalSpentLifetime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Payments</p>
                <p className="text-sm font-semibold">{bnToNumber(account.paymentCount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Disputed</p>
                <p className="text-sm font-semibold">${lamportsToUsdc(account.totalDisputedLifetime)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
