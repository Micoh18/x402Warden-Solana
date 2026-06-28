"use client";

import { useMemo } from "react";
import BN from "bn.js";
import { Card, CardContent } from "@/components/ui/card";
import { lamportsToUsdc } from "@/lib/utils";
import {
  buildProtectionMetricsV1,
  findProtectionMetric,
  type AgentAccount,
} from "@x402warden/sdk";
import type { PaymentWithPda } from "@/hooks/usePayments";
import { SolarIcon } from "@/components/ui/icon";

interface AgentStatsProps {
  agent: AgentAccount;
  payments?: PaymentWithPda[];
}

export function AgentStats({ payments = [] }: AgentStatsProps) {
  const protection = useMemo(
    () => buildProtectionMetricsV1({ payments }),
    [payments]
  );
  const blockedMetric = findProtectionMetric(protection, "usdc_blocked");
  const blockedUnavailable = blockedMetric?.status === "unavailable";

  const stats = [
    {
      label: "USDC protected",
      value: `$${lamportsToUsdc(new BN(protection.amounts.usdcProtected))}`,
      detail: `${protection.counts.paymentEscrows} escrowed payment${protection.counts.paymentEscrows === 1 ? "" : "s"}`,
      iconName: "shield",
      color: "text-warden-lichen",
      bgColor: "bg-warden-lichen/8",
      borderColor: "border-warden-lichen/15",
    },
    {
      label: "USDC blocked",
      value: blockedUnavailable
        ? "Unavailable"
        : `$${lamportsToUsdc(new BN(protection.amounts.usdcBlocked))}`,
      detail:
        blockedMetric?.status === "available"
          ? `${protection.counts.blockedReceipts} signed receipt${protection.counts.blockedReceipts === 1 ? "" : "s"}`
          : "No signed block receipts yet",
      iconName: "shield-off",
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/5",
      borderColor: "border-warden-soul/10",
    },
    {
      label: "USDC recovered",
      value: `$${lamportsToUsdc(new BN(protection.amounts.usdcRecovered))}`,
      detail: `${protection.counts.recoveredEscrows} refunded escrow${protection.counts.recoveredEscrows === 1 ? "" : "s"}`,
      iconName: "alert-triangle",
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/5",
      borderColor: "border-warden-soul/10",
    },
    {
      label: "Active escrow",
      value: protection.counts.activeEscrows.toString(),
      detail: `$${lamportsToUsdc(new BN(protection.amounts.activeEscrow))} pending/disputed`,
      iconName: "lock",
      color: "text-warden-bone",
      bgColor: "bg-warden-bone/6",
      borderColor: "border-warden-bone/12",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <Card key={s.label} className={`animate-fade-in-up-${i + 1}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`relative h-11 w-11 rounded-lg ${s.bgColor} border ${s.borderColor} flex items-center justify-center`}>
                <SolarIcon name={s.iconName} size={20} className={s.color} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{s.label}</p>
                <p className="text-xl font-display font-bold tracking-tight mt-0.5">{s.value}</p>
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">{s.detail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
