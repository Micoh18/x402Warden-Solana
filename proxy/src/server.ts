import * as http from "http";
import * as net from "net";
import { PublicKey } from "@solana/web3.js";
import { X402WardenClient } from "@x402warden/sdk";
import { interceptRequest } from "./interceptor";
import { log, errorLog } from "./logger";

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function extractHeaders(raw: http.IncomingHttpHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.join(", ");
    }
  }
  return result;
}

function resolveTargetUrl(req: http.IncomingMessage): string | null {
  const targetHeader = req.headers["x-target-url"] as string | undefined;
  if (targetHeader) {
    return targetHeader;
  }

  const url = req.url || "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return null;
}

export function createProxyServer(
  client: X402WardenClient,
  agentPda: PublicKey,
  usdcMint: PublicKey
): http.Server {
  const server = http.createServer(async (req, res) => {
    const targetUrl = resolveTargetUrl(req);

    if (!targetUrl) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({
        error: "No target URL. Use absolute URL or X-TARGET-URL header.",
      }));
      return;
    }

    const method = req.method || "GET";
    log("INFO", `${method} ${targetUrl}`);

    try {
      const body = await readBody(req);
      const headers = extractHeaders(req.headers);

      const result = await interceptRequest(
        targetUrl,
        method,
        headers,
        body.length > 0 ? body : undefined,
        client,
        agentPda,
        usdcMint
      );

      const outHeaders = { ...result.headers };
      delete outHeaders["transfer-encoding"];

      if (result.paymentMade) {
        outHeaders["x-x402warden-payment"] = "true";
        if (result.txSignature) {
          outHeaders["x-x402warden-tx"] = result.txSignature;
        }
        if (result.amountPaid !== undefined) {
          outHeaders["x-x402warden-amount"] = String(result.amountPaid);
        }
      }

      res.writeHead(result.statusCode, outHeaders);
      res.end(result.body);
    } catch (err) {
      errorLog(targetUrl, err);
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Proxy error" }));
    }
  });

  server.on("connect", (req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
    const [host, port] = (req.url || "").split(":");
    const targetPort = parseInt(port || "443", 10);

    log("INFO", `CONNECT tunnel to ${host}:${targetPort}`);

    const serverSocket = net.connect(targetPort, host, () => {
      clientSocket.write(
        "HTTP/1.1 200 Connection Established\r\n\r\n"
      );
      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);
    });

    serverSocket.on("error", (err) => {
      errorLog(`${host}:${targetPort}`, err);
      clientSocket.end();
    });

    clientSocket.on("error", () => {
      serverSocket.end();
    });
  });

  return server;
}
