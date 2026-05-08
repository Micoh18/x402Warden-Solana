"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ParticleField } from "@/components/ui/particle-field";
import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { findAgentAccountPda, findPolicyAccountPda } from "@x402warden/sdk";
import { ArrowLeft, Loader2, Plus, Shield } from "lucide-react";
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
    <div className="max-w-lg mx-auto relative">
      <div className="absolute -inset-20 -z-10 opacity-60 overflow-hidden rounded-3xl">
        <ParticleField color="122, 155, 142" particleCount={60} speed={0.2} />
      </div>

      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 lumina-pill px-3 py-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      <div className="animate-fade-in-up gradient-border-shell">
        <div className="p-0">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative h-10 w-10 rounded-lg bg-warden-lichen/8 border border-warden-lichen/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-warden-lichen" />
              </div>
              <div>
                <CardTitle className="tracking-wide text-lg">Create Agent</CardTitle>
                <CardDescription className="mt-0.5">
                  Initialize a new smart account with escrow and policies.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="agentId" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Agent ID</Label>
                <Input
                  id="agentId"
                  type="number"
                  min="0"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Unique numeric identifier"
                  className="font-mono glass-surface"
                />
                <p className="text-xs text-muted-foreground/70">
                  A unique number to identify this agent under your wallet.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usdcAccount" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">USDC Token Account</Label>
                <Input
                  id="usdcAccount"
                  value={usdcAccount}
                  onChange={(e) => setUsdcAccount(e.target.value)}
                  placeholder="Your USDC associated token account public key"
                  className="font-mono text-xs glass-surface"
                />
                <p className="text-xs text-muted-foreground/70">
                  The USDC token account that the agent will use for payments.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-mono">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading || !client || !usdcAccount} className="w-full rounded-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Agent
              </Button>
            </form>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
