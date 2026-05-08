"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Shield, Zap, Lock, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) router.push("/agents");
  }, [connected, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">x402warden</span>
        </div>
        <ConnectButton />
      </nav>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Built on Solana x402
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Security smart account for{" "}
            <span className="text-primary">AI agents</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Set spending policies, manage merchant allowlists, escrow payments,
            and resolve disputes — all on-chain with x402 protocol guardrails.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <ConnectButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-xl border bg-card/50">
              <Lock className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Spending Policies</h3>
              <p className="text-sm text-muted-foreground">
                Per-call limits, period budgets, and merchant allowlists to
                keep your AI agent under control.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card/50">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Escrow Protection</h3>
              <p className="text-sm text-muted-foreground">
                Every payment is held in escrow with a configurable dispute
                window before settlement.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card/50">
              <ArrowRight className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Dispute Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Open disputes, merchant accept/contest flow, and automatic
                refunds for unresponsive merchants.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 px-6 py-4 text-center text-xs text-muted-foreground">
        x402warden &middot; DEV3PACK Hackathon 2025
      </footer>
    </div>
  );
}
