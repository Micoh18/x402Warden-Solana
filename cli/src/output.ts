export function success(data: Record<string, unknown>): never {
  console.log(JSON.stringify({ status: "ok", ...data }));
  process.exit(0);
}

export function paid(data: Record<string, unknown>): never {
  console.log(JSON.stringify({ status: "paid", ...data }));
  process.exit(0);
}

export function policyBlock(
  reason: string,
  data: Record<string, unknown> = {}
): never {
  console.error(
    JSON.stringify({
      status: "blocked",
      blockedBy: "x402warden_payment_firewall",
      reason,
      ...data,
    })
  );
  process.exit(1);
}

export function protectionFailure(
  reason: string,
  data: Record<string, unknown> = {}
): never {
  console.error(
    JSON.stringify({
      status: "protection_failed",
      reason,
      ...data,
    })
  );
  process.exit(2);
}

export function error(msg: string): never {
  console.error(JSON.stringify({ status: "error", error: msg }));
  process.exit(2);
}
