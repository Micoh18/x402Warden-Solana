import express from "express";
import cors from "cors";
import { PORT, MERCHANT_ADDRESS, NETWORK, MOCK_MODE } from "./config";
import apiRouter from "./routes/api";

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mockMode: MOCK_MODE,
  });
});

// ─── API routes ──────────────────────────────────────────────────────────────
app.use(apiRouter);

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("  x402warden Demo Merchant Server");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Port:      ${PORT}`);
  console.log(`  Network:   ${NETWORK}`);
  console.log(`  Merchant:  ${MERCHANT_ADDRESS}`);
  console.log(`  Mock mode: ${MOCK_MODE ? "ON (no on-chain verification)" : "OFF"}`);
  console.log("");
  console.log("  Endpoints:");
  console.log("    GET /health         — health check (free)");
  console.log("    GET /api/pricing    — pricing info (free)");
  console.log("    GET /api/research   — research data (5 USDC, paywalled)");
  console.log("    GET /api/broken     — broken endpoint (3 USDC, dispute test)");
  console.log("═══════════════════════════════════════════════════");
});
