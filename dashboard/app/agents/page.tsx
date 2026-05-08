"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agent/AgentCard";
import { useAgents } from "@/hooks/useAgents";
import { Plus, Loader2, Shield } from "lucide-react";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Agents</h1>
          <p className="text-muted-foreground mt-1">Manage your AI agent smart accounts</p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-center py-20">
          <p className="text-destructive">Failed to load agents</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && agents && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first AI agent smart account to set spending policies and manage payments.
          </p>
          <Link href="/agents/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </Link>
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.publicKey.toBase58()} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
