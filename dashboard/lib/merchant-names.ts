const STORAGE_KEY = "x402warden:merchant-names";

function getAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getMerchantName(address: string): string | null {
  return getAll()[address] || null;
}

export function setMerchantName(address: string, name: string) {
  const all = getAll();
  all[address] = name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function removeMerchantName(address: string) {
  const all = getAll();
  delete all[address];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
