"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useAgent } from "@/hooks/useAgent";
import { useProgram } from "@/hooks/useProgram";
import { PolicyForm } from "@/components/policy/PolicyForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findAllowlistAccountPda } from "@x402warden/sdk";
import type { MerchantEntry } from "@x402warden/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { SolarIcon } from "@/components/ui/icon";
import { shortenAddress, lamportsToUsdc } from "@/lib/utils";
import { getMerchantName, setMerchantName as saveMerchantName, removeMerchantName } from "@/lib/merchant-names";

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
  const [merchantName, setMerchantName] = useState("");
  const [category, setCategory] = useState("0");
  const [maxOverride, setMaxOverride] = useState("1000");
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  const [removeAddr, setRemoveAddr] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  const [merchants, setMerchants] = useState<MerchantEntry[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(false);

  useEffect(() => {
    if (!client || !agentPda) return;
    async function fetchAllowlist() {
      setMerchantsLoading(true);
      try {
        const [allowlistPda] = findAllowlistAccountPda(agentPda!, 0);
        const allowlist = await client!.getAllowlist(allowlistPda);
        setMerchants(allowlist.merchants || []);
      } catch {
        setMerchants([]);
      } finally {
        setMerchantsLoading(false);
      }
    }
    fetchAllowlist();
  }, [client, agentPda, merchantLoading, removeLoading]);

  async function handleAddMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !agentPda) return;
    setMerchantLoading(true);
    setMerchantError(null);

    try {
      const merchant = new PublicKey(merchantAddr);
      const [allowlistPda] = findAllowlistAccountPda(agentPda, 0);

      const allowlistInfo = await client.program.provider.connection.getAccountInfo(allowlistPda);
      if (!allowlistInfo) {
        await client.createAllowlist(agentPda, 0);
      }

      await client.addMerchant(
        agentPda,
        allowlistPda,
        merchant,
        Number(category),
        new BN(Number(maxOverride) * 1_000_000)
      );
      if (merchantName.trim()) {
        saveMerchantName(merchantAddr, merchantName.trim());
      }
      setMerchantAddr("");
      setMerchantName("");
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
        <SolarIcon name="loader" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/agents/${agentPdaStr}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <SolarIcon name="arrow-left" size={16} />
        Back to agent
      </Link>

      <h1 className="text-2xl font-display font-bold tracking-tight">Agent Settings</h1>

      <PolicyForm agentPda={agentPda!} policy={data.policy} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm tracking-widest uppercase flex items-center gap-2">
            <SolarIcon name="users" size={16} />
            Current Allowlist ({merchants.length} merchants)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <div className="flex justify-center py-4">
              <SolarIcon name="loader" size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No merchants in allowlist yet.</p>
          ) : (
            <div className="space-y-2">
              {merchants.map((m, i) => {
                const addr = m.merchantPubkey.toBase58();
                const name = getMerchantName(addr);
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {name && <span className="text-sm font-medium">{name}</span>}
                        <span className="font-mono text-xs text-muted-foreground">{shortenAddress(addr, 6)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">Cat: {m.category}</Badge>
                        <Badge variant="outline" className="text-xs">
                          Max: {lamportsToUsdc(m.maxPerCallOverride)} USDC
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm tracking-widest uppercase">Add Merchant to Allowlist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMerchant} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label>Merchant Address</Label>
                <Input
                  value={merchantAddr}
                  onChange={(e) => setMerchantAddr(e.target.value)}
                  placeholder="Merchant public key"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label>Name (optional)</Label>
                <Input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Research API"
                />
              </div>
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
                <SolarIcon name="loader" size={16} className="animate-spin mr-2" />
              ) : (
                <SolarIcon name="plus" size={16} className="mr-2" />
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
                <SolarIcon name="loader" size={16} className="animate-spin mr-2" />
              ) : (
                <SolarIcon name="trash" size={16} className="mr-2" />
              )}
              Remove Merchant
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
