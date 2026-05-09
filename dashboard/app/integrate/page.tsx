"use client";

import Link from "next/link";
import Image from "next/image";
import { SolarIcon } from "@/components/ui/icon";

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-gray-400 font-mono">
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 bg-black/40">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function InfoBox({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-warden-soul-light/20 bg-warden-soul-light/5 p-4">
      <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">{label}</span>
      <div className="mt-2 text-sm text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

export default function IntegratePage() {
  return (
    <div className="min-h-screen bg-warden-black text-white">
      <nav className="px-8 py-5 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="x402warden" width={24} height={24} />
          <span className="text-base font-normal">x402warden</span>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">
            Integrate with Your Agent
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            x402warden works with any AI agent, any language, any framework.
            Two integration paths: a <strong className="text-white">CLI</strong> your agent calls directly,
            or an <strong className="text-white">HTTP Proxy</strong> that handles payments transparently.
          </p>
        </div>

        {/* ── Prerequisites ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Prerequisites</h2>
          <p className="text-gray-400">Before integrating, you need a funded Solana wallet on devnet.</p>
          <ol className="list-decimal list-inside space-y-3 text-gray-300">
            <li>
              <strong className="text-white">SOL for transaction fees</strong> — Get free devnet SOL
              at <a href="https://faucet.solana.com" target="_blank" className="text-warden-soul-light hover:underline">faucet.solana.com</a>
            </li>
            <li>
              <strong className="text-white">USDC for payments</strong> — Get free devnet USDC
              at <a href="https://faucet.circle.com" target="_blank" className="text-warden-soul-light hover:underline">faucet.circle.com</a> (select Solana Devnet).
              This creates a <em>USDC token account</em> linked to your wallet.
            </li>
          </ol>

          <InfoBox label="What is a USDC Token Account?">
            On Solana, tokens like USDC live in separate &quot;token accounts&quot; associated with your wallet.
            When you request USDC from the Circle faucet, it automatically creates this account for you.
            Your wallet address holds SOL; the token account holds USDC. x402warden needs to know
            both to manage payments on your behalf.
          </InfoBox>
        </section>

        {/* ── Step 1: Setup ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Step 1 — Create Your Agent Account</h2>
          <p className="text-gray-400">
            An agent account is an on-chain smart account that enforces your spending rules.
            Create one by providing your USDC token account address.
          </p>

          <CodeBlock title="Terminal">
{`# Check your balances and USDC token account address
npx x402warden balance

# Create agent account (agent-id 0 is your first agent)
npx x402warden init --agent-id 0 --usdc-account <YOUR_USDC_TOKEN_ACCOUNT>`}
          </CodeBlock>

          <p className="text-sm text-gray-500">
            The <code className="text-gray-300">balance</code> command shows your USDC token account address.
            Copy it and use it in the <code className="text-gray-300">init</code> command.
          </p>
        </section>

        {/* ── Step 2: Configure policies ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Step 2 — Set Spending Policies</h2>
          <p className="text-gray-400">
            Policies define how much your agent can spend. All amounts are in
            USDC micro-units (1 USDC = 1,000,000 micro-units).
          </p>

          <CodeBlock title="Terminal">
{`npx x402warden policy \\
  --max-per-call 5000000 \\
  --max-per-period 50000000 \\
  --period-seconds 86400 \\
  --dispute-window 300`}
          </CodeBlock>

          <InfoBox label="What do the numbers mean?">
            <ul className="space-y-2 mt-1">
              <li><code className="text-warden-soul-light">--max-per-call 5000000</code> = max 5 USDC per individual payment</li>
              <li><code className="text-warden-soul-light">--max-per-period 50000000</code> = max 50 USDC total per period</li>
              <li><code className="text-warden-soul-light">--period-seconds 86400</code> = period resets every 24 hours (86,400 seconds)</li>
              <li><code className="text-warden-soul-light">--dispute-window 300</code> = 5-minute window (300 seconds) to dispute a payment before it settles</li>
            </ul>
          </InfoBox>

          <p className="text-sm text-gray-500">
            You can also configure policies from the{" "}
            <Link href="/agents" className="text-warden-soul-light hover:underline">Dashboard</Link>{" "}
            with a visual interface.
          </p>
        </section>

        {/* ── Path A: CLI ── */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">Integration Path A</span>
            <h2 className="text-2xl font-semibold mt-1">CLI — Direct Command</h2>
            <p className="text-gray-400 mt-2">
              Your agent calls <code className="text-gray-300">x402warden pay</code> as a subprocess.
              It handles the entire x402 flow: request, 402 detection, on-chain payment, retry.
              Returns JSON to stdout.
            </p>
          </div>

          <CodeBlock title="Any agent — shell out to CLI">
{`# Simple GET request to a paywalled service
npx x402warden pay https://api.example.com/research

# POST with body and headers
npx x402warden pay https://api.example.com/analyze \\
  --method POST \\
  --body '{"query": "Solana TVL trends"}' \\
  --headers '{"Content-Type": "application/json"}'

# Set a max amount you're willing to pay (in micro-USDC)
npx x402warden pay https://api.example.com/data --max-amount 10000000`}
          </CodeBlock>

          <p className="text-gray-400">The CLI returns JSON you can parse in any language:</p>

          <CodeBlock title="Response (stdout)">
{`{
  "status": "paid",
  "statusCode": 200,
  "txSignature": "4fW...ABCD",
  "amountPaid": 5000000,
  "body": { "data": "..." }
}`}
          </CodeBlock>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Use from any language:</p>

            <CodeBlock title="Python">
{`import subprocess, json

result = subprocess.run(
    ["npx", "x402warden", "pay", "https://api.example.com/research"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(data["body"])  # The actual API response`}
            </CodeBlock>

            <CodeBlock title="Node.js">
{`import { execSync } from "child_process";

const result = JSON.parse(
  execSync("npx x402warden pay https://api.example.com/research").toString()
);
console.log(result.body);`}
            </CodeBlock>
          </div>

          <InfoBox label="Exit codes">
            <ul className="space-y-1 mt-1">
              <li><code className="text-warden-soul-light">0</code> — Success (payment made or no payment needed)</li>
              <li><code className="text-warden-soul-light">1</code> — Payment blocked by your spending policy</li>
              <li><code className="text-warden-soul-light">2</code> — Error (network, config, insufficient funds)</li>
            </ul>
          </InfoBox>
        </section>

        {/* ── Path B: Proxy ── */}
        <section className="space-y-6">
          <div>
            <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">Integration Path B</span>
            <h2 className="text-2xl font-semibold mt-1">HTTP Proxy — Zero Code Changes</h2>
            <p className="text-gray-400 mt-2">
              Start a local proxy server. Point your agent&apos;s HTTP client to it.
              The proxy intercepts 402 responses, pays on-chain, retries with the payment header.
              Your agent doesn&apos;t know it&apos;s paying — it just gets the data.
            </p>
          </div>

          <CodeBlock title="Terminal 1 — Start the proxy">
{`npx x402warden-proxy --port 4020`}
          </CodeBlock>

          <CodeBlock title="Terminal 2 — Use it with curl">
{`# The proxy handles the 402 payment automatically
curl -x http://localhost:4020 http://api.example.com/research

# Works with any HTTP client
HTTP_PROXY=http://localhost:4020 curl http://api.example.com/data`}
          </CodeBlock>

          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Use from your agent code:</p>

            <CodeBlock title="Python (httpx)">
{`import httpx

# All requests through the proxy are x402-protected
client = httpx.Client(proxy="http://localhost:4020")
response = client.get("http://api.example.com/research")
print(response.json())  # Payment handled transparently`}
            </CodeBlock>

            <CodeBlock title="Node.js (fetch with proxy)">
{`// Set the environment variable before running your agent
// HTTP_PROXY=http://localhost:4020 node my-agent.js

const response = await fetch("http://api.example.com/research");
const data = await response.json();`}
            </CodeBlock>
          </div>

          <InfoBox label="HTTPS targets">
            For HTTPS services, use the gateway mode instead of the proxy mode.
            Send your request to <code className="text-warden-soul-light">http://localhost:4020</code> with
            a <code className="text-warden-soul-light">X-TARGET-URL</code> header pointing to the real endpoint.
          </InfoBox>
        </section>

        {/* ── Environment variables ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Configuration</h2>
          <p className="text-gray-400">
            Both CLI and Proxy read configuration from environment variables:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium">Variable</th>
                  <th className="text-left py-2 pr-4 text-gray-400 font-medium">Default</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-xs text-warden-soul-light">SOLANA_KEYPAIR_PATH</td>
                  <td className="py-2 pr-4 font-mono text-xs">~/.config/solana/id.json</td>
                  <td className="py-2 text-xs">Path to your Solana keypair file</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-xs text-warden-soul-light">SOLANA_RPC_URL</td>
                  <td className="py-2 pr-4 font-mono text-xs">devnet</td>
                  <td className="py-2 text-xs">Solana RPC endpoint</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4 font-mono text-xs text-warden-soul-light">AGENT_ID</td>
                  <td className="py-2 pr-4 font-mono text-xs">0</td>
                  <td className="py-2 text-xs">Which agent account to use (you can have multiple)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs text-warden-soul-light">USDC_MINT</td>
                  <td className="py-2 pr-4 font-mono text-xs">devnet USDC</td>
                  <td className="py-2 text-xs">USDC token mint address</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How x402 Payment Works</h2>
          <div className="rounded-lg border border-white/10 bg-black/40 p-6 font-mono text-sm text-gray-300 leading-loose">
            <div className="space-y-1">
              <p><span className="text-gray-500">1.</span> Your agent requests a service</p>
              <p><span className="text-gray-500">2.</span> Service returns <span className="text-amber-400">HTTP 402</span> with price + merchant address</p>
              <p><span className="text-gray-500">3.</span> x402warden checks your <span className="text-warden-soul-light">spending policy</span> on-chain</p>
              <p><span className="text-gray-500">4.</span> If allowed → USDC moves to <span className="text-warden-soul-light">escrow</span> (not directly to merchant)</p>
              <p><span className="text-gray-500">5.</span> Request retried with payment proof → service responds with data</p>
              <p><span className="text-gray-500">6.</span> <span className="text-warden-soul-light">5-min dispute window</span> — if service failed, you get a refund</p>
              <p><span className="text-gray-500">7.</span> After window closes → funds released to merchant</p>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 pt-8 text-center">
          <p className="text-sm text-gray-500">
            Questions? Check the{" "}
            <a href="https://github.com/Micoh18/x402Warden-Solana" target="_blank" className="text-warden-soul-light hover:underline">
              GitHub repo
            </a>{" "}
            or open an issue.
          </p>
        </footer>
      </main>
    </div>
  );
}
