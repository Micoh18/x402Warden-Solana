"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agent/AgentCard";
import { useAgents } from "@/hooks/useAgents";
import { SolarIcon } from "@/components/ui/icon";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">My Agents</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Manage your AI agent smart accounts</p>
        </div>
        <Link href="/agents/new">
          <Button>
            <SolarIcon name="plus" size={16} />
            Create Agent
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="relative">
            <SolarIcon name="loader" size={32} className="animate-spin text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/20 rounded-full animate-glow-pulse" />
          </div>
          <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Loading agents</span>
        </div>
      )}

      {error && (
        <div className="text-center py-20">
          <p className="text-destructive font-display">Failed to load agents</p>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && agents && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative h-20 w-20 rounded-2xl bg-warden-lichen/5 border border-warden-lichen/20 flex items-center justify-center mb-6 glow-primary">
            <SolarIcon name="shield" size={36} className="text-warden-lichen" />
            <div className="absolute inset-0 blur-xl bg-warden-lichen/8 rounded-2xl animate-glow-pulse" />
          </div>
          <h2 className="text-xl font-display font-semibold mb-2 tracking-tight">No agents yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md text-sm leading-relaxed">
            Create your first AI agent smart account to set spending policies and manage payments.
          </p>
          <Link href="/agents/new">
            <Button>
              <SolarIcon name="plus" size={16} />
              Create Your First Agent
            </Button>
          </Link>
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent, i) => (
            <div key={agent.publicKey.toBase58()} className={`animate-fade-in-up-${Math.min(i + 1, 4)}`}>
              <AgentCard agent={agent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
