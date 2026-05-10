"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useProgram } from "@/hooks/useProgram";
import { useQueryClient } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import type { PolicyAccount } from "@x402warden/sdk";
import { bnToNumber } from "@/lib/utils";
import { SolarIcon } from "@/components/ui/icon";

interface PolicyFormProps {
  agentPda: PublicKey;
  policy: PolicyAccount;
}

export function PolicyForm({ agentPda, policy }: PolicyFormProps) {
  const client = useProgram();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maxPerCall, setMaxPerCall] = useState(bnToNumber(policy.maxPerCall) / 1_000_000);
  const [maxPerPeriod, setMaxPerPeriod] = useState(bnToNumber(policy.maxPerPeriod) / 1_000_000);
  const [periodSeconds, setPeriodSeconds] = useState(bnToNumber(policy.periodSeconds));
  const [disputeWindowSeconds, setDisputeWindowSeconds] = useState(policy.disputeWindowSeconds);
  const [allowlistEnabled, setAllowlistEnabled] = useState(policy.allowlistEnabled);
  const [autoSettleEnabled, setAutoSettleEnabled] = useState(policy.autoSettleEnabled);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setLoading(true);
    setError(null);

    try {
      await client.setPolicy(agentPda, {
        maxPerCall: new BN(maxPerCall * 1_000_000),
        maxPerPeriod: new BN(maxPerPeriod * 1_000_000),
        periodSeconds: new BN(periodSeconds),
        disputeWindowSeconds,
        allowlistEnabled,
        autoSettleEnabled,
      });
      queryClient.invalidateQueries({ queryKey: ["agent"] });
    } catch (err: any) {
      setError(err.message || "Failed to update policy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Spending Policy</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxPerCall">Max per Call (USDC)</Label>
              <Input
                id="maxPerCall"
                type="number"
                step="0.01"
                value={maxPerCall}
                onChange={(e) => setMaxPerCall(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPerPeriod">Max per Period (USDC)</Label>
              <Input
                id="maxPerPeriod"
                type="number"
                step="0.01"
                value={maxPerPeriod}
                onChange={(e) => setMaxPerPeriod(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodSeconds">Period (seconds)</Label>
              <Input
                id="periodSeconds"
                type="number"
                value={periodSeconds}
                onChange={(e) => setPeriodSeconds(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disputeWindow">Dispute Window (seconds)</Label>
              <Input
                id="disputeWindow"
                type="number"
                min={60}
                max={86400}
                value={disputeWindowSeconds}
                onChange={(e) => setDisputeWindowSeconds(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="allowlist">Merchant Allowlist</Label>
              <Switch
                id="allowlist"
                checked={allowlistEnabled}
                onCheckedChange={setAllowlistEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autosettle">Settle Enabled</Label>
              <Switch
                id="autosettle"
                checked={autoSettleEnabled}
                onCheckedChange={setAutoSettleEnabled}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading || !client} className="w-full">
            {loading ? (
              <SolarIcon name="loader" size={16} className="animate-spin mr-2" />
            ) : (
              <SolarIcon name="save" size={16} className="mr-2" />
            )}
            Save Policy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
