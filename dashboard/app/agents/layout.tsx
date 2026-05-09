"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import Image from "next/image";
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
      <nav className="relative px-6 py-3.5 flex items-center justify-between sticky top-0 lumina-header z-50">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="x402warden" width={24} height={24} />
          <span className="text-base font-normal text-white">x402warden</span>
        </Link>
        <ConnectButton />
      </nav>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full relative z-10">
        {children}
      </main>
    </div>
  );
}
