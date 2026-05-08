"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useAgent } from "@/hooks/useAgent";
import { useProgram } from "@/hooks/useProgram";
import { PolicyForm } from "@/components/policy/PolicyForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findAllowlistAccountPda } from "@x402warden/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const params = useParams();
  const agentPdaStr = params.id as string;
  const agentPda = useMemo(() => {
    try { return new PublicKey(agentPdaStr); } catch { return null; }
  }, [agentPdaStr]);

  const { data, isLoading } = useAgent(agentPda);
  const client = useProgram();
  const queryClient = useQueryClient();

  const [merchantAddr, setMerchantAddr] = useState("");
  const [category, setCategory] = useState("0");
  const [maxOverride, setMaxOverride] = useState("1000");
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  const [removeAddr, setRemoveAddr] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  async function handleAddMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !agentPda) return;
    setMerchantLoading(true);
    setMerchantError(null);

    try {
      const merchant = new PublicKey(merchantAddr);
      const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);
      await client.addMerchant(
        agentPda,
        allowlistPda,
        merchant,
        Number(category),
        new BN(Number(maxOverride) * 1_000_000)
      );
      setMerchantAddr("");
      queryClient.invalidateQueries({ queryKey: ["agent"] });
    } catch (err: any) {
      setMerchantError(err.message || "Failed to add merchant");
    } finally {
      setMerchantLoading(false);
    }
  }

  async function handleRemoveMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !agentPda) return;
    setRemoveLoading(true);
    try {
      const merchant = new PublicKey(removeAddr);
      const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);
      await client.removeMerchant(agentPda, allowlistPda, merchant);
      setRemoveAddr("");
      queryClient.invalidateQueries({ queryKey: ["agent"] });
    } catch (err: any) {
      console.error(err);
    } finally {
      setRemoveLoading(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/agents/${agentPdaStr}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agent
      </Link>

      <h1 className="text-2xl font-display font-bold tracking-tight">Agent Settings</h1>

      <PolicyForm agentPda={agentPda!} policy={data.policy} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm tracking-widest uppercase">Add Merchant to Allowlist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMerchant} className="space-y-4">
            <div className="space-y-2">
              <Label>Merchant Address</Label>
              <Input
                value={merchantAddr}
                onChange={(e) => setMerchantAddr(e.target.value)}
                placeholder="Merchant public key"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  type="number"
                  min="0"
                  max="255"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Override (USDC)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={maxOverride}
                  onChange={(e) => setMaxOverride(e.target.value)}
                />
              </div>
            </div>
            {merchantError && (
              <p className="text-sm text-red-400 font-mono">{merchantError}</p>
            )}
            <Button type="submit" disabled={merchantLoading || !merchantAddr} className="w-full">
              {merchantLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Merchant
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm tracking-widest uppercase">Remove Merchant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRemoveMerchant} className="space-y-4">
            <div className="space-y-2">
              <Label>Merchant Address</Label>
              <Input
                value={removeAddr}
                onChange={(e) => setRemoveAddr(e.target.value)}
                placeholder="Merchant public key to remove"
                className="font-mono text-xs"
              />
            </div>
            <Button type="submit" variant="destructive" disabled={removeLoading || !removeAddr} className="w-full">
              {removeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Merchant
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
