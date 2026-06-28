"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ReceiptText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useProgram } from "@/hooks/useProgram";
import type { PaymentWithPda } from "@/hooks/usePayments";
import {
  buildPaymentReceiptV1,
  findPaymentEvidencePda,
  type PaymentEvidenceAccount,
} from "@x402warden/sdk";
import {
  formatTimestamp,
  lamportsToUsdc,
  shortenAddress,
} from "@/lib/utils";

interface PaymentReceiptModalProps {
  payment: PaymentWithPda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isMissingPaymentEvidenceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /account (does not exist|not found)|could not find account|AccountNotFound/i.test(message);
}

export function PaymentReceiptModal({
  payment,
  open,
  onOpenChange,
}: PaymentReceiptModalProps) {
  const client = useProgram();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const paymentEvidencePda = useMemo(() => {
    if (!client || !payment) return null;
    return findPaymentEvidencePda(payment.publicKey, client.programId)[0];
  }, [client, payment]);

  const {
    data: paymentEvidence,
    isFetching: evidenceLoading,
    isError: evidenceError,
  } = useQuery<PaymentEvidenceAccount | null>({
    queryKey: [
      "payment-evidence",
      payment?.publicKey.toBase58(),
      client?.programId.toBase58(),
    ],
    queryFn: async () => {
      if (!client || !paymentEvidencePda) return null;
      try {
        return await client.getPaymentEvidence(paymentEvidencePda);
      } catch (error) {
        if (isMissingPaymentEvidenceError(error)) return null;
        throw error;
      }
    },
    enabled: open && Boolean(client && paymentEvidencePda),
    retry: (failureCount, error) =>
      !isMissingPaymentEvidenceError(error) && failureCount < 2,
    staleTime: 10_000,
  });

  const receipt = useMemo(() => {
    if (!payment) return null;

    return buildPaymentReceiptV1({
      paymentEscrow: payment.publicKey,
      account: payment.account,
      paymentEvidence: paymentEvidence ?? undefined,
    });
  }, [payment, paymentEvidence]);

  if (!open || !payment || !receipt) return null;

  const state = receipt.state;
  const explorerUrl = `https://explorer.solana.com/address/${payment.publicKey.toBase58()}?cluster=devnet`;
  const receiptJson = JSON.stringify(receipt, null, 2);
  const evidenceLabel = evidenceLoading
    ? "checking"
    : paymentEvidence
      ? "on-chain"
      : evidenceError
        ? "lookup failed"
        : "not recorded";
  const evidenceVariant = paymentEvidence
    ? "success"
    : evidenceError
      ? "destructive"
      : evidenceLoading
        ? "warning"
        : "secondary";
  const deliverySummary = receipt.deliveryEvidence?.failureCode
    ? `failed: ${receipt.deliveryEvidence.failureCode}`
    : receipt.deliveryEvidence
      ? "recorded"
      : "escrow-only";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-receipt-title"
      onMouseDown={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-warden-bone/15 bg-background shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-warden-bone/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md border border-primary/30 bg-primary/10 p-2 text-primary">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="payment-receipt-title" className="font-display text-lg text-white">
                Payment receipt
              </h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                #{receipt.paymentId} - {shortenAddress(receipt.paymentEscrow, 6)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close receipt"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid gap-4 px-5 py-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="rounded-md border border-warden-bone/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Lifecycle</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-white">{receipt.state}</span>
                <Badge variant={state === "settled" ? "success" : state === "disputed" ? "destructive" : "warning"}>
                  {state}
                </Badge>
              </div>
            </div>

            <div className="rounded-md border border-warden-bone/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Value</p>
              <p className="mt-3 text-2xl font-semibold text-white">
                ${lamportsToUsdc(payment.account.amount)}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Protected in escrow until {formatTimestamp(payment.account.settleAfter)}
              </p>
            </div>

            <div className="rounded-md border border-warden-bone/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Evidence</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-white">{deliverySummary}</span>
                <Badge variant={evidenceVariant}>{evidenceLabel}</Badge>
              </div>
              <dl className="mt-3 space-y-2 font-mono text-xs">
                {paymentEvidencePda && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">PDA</dt>
                    <dd className="text-white">{shortenAddress(paymentEvidencePda.toBase58(), 6)}</dd>
                  </div>
                )}
                {receipt.deliveryEvidence?.statusCode && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">HTTP</dt>
                    <dd className="text-white">{receipt.deliveryEvidence.statusCode}</dd>
                  </div>
                )}
                {receipt.deliveryEvidence?.source && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Source</dt>
                    <dd className="text-white">{receipt.deliveryEvidence.source}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-md border border-warden-bone/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Parties</p>
              <dl className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Agent</dt>
                  <dd className="text-white">{shortenAddress(receipt.agentPda, 6)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd className="text-white">{shortenAddress(receipt.merchant, 6)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-white">{formatTimestamp(payment.account.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="min-w-0 rounded-md border border-warden-bone/10 bg-black/30">
            <div className="flex items-center justify-between border-b border-warden-bone/10 px-4 py-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Receipt JSON
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                  title="Open escrow on Solana Explorer"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <CopyButton text={receiptJson} />
              </div>
            </div>
            <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed text-warden-bone">
              {receiptJson}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
