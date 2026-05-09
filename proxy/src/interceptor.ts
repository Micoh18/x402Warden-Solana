import { PublicKey } from "@solana/web3.js";
import { X402WardenClient } from "@x402warden/sdk";
import * as crypto from "crypto";
import { paymentLog, errorLog, log } from "./logger";

export interface InterceptResult {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
  paymentMade: boolean;
  txSignature?: string;
  amountPaid?: number;
}

interface Parsed402 {
  price: number;
  payTo: string;
  network: string;
  description: string;
}

function parse402Body(body: Buffer): Parsed402 {
  const json = JSON.parse(body.toString("utf-8"));
  const accepts = json?.accepts;
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

function generateRequestHash(url: string, method: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(`${method}:${url}`);
  return Array.from(hash.digest());
}

function buildPaymentHeader(txSignature: string): string {
  return JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { signature: txSignature },
  });
}

function extractHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

let paymentLock = Promise.resolve();

function withPaymentLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = paymentLock.then(fn);
  paymentLock = result.then(
    () => {},
    () => {}
  );
  return result;
}

export async function interceptRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
  client: X402WardenClient,
  agentPda: PublicKey,
  usdcMint: PublicKey
): Promise<InterceptResult> {
  const fetchOpts: RequestInit = {
    method,
    headers: { ...headers },
    body: method !== "GET" && method !== "HEAD" && body ? Uint8Array.from(body) : undefined,
  };

  delete (fetchOpts.headers as Record<string, string>)["host"];
  delete (fetchOpts.headers as Record<string, string>)["connection"];
  delete (fetchOpts.headers as Record<string, string>)["transfer-encoding"];

  let response: Response;
  try {
    response = await fetch(targetUrl, fetchOpts);
  } catch (err) {
    errorLog(targetUrl, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify({ error: "Bad Gateway", details: errMsg })),
      paymentMade: false,
    };
  }

  const responseBody = Buffer.from(await response.arrayBuffer());
  const responseHeaders = extractHeaders(response.headers);

  if (response.ok) {
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  if (response.status !== 402) {
    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  log("INFO", `402 received from ${targetUrl}, processing payment...`);

  let parsed: Parsed402;
  try {
    parsed = parse402Body(responseBody);
  } catch (err) {
    errorLog(targetUrl, `Failed to parse 402 body: ${err}`);
    return {
      statusCode: 402,
      headers: responseHeaders,
      body: responseBody,
      paymentMade: false,
    };
  }

  const startTime = Date.now();

  try {
    const txSignature = await withPaymentLock(async () => {
      const requestHash = generateRequestHash(targetUrl, method);
      const merchant = new PublicKey(parsed.payTo);

      const agentData = await client.getAgent(agentPda);
      const userTokenAccount = agentData.usdcTokenAccount;

      return client.processPayment(
        agentPda,
        parsed.price,
        merchant,
        requestHash,
        userTokenAccount,
        usdcMint
      );
    });

    const duration = Date.now() - startTime;
    paymentLog(targetUrl, parsed.price, txSignature, duration);

    const retryHeaders = {
      ...fetchOpts.headers as Record<string, string>,
      "X-PAYMENT": buildPaymentHeader(txSignature),
    };

    const retryResponse = await fetch(targetUrl, {
      method,
      headers: retryHeaders,
      body: method !== "GET" && method !== "HEAD" && body ? Uint8Array.from(body) : undefined,
    });

    const retryBody = Buffer.from(await retryResponse.arrayBuffer());
    const retryResponseHeaders = extractHeaders(retryResponse.headers);

    return {
      statusCode: retryResponse.status,
      headers: retryResponseHeaders,
      body: retryBody,
      paymentMade: true,
      txSignature,
      amountPaid: parsed.price,
    };
  } catch (err) {
    errorLog(targetUrl, err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: Buffer.from(
        JSON.stringify({ error: "Payment processing failed", details: errMsg })
      ),
      paymentMade: false,
    };
  }
}
