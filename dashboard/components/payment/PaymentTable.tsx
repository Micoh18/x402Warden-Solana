"use client";

import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisputeButton } from "./DisputeButton";
import { SettleButton } from "./SettleButton";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { shortenAddress, lamportsToUsdc, formatTimestamp, getPaymentStateKey } from "@/lib/utils";
import type { PaymentWithPda } from "@/hooks/usePayments";
import { PublicKey } from "@solana/web3.js";
import { bnToNumber } from "@/lib/utils";
import {
  buildMerchantRiskProfile,
  type MerchantRiskLevel,
  type MerchantRiskProfile,
} from "@x402warden/sdk";

interface PaymentTableProps {
  payments: PaymentWithPda[];
  agentPda: PublicKey;
}

function stateVariant(state: string) {
  switch (state) {
    case "pending":
      return "warning" as const;
    case "disputed":
      return "destructive" as const;
    case "settled":
      return "success" as const;
    case "refunded":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function riskVariant(level: MerchantRiskLevel) {
  switch (level) {
    case "low":
      return "success" as const;
    case "medium":
      return "warning" as const;
    case "high":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function riskDetail(profile: MerchantRiskProfile): string {
  if (profile.paymentCount < 3) {
    return `${profile.paymentCount} sample${profile.paymentCount === 1 ? "" : "s"}`;
  }
  return `${formatRate(profile.disputeRate)} disputed`;
}

export function PaymentTable({ payments, agentPda }: PaymentTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithPda | null>(null);
  const sorted = [...payments].sort(
    (a, b) => bnToNumber(b.account.paymentId) - bnToNumber(a.account.paymentId)
  );
  const merchantRiskByAddress = useMemo(() => {
    const profiles = new Map<string, MerchantRiskProfile>();
    for (const payment of payments) {
      const merchant = payment.account.merchant.toBase58();
      if (!profiles.has(merchant)) {
        profiles.set(
          merchant,
          buildMerchantRiskProfile({
            merchant,
            payments,
          })
        );
      }
    }
    return profiles;
  }, [payments]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-base font-display">No payments yet</p>
        <p className="text-xs mt-1.5 font-mono tracking-wide opacity-60">Payments will appear here when the agent makes x402 calls</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Settle After</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const state = getPaymentStateKey(p.account.state);
            const merchant = p.account.merchant.toBase58();
            const riskProfile = merchantRiskByAddress.get(merchant);
            const now = Date.now() / 1000;
            const settleAfter = bnToNumber(p.account.settleAfter);
            const canDispute = state === "pending" && now < settleAfter;
            const canSettle = state === "pending" && now >= settleAfter;

            return (
              <TableRow key={p.publicKey.toBase58()}>
                <TableCell className="font-mono">#{bnToNumber(p.account.paymentId)}</TableCell>
                <TableCell className="font-mono text-xs">
                  {shortenAddress(merchant, 6)}
                </TableCell>
                <TableCell>
                  {riskProfile && (
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={riskVariant(riskProfile.riskLevel)}>
                        {riskProfile.riskLevel}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground/70">
                        {riskDetail(riskProfile)}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-semibold">
                  ${lamportsToUsdc(p.account.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={stateVariant(state)}>
                    {state}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTimestamp(p.account.createdAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTimestamp(p.account.settleAfter)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPayment(p)}
                      title="View payment receipt"
                    >
                      <ReceiptText className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">View receipt</span>
                    </Button>
                    {canDispute && (
                      <DisputeButton agentPda={agentPda} escrowPda={p.publicKey} />
                    )}
                    {canSettle && (
                      <SettleButton escrowPda={p.publicKey} merchant={p.account.merchant} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <PaymentReceiptModal
        payment={selectedPayment}
        open={selectedPayment != null}
        onOpenChange={(open) => {
          if (!open) setSelectedPayment(null);
        }}
      />
    </>
  );
}
