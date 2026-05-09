"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ParticleField } from "@/components/ui/particle-field";
import { Shield, ArrowRight, ArrowDown } from "lucide-react";

export default function LandingPage() {
  const { connected } = useWallet();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-warden-black">
      <div className="absolute inset-0 z-0">
        <ParticleField color="86, 255, 232" particleCount={60} speed={0.15} className="opacity-30" />
      </div>

      <nav className="relative z-10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Shield className="h-6 w-6 text-warden-soul-light" />
            <div className="absolute inset-0 blur-md bg-warden-soul-light/20 rounded-full" />
          </div>
          <span className="text-base font-normal text-white">
            x402warden
          </span>
        </div>

        {connected ? (
          <Link href="/agents">
            <button className="px-6 py-2 text-xs font-medium tracking-wide rounded-full border text-gray-300 transition-all duration-200 hover:text-white hover:border-white/20"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              Dashboard
            </button>
          </Link>
        ) : (
          <ConnectButton />
        )}
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="animate-fade-in-up-1 text-[clamp(48px,8vw,88px)] font-semibold tracking-[-0.025em] leading-[1] mb-8">
            <span className="text-white">Secure Smart Accounts</span>
            <br />
            <span className="text-white">That Guard </span>
            <span className="italic text-warden-soul-light">Your Agents.</span>
          </h1>

          <p className="animate-fade-in-up-2 text-lg text-gray-400 font-medium mb-12 max-w-2xl mx-auto leading-7">
            Set spending policies, manage merchant allowlists, escrow every
            payment, and resolve disputes — all on-chain with Solana x402.
          </p>

          <div className="animate-fade-in-up-3 flex justify-center mb-32">
            {connected ? (
              <Link href="/agents">
                <button className="inline-flex items-center gap-2 px-6 py-3 text-base font-normal rounded-full text-white transition-all duration-200 hover:shadow-[0_0_15px_rgba(86,255,232,0.3)]"
                  style={{
                    background: "#0A3135",
                    border: "1px solid rgba(86, 255, 232, 0.35)",
                  }}>
                  <ArrowDown className="h-4 w-4" />
                  Go to Dashboard
                </button>
              </Link>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 h-[40vh] z-[2] pointer-events-none overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 rotate-[-3deg]"
          style={{ bottom: "-130vh", width: "200vw", height: "150vh" }}>
          <div className="absolute inset-0 rounded-[50%]"
            style={{
              border: "2px solid #56FFE8",
              boxShadow: "0 0 15px 2px rgba(86,255,232,0.5), 0 0 60px 5px rgba(86,255,232,0.15), inset 0 0 15px 2px rgba(86,255,232,0.08)",
            }} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 rotate-[2deg]"
          style={{ bottom: "-135vh", width: "220vw", height: "155vh" }}>
          <div className="absolute inset-0 rounded-[50%]"
            style={{
              border: "1.5px solid rgba(86,255,232,0.5)",
              boxShadow: "0 0 12px 1px rgba(86,255,232,0.35), 0 0 50px 3px rgba(86,255,232,0.1)",
            }} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 rotate-[-1deg]"
          style={{ bottom: "-140vh", width: "240vw", height: "160vh" }}>
          <div className="absolute inset-0 rounded-[50%]"
            style={{
              border: "1px solid rgba(86,255,232,0.3)",
              boxShadow: "0 0 10px 1px rgba(86,255,232,0.15)",
            }} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 rotate-[1.5deg]"
          style={{ bottom: "-145vh", width: "260vw", height: "165vh" }}>
          <div className="absolute inset-0 rounded-[50%]"
            style={{
              border: "1px solid rgba(86,255,232,0.15)",
              boxShadow: "0 0 8px rgba(86,255,232,0.06)",
            }} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-full"
          style={{
            background: "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(86,255,232,0.05) 0%, transparent 50%)",
          }} />
      </div>

      <footer className="relative z-10 px-6 py-6 flex flex-col items-center gap-2">
        <span className="text-xs text-gray-500 tracking-wide">Scroll to Explore</span>
        <ArrowDown className="h-4 w-4 text-gray-600 animate-bounce" />
      </footer>
    </div>
  );
}
