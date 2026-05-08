import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import BN from "bn.js";

const MAX_SAFE = new BN(Number.MAX_SAFE_INTEGER);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function bnToNumber(bn: BN): number {
  if (bn.gt(MAX_SAFE)) return Number.MAX_SAFE_INTEGER;
  return bn.toNumber();
}

export function lamportsToUsdc(amount: BN): string {
  if (amount.gt(MAX_SAFE)) return "unlimited";
  const val = amount.toNumber() / 1_000_000;
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export function formatTimestamp(ts: BN | number): string {
  const seconds = typeof ts === "number" ? ts : (ts.gt(MAX_SAFE) ? 0 : ts.toNumber());
  if (seconds === 0) return "—";
  return new Date(seconds * 1000).toLocaleString();
}

export function getPaymentStateKey(state: Record<string, object>): string {
  return Object.keys(state)[0] || "unknown";
}

export function getDisputeStateKey(state: Record<string, object>): string {
  return Object.keys(state)[0] || "unknown";
}
