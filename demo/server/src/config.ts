/**
 * Demo server configuration.
 *
 * Uses a well-known Solana devnet address as the default merchant wallet.
 * Set MOCK_MODE=true (the default) to skip on-chain verification during
 * development — any request that includes an X-PAYMENT header will be
 * accepted as paid.
 */

export const PORT = parseInt(process.env.PORT || "3001", 10);

export const MERCHANT_ADDRESS =
  process.env.MERCHANT_ADDRESS || "5kDVFXmiZFdnAwm8p58BSR8Qourwp9nDeDxiefsaZnjU";

export const NETWORK = "solana-devnet";

export const MOCK_MODE =
  (process.env.MOCK_MODE ?? "true").toLowerCase() === "true";
