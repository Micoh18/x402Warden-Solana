"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) router.push("/");
  }, [connected, router]);

  if (!connected) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border/50 px-6 py-3 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <Link href="/agents" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">x402warden</span>
        </Link>
        <ConnectButton />
      </nav>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
