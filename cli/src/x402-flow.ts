import * as crypto from "crypto";

export interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
}

function parseRequiredMicroUsdc(value: unknown): number {
  const raw = String(value ?? "0");
  if (!/^\d+$/.test(raw)) {
    throw new Error("Invalid 402 response: maxAmountRequired must be a non-negative integer");
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Invalid 402 response: maxAmountRequired exceeds safe integer range");
  }
  return parsed;
}

export function parse402Response(body: any): Parsed402 {
  const accepts = body?.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("Invalid 402 response: missing accepts array");
  }
  const req = accepts[0];
  return {
    price: parseRequiredMicroUsdc(req.maxAmountRequired),
    payTo: req.payTo || "",
    network: req.network || "",
    description: req.description || "",
  };
}

export function buildPaymentHeader(txSignature: string): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { signature: txSignature },
  });
}

export function generateRequestHash(url: string, method: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(`${method}:${url}`);
  return Array.from(hash.digest());
}

export function generateRequestHashHex(url: string, method: string): string {
  return crypto.createHash("sha256").update(`${method}:${url}`).digest("hex");
}

export function hashJson(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value ?? null))
    .digest("hex");
}
