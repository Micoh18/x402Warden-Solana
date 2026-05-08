"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { findAgentAccountPda, findPolicyAccountPda } from "@x402warden/sdk";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import Link from "next/link";

export default function NewAgentPage() {
  const client = useProgram();
  const { publicKey } = useWallet();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [agentId, setAgentId] = useState("1");
  const [usdcAccount, setUsdcAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !publicKey) return;
    setLoading(true);
    setError(null);

    try {
      const id = new BN(Number(agentId));
      const usdcPubkey = new PublicKey(usdcAccount);
      const [agentPda] = findAgentAccountPda(publicKey, id);
      const [policyPda] = findPolicyAccountPda(agentPda);

      await client.createAgent(id, usdcPubkey, agentPda, policyPda);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      router.push(`/agents/${agentPda.toBase58()}`);
    } catch (err: any) {
      setError(err.message || "Failed to create agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Agent</CardTitle>
          <CardDescription>
            Initialize a new AI agent smart account with escrow and spending policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                type="number"
                min="0"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Unique numeric identifier"
              />
              <p className="text-xs text-muted-foreground">
                A unique number to identify this agent under your wallet.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usdcAccount">USDC Token Account</Label>
              <Input
                id="usdcAccount"
                value={usdcAccount}
                onChange={(e) => setUsdcAccount(e.target.value)}
                placeholder="Your USDC associated token account public key"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The USDC token account that the agent will use for payments.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !client || !usdcAccount} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Agent
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
