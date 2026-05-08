"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { shortenAddress, formatTimestamp, getDisputeStateKey, bnToNumber } from "@/lib/utils";
import type { DisputeWithPda } from "@/hooks/useDisputes";
import { REASON_NO_RESPONSE, REASON_BAD_RESPONSE, REASON_TIMEOUT, REASON_OTHER } from "@x402warden/sdk";
import { Clock, FileWarning, User } from "lucide-react";

function reasonLabel(code: number): string {
  switch (code) {
    case REASON_NO_RESPONSE:
      return "No Response";
    case REASON_BAD_RESPONSE:
      return "Bad Response";
    case REASON_TIMEOUT:
      return "Timeout";
    case REASON_OTHER:
      return "Other";
    default:
      return `Code ${code}`;
  }
}

function stateVariant(state: string) {
  switch (state) {
    case "open":
      return "warning" as const;
    case "merchantAccepted":
      return "success" as const;
    case "merchantContested":
      return "destructive" as const;
    case "autoRefunded":
      return "success" as const;
    case "resolved":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function stateLabel(state: string): string {
  switch (state) {
    case "open":
      return "Open";
    case "merchantAccepted":
      return "Merchant Accepted";
    case "merchantContested":
      return "Merchant Contested";
    case "autoRefunded":
      return "Auto-Refunded";
    case "resolved":
      return "Resolved";
    default:
      return state;
  }
}

interface DisputeCardProps {
  dispute: DisputeWithPda;
}

export function DisputeCard({ dispute }: DisputeCardProps) {
  const { account } = dispute;
  const state = getDisputeStateKey(account.state);
  const deadlineTs = bnToNumber(account.merchantResponseDeadline);
  const now = Date.now() / 1000;
  const deadlinePassed = now > deadlineTs;

  const reasonUri = new TextDecoder().decode(
    new Uint8Array(account.reasonUri.filter((b) => b !== 0))
  );

  return (
    <Card className="border-l-4 border-l-destructive/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base">
            Dispute
          </CardTitle>
        </div>
        <Badge variant={stateVariant(state)}>
          {stateLabel(state)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Reason</p>
            <p className="font-medium">{reasonLabel(account.reasonCode)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Resolution</p>
            <p className="font-medium">
              {account.resolution === 0 ? "Pending" : account.resolution === 1 ? "Full Refund" : "Merchant Wins"}
            </p>
          </div>
        </div>

        {reasonUri && (
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Details</p>
            <p className="font-mono text-xs break-all">{reasonUri}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Opened: {formatTimestamp(account.openedAt)}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Opener: {shortenAddress(account.opener.toBase58())}
          </div>
        </div>

        {state === "open" && (
          <div className={`text-xs px-3 py-2 rounded-md ${deadlinePassed ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
            Merchant deadline: {formatTimestamp(account.merchantResponseDeadline)}
            {deadlinePassed && " (expired - eligible for auto-refund)"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
