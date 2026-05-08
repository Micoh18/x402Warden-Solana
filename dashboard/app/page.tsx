"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Shield, Zap, Lock, ArrowRight, Hexagon, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(122,155,142,0.08)_0%,_rgba(74,101,96,0.03)_40%,_transparent_70%)]" />
      </div>

      <nav className="relative z-10 px-6 py-4 flex items-center justify-between lumina-header">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Shield className="h-7 w-7 text-warden-lichen" />
            <div className="absolute inset-0 blur-md bg-warden-lichen/25 rounded-full" />
          </div>
          <span className="font-display font-bold text-lg tracking-wider text-warden-bone text-glow-primary">
            x402warden
          </span>
        </div>
        <ConnectButton />
      </nav>

      <main className="flex-1 flex items-center justify-center relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-warden-lichen/25 bg-warden-moss/15 text-warden-bone text-sm font-mono font-medium mb-10 tracking-widest uppercase">
            <Zap className="h-3.5 w-3.5 text-warden-soul" />
            Solana x402 Protocol
          </div>

          <h1 className="animate-fade-in-up-1 text-5xl md:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1]">
            <span className="text-foreground">Security for</span>
            <br />
            <span className="shimmer-text">AI Agents</span>
          </h1>

          <p className="animate-fade-in-up-2 text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Smart accounts with spending policies, merchant allowlists,
            escrow payments, and dispute resolution — all on-chain.
          </p>

          <div className="animate-fade-in-up-3 flex flex-col sm:flex-row gap-4 justify-center mb-20">
            {connected ? (
              <Link href="/agents">
                <Button size="lg" className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <ConnectButton />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <div className="animate-fade-in-up-2 group relative p-6 rounded-xl border border-warden-bone-dark/40 bg-warden-black/80 noise border-glow-hover transition-all duration-300">
              <div className="relative h-11 w-11 rounded-lg bg-warden-lichen/8 border border-warden-lichen/20 flex items-center justify-center mb-4 transition-all duration-300">
                <Lock className="h-5 w-5 text-warden-lichen" />
                <div className="absolute inset-0 blur-lg bg-warden-lichen/0 group-hover:bg-warden-lichen/10 rounded-lg transition-all duration-500" />
              </div>
              <h3 className="font-display font-semibold text-sm tracking-wide mb-2">Spending Policies</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Per-call limits, period budgets, and merchant allowlists to
                keep your AI agent under control.
              </p>
            </div>
            <div className="animate-fade-in-up-3 group relative p-6 rounded-xl border border-warden-bone-dark/40 bg-warden-black/80 noise border-glow-hover transition-all duration-300">
              <div className="relative h-11 w-11 rounded-lg bg-warden-soul/5 border border-warden-soul/15 flex items-center justify-center mb-4 transition-all duration-300">
                <Fingerprint className="h-5 w-5 text-warden-soul" />
                <div className="absolute inset-0 blur-lg bg-warden-soul/0 group-hover:bg-warden-soul/10 rounded-lg transition-all duration-500" />
              </div>
              <h3 className="font-display font-semibold text-sm tracking-wide mb-2">Escrow Protection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every payment is held in escrow with a configurable dispute
                window before settlement.
              </p>
            </div>
            <div className="animate-fade-in-up-4 group relative p-6 rounded-xl border border-warden-bone-dark/40 bg-warden-black/80 noise border-glow-hover transition-all duration-300">
              <div className="relative h-11 w-11 rounded-lg bg-warden-moss/15 border border-warden-moss/25 flex items-center justify-center mb-4 transition-all duration-300">
                <Hexagon className="h-5 w-5 text-warden-bone" />
                <div className="absolute inset-0 blur-lg bg-warden-moss/0 group-hover:bg-warden-moss/10 rounded-lg transition-all duration-500" />
              </div>
              <h3 className="font-display font-semibold text-sm tracking-wide mb-2">Dispute Resolution</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Open disputes, merchant accept/contest flow, and automatic
                refunds for unresponsive merchants.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/20 px-6 py-5 text-center">
        <span className="text-xs text-muted-foreground/60 font-mono tracking-widest uppercase">
          x402warden &middot; DEV3PACK 2025
        </span>
      </footer>
    </div>
  );
}
