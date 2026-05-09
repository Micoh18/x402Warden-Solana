function timestamp(): string {
  return new Date().toISOString();
}

export function log(level: string, msg: string, data?: Record<string, unknown>): void {
  const parts = [`[${timestamp()}] [${level}] ${msg}`];
  if (data) {
    parts.push(JSON.stringify(data));
  }
  process.stderr.write(parts.join(" ") + "\n");
}

export function paymentLog(url: string, amount: number, txSig: string, duration: number): void {
  log("PAYMENT", `${url} | ${amount} lamports | ${txSig.slice(0, 16)}... | ${duration}ms`);
}

export function errorLog(url: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  log("ERROR", `${url} | ${msg}`);
}
