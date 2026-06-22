"use client";

import { useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { Card, CardContent } from "@/components/ui/card";
import { lamportsToUsdc, bnToNumber, getPaymentStateKey } from "@/lib/utils";
import type { AgentAccount } from "@x402warden/sdk";
import type { PaymentWithPda } from "@/hooks/usePayments";
import { SolarIcon } from "@/components/ui/icon";

interface AgentStatsProps {
  agent: AgentAccount;
  payments?: PaymentWithPda[];
}

const BLOCKED_USDC_STORAGE_KEY = "x402warden.demo.usdcBlocked";

export function AgentStats({ agent, payments = [] }: AgentStatsProps) {
  const [blockedAmount, setBlockedAmount] = useState(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(BLOCKED_USDC_STORAGE_KEY);
    const parsed = raw == null ? 0 : Number(raw);
    setBlockedAmount(Number.isFinite(parsed) ? parsed : 0);
  }, []);

  const protectedAmount = useMemo(
    () =>
      payments.reduce(
        (total, payment) => total.add(payment.account.amount),
        new BN(0)
      ),
    [payments]
  );

  const activeEscrow = useMemo(() => {
    const active = payments.filter((payment) => {
      const state = getPaymentStateKey(payment.account.state);
      return state === "pending" || state === "disputed";
    });
    return {
      count: active.length,
      amount: active.reduce(
        (total, payment) => total.add(payment.account.amount),
        new BN(0)
      ),
    };
  }, [payments]);

  const stats = [
    {
      label: "USDC protected",
      value: `$${lamportsToUsdc(protectedAmount)}`,
      detail: `${payments.length} escrowed payment${payments.length === 1 ? "" : "s"}`,
      iconName: "shield",
      color: "text-warden-lichen",
      bgColor: "bg-warden-lichen/8",
      borderColor: "border-warden-lichen/15",
    },
    {
      label: "USDC blocked",
      value: `$${blockedAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })}`,
      detail: "Demo/local metric",
      iconName: "shield-off",
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/5",
      borderColor: "border-warden-soul/10",
    },
    {
      label: "USDC recovered",
      value: `$${lamportsToUsdc(agent.totalDisputedLifetime)}`,
      detail: "Disputed lifetime proxy",
      iconName: "alert-triangle",
      color: "text-warden-soul",
      bgColor: "bg-warden-soul/5",
      borderColor: "border-warden-soul/10",
    },
    {
      label: "Active escrow",
      value: bnToNumber(new BN(activeEscrow.count)).toString(),
      detail: `$${lamportsToUsdc(activeEscrow.amount)} pending/disputed`,
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
