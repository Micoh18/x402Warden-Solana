"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DisputeButton } from "./DisputeButton";
import { SettleButton } from "./SettleButton";
import { shortenAddress, lamportsToUsdc, formatTimestamp, getPaymentStateKey } from "@/lib/utils";
import type { PaymentWithPda } from "@/hooks/usePayments";
import { PublicKey } from "@solana/web3.js";
import { bnToNumber } from "@/lib/utils";

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

export function PaymentTable({ payments, agentPda }: PaymentTableProps) {
  const sorted = [...payments].sort(
    (a, b) => bnToNumber(b.account.paymentId) - bnToNumber(a.account.paymentId)
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-base font-display">No payments yet</p>
        <p className="text-xs mt-1.5 font-mono tracking-wide opacity-60">Payments will appear here when the agent makes x402 calls</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Merchant</TableHead>
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
          const now = Date.now() / 1000;
          const settleAfter = bnToNumber(p.account.settleAfter);
          const canDispute = state === "pending" && now < settleAfter;
          const canSettle = state === "pending" && now >= settleAfter;

          return (
            <TableRow key={p.publicKey.toBase58()}>
              <TableCell className="font-mono">#{bnToNumber(p.account.paymentId)}</TableCell>
              <TableCell className="font-mono text-xs">
                {shortenAddress(p.account.merchant.toBase58(), 6)}
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
              <TableCell className="text-right flex gap-2 justify-end">
                {canDispute && (
                  <DisputeButton agentPda={agentPda} escrowPda={p.publicKey} />
                )}
                {canSettle && (
                  <SettleButton escrowPda={p.publicKey} merchant={p.account.merchant} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
