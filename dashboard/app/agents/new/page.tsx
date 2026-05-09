"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useProgram } from "@/hooks/useProgram";
import { useWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { findAgentAccountPda, findPolicyAccountPda } from "@x402warden/sdk";
import { ArrowLeft, Loader2, Plus, Shield } from "lucide-react";
import Link from "next/link";

const WireframeGrid = dynamic(
  () => import("@/components/ui/wireframe-grid").then((m) => m.WireframeGrid),
  { ssr: false }
);

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
    <div className="relative -m-6 min-h-[calc(100vh-60px)] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <WireframeGrid />
      </div>

      <div className="absolute inset-0 z-[1] pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 65% at 50% 50%, transparent 30%, rgba(12, 16, 21, 0.5) 60%, rgba(12, 16, 21, 0.95) 85%),
          linear-gradient(to top, rgba(12, 16, 21, 0.9) 0%, transparent 30%),
          linear-gradient(to bottom, rgba(12, 16, 21, 0.9) 0%, transparent 30%),
          linear-gradient(to left, rgba(12, 16, 21, 0.7) 0%, transparent 20%),
          linear-gradient(to right, rgba(12, 16, 21, 0.7) 0%, transparent 20%)
        `,
      }} />

      <div className="w-full max-w-lg relative z-10 px-6">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-all duration-200 mb-8 lumina-pill px-3 py-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to agents
        </Link>

        <div className="animate-fade-in-up" style={{
          padding: "1px",
          borderRadius: "32px",
          background: "linear-gradient(160deg, rgba(86, 255, 232, 0.15), rgba(86, 255, 232, 0.02) 40%, rgba(10, 12, 11, 0.6) 100%)",
          boxShadow: "rgba(0, 0, 0, 0.6) 0px 40px 80px -20px, rgba(86, 255, 232, 0.1) 0px 0px 30px -5px, rgba(86, 255, 232, 0.05) 0px 1px 0px 0px inset",
        }}>
          <div style={{
            borderRadius: "31px",
            background: "linear-gradient(160deg, rgba(12, 16, 21, 0.96) 0%, rgba(10, 49, 53, 0.35) 100%)",
            backdropFilter: "blur(16px)",
          }}>
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative h-11 w-11 rounded-xl bg-warden-lichen/8 border border-warden-lichen/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-warden-lichen" />
                  <div className="absolute inset-0 blur-md bg-warden-lichen/5 rounded-xl" />
                </div>
                <div>
                  <CardTitle className="tracking-wide text-lg">Create Agent</CardTitle>
                  <CardDescription className="mt-0.5 text-sm">
                    Initialize a new smart account with escrow and policies.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-2">
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
                    className="font-mono glass-surface rounded-xl h-12"
                  />
                  <p className="text-xs text-muted-foreground/60">
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
                    className="font-mono text-xs glass-surface rounded-xl h-12"
                  />
                  <p className="text-xs text-muted-foreground/60">
                    The USDC token account that the agent will use for payments.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-mono">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !client || !usdcAccount}
                  className="w-full rounded-full h-12 text-base"
                >
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
    </div>
  );
}
