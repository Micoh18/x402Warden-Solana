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
        <div className="max-w-5xl mx-auto space-y-16">

          <div className="text-center">
            <span className="text-xs font-semibold text-warden-soul-light uppercase tracking-wider">Developer Experience</span>
            <h2 className="text-4xl font-semibold text-white mt-3 mb-4">Integrate in 3 Steps</h2>
            <p className="text-lg text-gray-400 max-w-xl mx-auto">
              Works with any AI agent, any language, any framework.
            </p>
          </div>

          {/* Steps 1-2-3 */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Fund Your Wallet",
                desc: "Get free devnet SOL and USDC from Solana and Circle faucets.",
                icon: "dollar",
                code: "solana airdrop 2",
              },
              {
                step: "02",
                title: "Create Agent Account",
                desc: "Deploy an on-chain smart account that enforces your spending rules.",
                icon: "shield",
                code: "npx x402warden init --agent-id 0",
              },
              {
                step: "03",
                title: "Set Spending Policies",
                desc: "Define per-call limits, daily caps, merchant allowlists, and dispute windows.",
                icon: "settings",
                code: "npx x402warden policy --max-per-call 5000000",
              },
            ].map((s) => (
              <div key={s.step} className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-warden-soul-light/20 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-warden-soul-light/10 text-warden-soul-light text-xs font-bold font-mono">
                    {s.step}
                  </span>
                  <SolarIcon name={s.icon} size={18} className="text-gray-500 group-hover:text-warden-soul-light transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">{s.desc}</p>
                <div className="rounded-md bg-black/50 border border-white/[0.06] px-3 py-2 font-mono text-xs text-gray-400 overflow-x-auto">
                  <span className="text-warden-soul-light/60">$</span> {s.code}
                </div>
              </div>
            ))}
          </div>

          {/* Two Integration Paths */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white text-center">Choose Your Integration Path</h3>
            <div className="grid md:grid-cols-2 gap-6">

              {/* Path A: CLI */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-warden-soul-light/20 transition-all duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warden-soul-light/10">
                      <SolarIcon name="hash" size={20} className="text-warden-soul-light" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-warden-soul-light uppercase tracking-wider">Path A</span>
                      <h4 className="text-base font-semibold text-white">CLI &mdash; Direct Command</h4>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Your agent calls <code className="text-gray-300 bg-white/5 px-1 rounded">x402warden pay</code> as a subprocess.
                    Returns JSON to stdout, parseable by any language.
                  </p>
                </div>
                <div className="border-t border-white/[0.06]">
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-400 bg-black/30">
<code><span className="text-warden-soul-light/60">$</span> npx x402warden pay https://api.example.com/research{"\n"}
<span className="text-gray-600">{"{"}</span>{"\n"}
{"  "}<span className="text-warden-soul-light">&quot;status&quot;</span>: <span className="text-green-400">&quot;paid&quot;</span>,{"\n"}
{"  "}<span className="text-warden-soul-light">&quot;txSignature&quot;</span>: <span className="text-green-400">&quot;4fW...ABCD&quot;</span>,{"\n"}
{"  "}<span className="text-warden-soul-light">&quot;amountPaid&quot;</span>: <span className="text-amber-400">5000000</span>,{"\n"}
{"  "}<span className="text-warden-soul-light">&quot;body&quot;</span>: {"{ ... }"}{"\n"}
<span className="text-gray-600">{"}"}</span></code>
                  </pre>
                </div>
                <div className="px-6 pb-5 pt-3 flex flex-wrap gap-2">
                  {["Python", "Node.js", "Rust", "Go"].map((lang) => (
                    <span key={lang} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-gray-500">{lang}</span>
                  ))}
                </div>
              </div>

              {/* Path B: Proxy */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-warden-soul-light/20 transition-all duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warden-soul-light/10">
                      <SolarIcon name="shield" size={20} className="text-warden-soul-light" />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-warden-soul-light uppercase tracking-wider">Path B</span>
                      <h4 className="text-base font-semibold text-white">HTTP Proxy &mdash; Zero Changes</h4>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Start a local proxy. Your agent&apos;s HTTP requests go through it.
                    402 payments are handled automatically &mdash; your agent doesn&apos;t know it&apos;s paying.
                  </p>
                </div>
                <div className="border-t border-white/[0.06]">
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-400 bg-black/30">
<code><span className="text-gray-500"># Start the proxy</span>{"\n"}
<span className="text-warden-soul-light/60">$</span> npx x402warden-proxy --port 4020{"\n"}
{"\n"}
<span className="text-gray-500"># Your agent code — no changes needed</span>{"\n"}
<span className="text-amber-400">client</span> = httpx.Client(<span className="text-warden-soul-light">proxy</span>=<span className="text-green-400">&quot;http://localhost:4020&quot;</span>){"\n"}
response = client.get(<span className="text-green-400">&quot;http://api.example.com/data&quot;</span>)</code>
                  </pre>
                </div>
                <div className="px-6 pb-5 pt-3 flex flex-wrap gap-2">
                  {["curl", "httpx", "fetch", "any HTTP client"].map((lang) => (
                    <span key={lang} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-gray-500">{lang}</span>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-4">
            <Link href="/integrate">
              <button className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium rounded-full text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(86,255,232,0.2)]"
                style={{ border: "1px solid rgba(86, 255, 232, 0.25)", background: "rgba(86, 255, 232, 0.05)" }}>
                View Full Integration Guide
                <SolarIcon name="arrow-right" size={16} />
              </button>
            </Link>
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
