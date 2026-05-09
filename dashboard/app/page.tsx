"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ParticleField } from "@/components/ui/particle-field";
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

export default function LandingPage() {
  const { connected } = useWallet();

  return (
    <div className="flex flex-col bg-warden-black">
      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ParticleField color="86, 255, 232" particleCount={60} speed={0.15} className="opacity-30" />
        </div>

        <nav className="relative z-10 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="x402warden" width={28} height={28} />
            <span className="text-base font-normal text-white">x402warden</span>
          </div>
          {connected ? (
            <Link href="/agents">
              <button className="px-6 py-2 text-xs font-medium tracking-wide rounded-full border text-gray-300 transition-all duration-200 hover:text-white hover:border-white/20"
                style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                Dashboard
              </button>
            </Link>
          ) : (
            <ConnectButton />
          )}
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="animate-fade-in-up-1 text-[clamp(48px,8vw,88px)] font-semibold tracking-[-0.025em] leading-[1] mb-8">
              <span className="text-white">Secure Smart Accounts</span>
              <br />
              <span className="text-white">That Guard </span>
              <span className="italic text-warden-soul-light">Your Agents.</span>
            </h1>

            <p className="animate-fade-in-up-2 text-lg text-gray-400 font-medium mb-12 max-w-2xl mx-auto leading-7">
              Set spending policies, manage merchant allowlists, escrow every
              payment, and resolve disputes. All on-chain with Solana x402.
            </p>

            <div className="animate-fade-in-up-3 flex flex-col sm:flex-row gap-4 justify-center mb-32">
              {connected ? (
                <Link href="/agents">
                  <button className="inline-flex items-center gap-2 px-6 py-3 text-base font-normal rounded-full text-white transition-all duration-200 hover:shadow-[0_0_15px_rgba(86,255,232,0.3)]"
                    style={{ background: "#0A3135", border: "1px solid rgba(86, 255, 232, 0.35)" }}>
                    <SolarIcon name="arrow-down" size={16} />
                    Go to Dashboard
                  </button>
                </Link>
              ) : (
                <ConnectButton />
              )}
              <a href="#integrate">
                <button className="inline-flex items-center gap-2 px-6 py-3 text-base font-normal rounded-full text-gray-300 transition-all duration-200 hover:text-white"
                  style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Integrate with Your Agent
                </button>
              </a>
            </div>
          </div>
        </main>

        <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
          <div className="absolute" style={{
            left: "50%", top: "calc(100% + 22vh)", transform: "translateX(-50%)",
            animation: "orbital-breathe 6s ease-in-out infinite",
          }}>
            {[
              { w: 1800, h: 600, border: "2px solid #56FFE8", shadow: "0 0 15px 2px rgba(86,255,232,0.5), 0 0 60px 5px rgba(86,255,232,0.15), inset 0 0 15px 2px rgba(86,255,232,0.08)" },
              { w: 2100, h: 700, border: "1.5px solid rgba(86,255,232,0.5)", shadow: "0 0 12px 1px rgba(86,255,232,0.35), 0 0 50px 3px rgba(86,255,232,0.1)" },
              { w: 2400, h: 800, border: "1px solid rgba(86,255,232,0.3)", shadow: "0 0 10px 1px rgba(86,255,232,0.15)" },
              { w: 2700, h: 900, border: "1px solid rgba(86,255,232,0.15)", shadow: "0 0 8px rgba(86,255,232,0.06)" },
            ].map((ring, i) => (
              <div key={i} className="absolute rounded-[50%]" style={{
                width: `${ring.w}px`, height: `${ring.h}px`,
                left: `${-ring.w / 2}px`, top: `${-ring.h / 2}px`,
                border: ring.border, boxShadow: ring.shadow,
              }} />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[30vh]"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(86,255,232,0.05) 0%, transparent 60%)" }} />
          <div className="absolute" style={{
            left: "50%", top: "calc(100% + 22vh)", transform: "translateX(-50%)",
            animation: "orbital-breathe 6s ease-in-out infinite",
          }}>
            {[
              { w: 1800, h: 600, bw: 3 },
              { w: 2100, h: 700, bw: 2.5 },
              { w: 2400, h: 800, bw: 2 },
              { w: 2700, h: 900, bw: 1.5 },
            ].map((ring, i) => (
              <div key={`glow-${i}`} className="absolute rounded-[50%]" style={{
                width: `${ring.w}px`, height: `${ring.h}px`,
                left: `${-ring.w / 2}px`, top: `${-ring.h / 2}px`,
                border: `${ring.bw}px solid #56FFE8`,
                boxShadow: "0 0 12px 2px rgba(86,255,232,0.5), 0 0 40px 4px rgba(86,255,232,0.15)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, transparent 35%, white 45%, white 55%, transparent 65%, transparent 100%)",
                maskImage: "linear-gradient(90deg, transparent 0%, transparent 35%, white 45%, white 55%, transparent 65%, transparent 100%)",
                WebkitMaskSize: "300% 100%", maskSize: "300% 100%",
                animation: `line-glow-sweep 4s ease-in-out ${i * 0.1}s infinite`,
              }} />
            ))}
          </div>
        </div>

        <div className="relative z-10 pb-8 flex flex-col items-center gap-2">
          <span className="text-xs text-gray-500 tracking-wide">Scroll to Explore</span>
          <SolarIcon name="arrow-down" size={16} className="text-gray-600 animate-bounce" />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-semibold text-white text-center">How x402 Payment Works</h2>
          <p className="text-gray-400 text-center max-w-xl mx-auto">
            Every payment your agent makes passes through x402warden before reaching the merchant.
          </p>
          <div className="rounded-lg border border-white/10 bg-black/40 p-6 font-mono text-sm text-gray-300 leading-loose">
            <p><span className="text-gray-500">1.</span> Your agent requests a service</p>
            <p><span className="text-gray-500">2.</span> Service returns <span className="text-amber-400">HTTP 402</span> with price + merchant address</p>
            <p><span className="text-gray-500">3.</span> x402warden checks your <span className="text-warden-soul-light">spending policy</span> on-chain</p>
            <p><span className="text-gray-500">4.</span> If allowed, USDC moves to <span className="text-warden-soul-light">escrow</span> (not directly to merchant)</p>
            <p><span className="text-gray-500">5.</span> Request retried with payment proof, service responds with data</p>
            <p><span className="text-gray-500">6.</span> <span className="text-warden-soul-light">5-min dispute window</span> to get a refund if the service failed</p>
            <p><span className="text-gray-500">7.</span> After window closes, funds released to merchant</p>
          </div>
        </div>
      </section>

      {/* ── Integrate ── */}
      <section id="integrate" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto space-y-20">

          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white mb-4">Integrate with Your Agent</h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Works with any AI agent, any language, any framework.
              A <strong className="text-white">CLI</strong> your agent calls directly,
              or an <strong className="text-white">HTTP Proxy</strong> that handles payments transparently.
            </p>
          </div>

          {/* Prerequisites */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Prerequisites</h3>
            <p className="text-gray-400">Before integrating, you need a funded Solana wallet on devnet.</p>
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>
                <strong className="text-white">SOL for transaction fees</strong> &mdash; Get free devnet SOL
                at <a href="https://faucet.solana.com" target="_blank" className="text-warden-soul-light hover:underline">faucet.solana.com</a>
              </li>
              <li>
                <strong className="text-white">USDC for payments</strong> &mdash; Get free devnet USDC
                at <a href="https://faucet.circle.com" target="_blank" className="text-warden-soul-light hover:underline">faucet.circle.com</a> (select Solana Devnet)
              </li>
            </ol>
            <InfoBox label="What is a USDC Token Account?">
              On Solana, tokens like USDC live in separate &quot;token accounts&quot; associated with your wallet.
              When you request USDC from the Circle faucet, it automatically creates this account for you.
              Your wallet address holds SOL; the token account holds USDC. x402warden needs to know
              both to manage payments on your behalf.
            </InfoBox>
          </div>

          {/* Step 1 */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Step 1 &mdash; Create Your Agent Account</h3>
            <p className="text-gray-400">
              An agent account is an on-chain smart account that enforces your spending rules.
            </p>
            <CodeBlock title="Terminal">
{`# Check your balances and find your USDC token account address
npx x402warden balance

# Create agent account (agent-id 0 is your first agent)
npx x402warden init --agent-id 0 --usdc-account <YOUR_USDC_TOKEN_ACCOUNT>`}
            </CodeBlock>
            <p className="text-sm text-gray-500">
              The <code className="text-gray-300">balance</code> command shows your USDC token account address.
              Copy it and use it in the <code className="text-gray-300">init</code> command.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Step 2 &mdash; Set Spending Policies</h3>
            <p className="text-gray-400">
              Define how much your agent can spend. All amounts are in
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
          </div>

          {/* Path A: CLI */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">Integration Path A</span>
              <h3 className="text-xl font-semibold text-white mt-1">CLI &mdash; Direct Command</h3>
              <p className="text-gray-400 mt-2">
                Your agent calls <code className="text-gray-300">x402warden pay</code> as a subprocess.
                It handles the entire x402 flow and returns JSON to stdout.
              </p>
            </div>

            <CodeBlock title="Terminal">
{`# Simple GET request to a paywalled service
npx x402warden pay https://api.example.com/research

# POST with body and headers
npx x402warden pay https://api.example.com/analyze \\
  --method POST \\
  --body '{"query": "Solana TVL trends"}' \\
  --headers '{"Content-Type": "application/json"}'

# Cap the max you're willing to pay (in micro-USDC)
npx x402warden pay https://api.example.com/data --max-amount 10000000`}
            </CodeBlock>

            <p className="text-gray-400 text-sm">Response (JSON to stdout, parseable by any language):</p>
            <CodeBlock title="stdout">
{`{
  "status": "paid",
  "statusCode": 200,
  "txSignature": "4fW...ABCD",
  "amountPaid": 5000000,
  "body": { "data": "..." }
}`}
            </CodeBlock>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Call from any language:</p>
              <CodeBlock title="Python">
{`import subprocess, json

result = subprocess.run(
    ["npx", "x402warden", "pay", "https://api.example.com/research"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(data["body"])`}
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
                <li><code className="text-warden-soul-light">0</code> &mdash; Success (payment made or no payment needed)</li>
                <li><code className="text-warden-soul-light">1</code> &mdash; Payment blocked by your spending policy</li>
                <li><code className="text-warden-soul-light">2</code> &mdash; Error (network, config, insufficient funds)</li>
              </ul>
            </InfoBox>
          </div>

          {/* Path B: Proxy */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">Integration Path B</span>
              <h3 className="text-xl font-semibold text-white mt-1">HTTP Proxy &mdash; Zero Code Changes</h3>
              <p className="text-gray-400 mt-2">
                Start a local proxy. Point your agent&apos;s HTTP client to it.
                The proxy intercepts 402 responses, pays on-chain, and retries automatically.
                Your agent doesn&apos;t know it&apos;s paying.
              </p>
            </div>

            <CodeBlock title="Terminal 1 &mdash; Start proxy">
{`npx x402warden-proxy --port 4020`}
            </CodeBlock>

            <CodeBlock title="Terminal 2 &mdash; Use it">
{`# Any HTTP request through the proxy gets x402 protection
curl -x http://localhost:4020 http://api.example.com/research

# Or set the env var so all requests go through it
HTTP_PROXY=http://localhost:4020 curl http://api.example.com/data`}
            </CodeBlock>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">From your agent code:</p>
              <CodeBlock title="Python (httpx)">
{`import httpx

client = httpx.Client(proxy="http://localhost:4020")
response = client.get("http://api.example.com/research")
print(response.json())  # Payment handled transparently`}
              </CodeBlock>
            </div>

            <InfoBox label="HTTPS targets">
              For HTTPS services, send your request to <code className="text-warden-soul-light">http://localhost:4020</code> with
              a <code className="text-warden-soul-light">X-TARGET-URL</code> header pointing to the real endpoint.
            </InfoBox>
          </div>

          {/* Config */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Configuration</h3>
            <p className="text-gray-400">Both CLI and Proxy read from environment variables:</p>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Variable</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Default</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-xs text-warden-soul-light">SOLANA_KEYPAIR_PATH</td>
                    <td className="py-3 px-4 font-mono text-xs">~/.config/solana/id.json</td>
                    <td className="py-3 px-4 text-xs">Path to your Solana keypair</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-xs text-warden-soul-light">SOLANA_RPC_URL</td>
                    <td className="py-3 px-4 font-mono text-xs">devnet</td>
                    <td className="py-3 px-4 text-xs">Solana RPC endpoint</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 px-4 font-mono text-xs text-warden-soul-light">AGENT_ID</td>
                    <td className="py-3 px-4 font-mono text-xs">0</td>
                    <td className="py-3 px-4 text-xs">Which agent account to use</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-warden-soul-light">USDC_MINT</td>
                    <td className="py-3 px-4 font-mono text-xs">devnet USDC</td>
                    <td className="py-3 px-4 text-xs">USDC token mint address</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="text-sm text-gray-500">
          <a href="https://github.com/Micoh18/x402Warden-Solana" target="_blank" className="text-warden-soul-light hover:underline">
            GitHub
          </a>
          {" "}&middot;{" "}
          Built for DEV3PACK Hackathon 2026
        </p>
      </footer>
    </div>
  );
}
