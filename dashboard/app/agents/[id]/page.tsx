"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { useAgent } from "@/hooks/useAgent";
import { usePayments } from "@/hooks/usePayments";
import { useProgram } from "@/hooks/useProgram";
import { AgentStats } from "@/components/agent/AgentStats";
import { PaymentTable } from "@/components/payment/PaymentTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  lamportsToUsdc,
  bnToNumber,
  shortenAddress,
} from "@/lib/utils";
import { SolarIcon } from "@/components/ui/icon";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function AgentDetailPage() {
  const params = useParams();
  const agentPdaStr = params.id as string;

  const agentPda = useMemo(() => {
    try {
      return new PublicKey(agentPdaStr);
    } catch {
      return null;
    }
  }, [agentPdaStr]);

  const { data, isLoading, error } = useAgent(agentPda);
  const { data: payments } = usePayments(agentPda);
  const client = useProgram();
  const queryClient = useQueryClient();
  const [pauseLoading, setPauseLoading] = useState(false);

  async function togglePause() {
    if (!client || !agentPda || !data) return;
    setPauseLoading(true);
    try {
      if (data.agent.paused) {
        await client.unpauseAgent(agentPda);
      } else {
        await client.pauseAgent(agentPda);
      }
      queryClient.invalidateQueries({ queryKey: ["agent"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    } catch (err) {
      console.error(err);
    } finally {
      setPauseLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <SolarIcon name="loader" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive text-lg">Agent not found</p>
        <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block">
          Back to agents
        </Link>
      </div>
    );
  }

  const { agent, policy } = data;
  const recentPayments = (payments || []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <Link href="/agents" className="text-muted-foreground hover:text-primary transition-colors">
            <SolarIcon name="arrow-left" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold tracking-tight">Agent #{bnToNumber(agent.agentId)}</h1>
              {agent.paused ? (
                <Badge variant="warning">Paused</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/70 mt-1 tracking-wider">
              {agentPdaStr}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            disabled={pauseLoading}
          >
            {pauseLoading ? (
              <SolarIcon name="loader" size={16} className="animate-spin" />
            ) : agent.paused ? (
              <>
                <SolarIcon name="play" size={16} /> Unpause
              </>
            ) : (
              <>
                <SolarIcon name="pause" size={16} /> Pause
              </>
            )}
          </Button>
          <Link href={`/agents/${agentPdaStr}/settings`}>
            <Button variant="outline" size="sm">
              <SolarIcon name="settings" size={16} /> Settings
            </Button>
          </Link>
        </div>
      </div>

      <AgentStats agent={agent} policy={policy} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 animate-fade-in-up-2">
          <CardHeader>
            <CardTitle className="text-sm tracking-widest uppercase">Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Max / Call</span>
              <span className="font-mono text-foreground">${lamportsToUsdc(policy.maxPerCall)}</span>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Max / Period</span>
              <span className="font-mono text-foreground">${lamportsToUsdc(policy.maxPerPeriod)}</span>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Spent in Period</span>
              <span className="font-mono text-primary">${lamportsToUsdc(policy.spentInPeriod)}</span>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Dispute Window</span>
              <span className="font-mono">{policy.disputeWindowSeconds}s</span>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Allowlist</span>
              <Badge variant={policy.allowlistEnabled ? "default" : "secondary"}>
                {policy.allowlistEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <Separator className="opacity-30" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Settle Enabled</span>
              <Badge variant={policy.autoSettleEnabled ? "success" : "secondary"}>
                {policy.autoSettleEnabled ? "On" : "Off"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 animate-fade-in-up-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm tracking-widest uppercase">Recent Payments</CardTitle>
            <div className="flex gap-2">
              <Link href={`/agents/${agentPdaStr}/payments`}>
                <Button variant="ghost" size="sm">
                  <SolarIcon name="credit-card" size={16} /> View All
                </Button>
              </Link>
              <Link href={`/agents/${agentPdaStr}/disputes`}>
                <Button variant="ghost" size="sm">
                  <SolarIcon name="alert-triangle" size={16} /> Disputes
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <PaymentTable payments={recentPayments} agentPda={agentPda!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
