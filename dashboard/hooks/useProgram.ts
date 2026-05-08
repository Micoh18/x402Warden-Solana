"use client";

import { useMemo } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { X402WardenClient } from "@x402warden/sdk";

export function useProgram(): X402WardenClient | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return new X402WardenClient({ connection, wallet: wallet as any });
  }, [connection, wallet]);
}
