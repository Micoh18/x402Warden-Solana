import * as crypto from "crypto";

export interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
}

export function parse402Response(body: any): Parsed402 {
  const accepts = body?.accepts;
  if (!Array.isArray(accepts) || accepts.length === 0) {
    throw new Error("Invalid 402 response: missing accepts array");
  }
  const req = accepts[0];
  return {
    price: parseInt(req.maxAmountRequired || "0", 10),
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
