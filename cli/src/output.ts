export function success(data: Record<string, unknown>): never {
  console.log(JSON.stringify({ status: "ok", ...data }));
  process.exit(0);
}

export function paid(data: Record<string, unknown>): never {
  console.log(JSON.stringify({ status: "paid", ...data }));
  process.exit(0);
}

export function policyBlock(msg: string): never {
  console.error(JSON.stringify({ status: "blocked", error: msg }));
  process.exit(1);
}

export function error(msg: string): never {
  console.error(JSON.stringify({ status: "error", error: msg }));
  process.exit(2);
}
