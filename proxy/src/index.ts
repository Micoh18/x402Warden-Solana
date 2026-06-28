#!/usr/bin/env node

import { X402WardenClient, findAgentAccountPda } from "@x402warden/sdk";
import { loadConfig } from "./config";
import { createProxyServer } from "./server";
import { log } from "./logger";

function parsePort(args: string[]): number {
  const idx = args.indexOf("--port");
  if (idx !== -1 && args[idx + 1]) {
    const p = parseInt(args[idx + 1], 10);
    if (!isNaN(p) && p > 0 && p < 65536) return p;
  }
  return 4020;
}

function main() {
  const port = parsePort(process.argv);

  const config = loadConfig();

  const client = new X402WardenClient({
    connection: config.connection,
    wallet: config.wallet,
    programId: config.programId,
  });

  const [agentPda] = findAgentAccountPda(
    config.wallet.publicKey,
    config.agentId,
    config.programId
  );

  const server = createProxyServer(client, agentPda, config.usdcMint, {
    signer: config.wallet.publicKey,
    secretKey: config.keypair.secretKey,
    agentId: config.agentId,
    ...config.protection,
  });

  server.listen(port, () => {
    const walletAddr = config.wallet.publicKey.toBase58();
    const banner = [
      "",
      `  x402warden proxy listening on port ${port}`,
      `    Wallet:  ${walletAddr}`,
      `    RPC:     ${config.connection.rpcEndpoint}`,
      `    Agent:   ${agentPda.toBase58()}`,
      `    Checks:  json=${config.protection.expectJson} nonEmpty=${config.protection.expectNonEmpty}`,
      `    Timeout: ${
        config.protection.timeoutMs != null
          ? `${config.protection.timeoutMs}ms`
          : "none"
      }`,
      `    Retries: ${config.protection.retries ?? 0}`,
      `    Auto dispute: ${config.protection.autoDisputeOnFail}`,
      `    On-chain evidence: ${config.protection.recordEvidenceOnChain}`,
      `    Require evidence: ${config.protection.requireEvidenceOnChain}`,
      "",
      "  Usage:",
      `    curl -x http://localhost:${port} http://target/api`,
      `    HTTP_PROXY=http://localhost:${port} your-agent`,
      "",
    ];
    process.stderr.write(banner.join("\n") + "\n");
  });

  server.on("error", (err) => {
    log("FATAL", `Server error: ${err.message}`);
    process.exit(1);
  });
}

main();
