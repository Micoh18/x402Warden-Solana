"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Code2,
  Github,
  GitBranch,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Terminal,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { footerGroups, landingLinks, mcpInstallCommand } from "@/data/landing";
import { trackLandingEvent, type LandingEventProperties } from "@/lib/landing-analytics";

type Tone = "teal" | "amber" | "red" | "green" | "blue" | "moss";

type IconCard = {
  title: string;
  copy: string;
  icon: LucideIcon;
  tone: Tone;
};

const repoUrl = landingLinks.repo;
const architectureUrl = landingLinks.architecture;
const demoUrl = landingLinks.demo;
const docsUrl = landingLinks.docs;
const integrateUrl = landingLinks.integrate;
const sdkUrl = landingLinks.sdk;
const dashboardUrl = landingLinks.dashboard;

const toneStyles: Record<Tone, string> = {
  teal: "border-warden-soul-light/30 bg-warden-soul-light/10 text-warden-soul-light",
  amber: "border-[#D8B35E]/30 bg-[#D8B35E]/10 text-[#E3C46F]",
  red: "border-[#E36C61]/30 bg-[#E36C61]/10 text-[#F08A7D]",
  green: "border-[#93B978]/30 bg-[#93B978]/10 text-[#A9CB8A]",
  blue: "border-warden-heart/30 bg-warden-heart/10 text-warden-heart",
  moss: "border-warden-lichen/30 bg-warden-lichen/10 text-warden-lichen",
};

const navItems = [
  { label: "How it works", href: "#how", id: "how" },
  { label: "Receipts", href: "#receipts", id: "receipts" },
  { label: "Demo", href: "#demo", id: "demo" },
  { label: "Docs", href: docsUrl },
  { label: "Compare", href: "#compare", id: "compare" },
];

const proofItems = [
  "On-chain policy enforcement",
  "Per-payment escrow",
  "Dispute + refund path",
  "CLI / Proxy / SDK / MCP",
];

const problemCards: IconCard[] = [
  {
    title: "The agent pays too much",
    copy: "A prompt, bug, or malicious endpoint can push a payment above the intended price before a human reviews it.",
    icon: AlertTriangle,
    tone: "amber",
  },
  {
    title: "The merchant is unknown",
    copy: "A paid endpoint can route funds to an address your system has never approved.",
    icon: ShieldOff,
    tone: "red",
  },
  {
    title: "The service fails after payment",
    copy: "The API can return garbage, timeout, or fail schema validation after the payment is accepted.",
    icon: Gauge,
    tone: "amber",
  },
  {
    title: "There is no recovery path",
    copy: "Direct settlement gives the buyer no structured way to dispute, prove failure, or recover funds.",
    icon: RotateCcw,
    tone: "red",
  },
];

const howSteps = [
  {
    label: "HTTP 402",
    title: "Agent hits a paid endpoint",
    copy: "The service returns payment requirements with price, asset, and merchant address.",
    code: "GET /api/research -> 402 Payment Required",
  },
  {
    label: "Policy",
    title: "Rules run before funds move",
    copy: "x402warden checks max price, period budget, pause state, and merchant allowlists.",
    code: "max_per_call: 5 USDC / allowlist: pass",
  },
  {
    label: "Escrow",
    title: "USDC is held per payment",
    copy: "Approved payments move into a PaymentEscrow PDA instead of settling directly to the merchant.",
    code: "buyer wallet -> PaymentEscrow PDA",
  },
  {
    label: "Evidence",
    title: "Delivery can be checked",
    copy: "The paid retry can attach response status, hashes, and optional on-chain evidence anchors.",
    code: "response_hash: 9f4c... / status: 200",
  },
  {
    label: "Outcome",
    title: "Settle or recover",
    copy: "Good service settles after the dispute window. Bad service can enter dispute and refund flow.",
    code: "pending -> settled | disputed -> refunded",
  },
];

const metrics = [
  {
    value: "125 USDC",
    label: "USDC protected",
    detail: "Sum of PaymentEscrow amounts.",
    source: "on-chain escrow",
    tone: "teal" as const,
  },
  {
    value: "25 USDC",
    label: "USDC blocked",
    detail: "Shown only with a signed block receipt or demo estimate badge.",
    source: "signed receipt",
    tone: "red" as const,
  },
  {
    value: "15 USDC",
    label: "Active escrow",
    detail: "Pending or disputed funds during the dispute window.",
    source: "on-chain escrow",
    tone: "amber" as const,
  },
  {
    value: "5 USDC",
    label: "USDC recovered",
    detail: "Refunded escrow, not open dispute totals.",
    source: "refunded escrow",
    tone: "green" as const,
  },
];

const featureCards: IconCard[] = [
  {
    title: "Payment firewall",
    copy: "Block overspend, paused agents, and unapproved merchants before USDC leaves the buyer wallet.",
    icon: ShieldCheck,
    tone: "teal",
  },
  {
    title: "Per-payment escrow",
    copy: "Hold approved x402 payments in a PaymentEscrow PDA during the dispute window.",
    icon: LockKeyhole,
    tone: "moss",
  },
  {
    title: "Dispute and refund path",
    copy: "Open disputes for failed delivery and recover funds when the merchant accepts or misses the deadline.",
    icon: RotateCcw,
    tone: "green",
  },
  {
    title: "Receipts with evidence hashes",
    copy: "Build receipts from escrow accounts and attach delivery evidence hashes when callers record them.",
    icon: ReceiptText,
    tone: "blue",
  },
  {
    title: "Spend observability",
    copy: "Report protected, active, settled, recovered, and blocked amounts with source labels.",
    icon: Gauge,
    tone: "amber",
  },
  {
    title: "Agent-native integrations",
    copy: "Use the CLI, HTTP proxy, TypeScript SDK, or MCP server from the stack your agent already runs.",
    icon: Terminal,
    tone: "blue",
  },
];

const scenarios = [
  {
    name: "Overspend blocked",
    status: "Blocked",
    tone: "red" as const,
    prompt: "Agent requests a 25 USDC report while max_per_call is 5 USDC.",
    result: "No escrow is created. The buyer receives a signed blocked-payment receipt.",
    metric: "+25 USDC blocked",
    source: "signed receipt or demo estimate",
  },
  {
    name: "Good payment",
    status: "Escrowed",
    tone: "teal" as const,
    prompt: "Agent calls an approved research API with a 5 USDC x402 quote.",
    result: "Policy passes, USDC moves into escrow, and the paid retry returns data.",
    metric: "+5 USDC protected",
    source: "on-chain escrow",
  },
  {
    name: "Bad service recovered",
    status: "Recovered",
    tone: "green" as const,
    prompt: "Agent pays an endpoint that returns malformed or empty data.",
    result: "Delivery check fails, dispute opens, and the refund path returns escrowed funds.",
    metric: "+5 USDC recovered",
    source: "refunded escrow",
  },
];

const integrations = [
  {
    title: "MCP server",
    copy: "Let Claude, Cursor, and MCP-compatible clients call x402 tools with policy limits, escrow, and dispute protection.",
    command: "npx -y x402warden-mcp",
    cta: "Install MCP",
    icon: Network,
    tone: "teal" as const,
  },
  {
    title: "CLI",
    copy: "Any agent can shell out to a command and receive structured JSON back.",
    command: "npx x402warden pay https://api.example.com/research",
    cta: "View CLI guide",
    icon: Terminal,
    tone: "blue" as const,
  },
  {
    title: "HTTP proxy",
    copy: "Route paid requests through a local proxy without rewriting the agent.",
    command: "HTTP_PROXY=http://localhost:4020 python agent.py",
    cta: "Use proxy",
    icon: GitBranch,
    tone: "moss" as const,
  },
  {
    title: "TypeScript SDK",
    copy: "Create agents, set policies, process payments, record evidence, and open disputes from your app.",
    command: "await client.processPayment(agentPda, amount, merchant, requestHash)",
    cta: "Read SDK docs",
    icon: Code2,
    tone: "amber" as const,
  },
];

const comparisonRows = [
  ["Hold funds", "Yes", "No", "No"],
  ["Quote price", "No", "Yes", "Reads"],
  ["Spending caps", "Some", "No", "Yes"],
  ["Merchant allowlist", "Some", "No", "Yes"],
  ["Escrow per payment", "No", "Rare", "Yes"],
  ["Dispute path", "No", "Seller-side", "Buyer-side"],
  ["Refund recovery", "No", "Manual", "Built-in"],
  ["Receipts", "Logs", "Payment proof", "Service evidence"],
];

const useCases: IconCard[] = [
  {
    title: "Research agents",
    copy: "Set daily data budgets, approve known providers, escrow each report, and dispute malformed responses.",
    icon: Layers3,
    tone: "blue",
  },
  {
    title: "Agent marketplaces",
    copy: "Give buyers a protection layer when trying new x402 merchants and paid services.",
    icon: Network,
    tone: "teal",
  },
  {
    title: "Enterprise API spend",
    copy: "Give autonomous agents controlled spending power with policy receipts and audit trails.",
    icon: KeyRound,
    tone: "moss",
  },
  {
    title: "Developer tools",
    copy: "Let agents pay per tool call while giving buyers a recovery path when the tool fails.",
    icon: Terminal,
    tone: "amber",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SourceBadge({ children, tone }: { children: string; tone: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]",
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.28em] text-warden-soul-light">
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <h2 className="mt-4 break-words text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-warden-muted md:text-lg">
        {copy}
      </p>
    </div>
  );
}

function CopyCommand({
  text,
  compact = false,
  eventProps,
}: {
  text: string;
  compact?: boolean;
  eventProps?: LandingEventProperties;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackLandingEvent("copy_command_clicked", {
      cta_label: "Copy command",
      ...eventProps,
    });
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] text-sm text-warden-muted transition hover:border-warden-soul-light/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60",
        compact ? "px-2.5 py-2" : "px-3 py-2"
      )}
      aria-label="Copy command"
      title="Copy command"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
      {!compact && <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  );
}

function LandingHeader() {
  const { connected } = useWallet();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("top");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navItems
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-28% 0px -58% 0px", threshold: [0.12, 0.4, 0.7] }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 border-b bg-[#090A0B]/90 backdrop-blur-xl transition-colors",
        scrolled ? "border-warden-soul-light/20" : "border-white/10"
      )}
    >
      <div className="relative mx-auto flex h-16 w-full max-w-[100vw] items-center justify-between px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="x402warden home">
          <Image src="/logo.svg" alt="" width={30} height={30} priority />
          <span className="text-base font-semibold text-white">x402warden</span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm transition hover:text-white",
                item.id === activeSection ? "text-white" : "text-warden-muted"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackLandingEvent("github_clicked", { section: "header" })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-warden-muted transition hover:border-white/25 hover:text-white"
            aria-label="Open GitHub"
            title="GitHub"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link
            href={dashboardUrl}
            onClick={() => trackLandingEvent("dashboard_clicked", { section: "header" })}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm text-warden-muted transition hover:border-white/25 hover:text-white"
          >
            <WalletCards className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          {!connected && <ConnectButton />}
          <a
            href={demoUrl}
            onClick={() =>
              trackLandingEvent("hero_cta_run_demo_clicked", {
                section: "header",
                cta_label: "Run demo",
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-4 text-sm font-semibold text-white transition hover:bg-warden-soul-light/15"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Run demo
          </a>
        </div>

        <button
          type="button"
          className="fixed left-[160px] top-3 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-white lg:static lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#090A0B] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-warden-muted hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white"
                onClick={() => trackLandingEvent("github_clicked", { section: "mobile_header" })}
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
              <a
                href={demoUrl}
                onClick={() => {
                  setOpen(false);
                  trackLandingEvent("hero_cta_run_demo_clicked", {
                    section: "mobile_header",
                    cta_label: "Run demo",
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-3 py-2 text-sm font-semibold text-white"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Run demo
              </a>
            </div>
            <Link
              href={dashboardUrl}
              onClick={() => {
                setOpen(false);
                trackLandingEvent("dashboard_clicked", { section: "mobile_header" });
              }}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white"
            >
              <WalletCards className="h-4 w-4" aria-hidden="true" />
              Launch dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function FirewallConsole() {
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-black/30 lg:border lg:border-white/10 lg:bg-black/35">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-warden-dim">
          payment firewall console
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_0.82fr]">
        <div className="space-y-2 p-3 md:p-4">
          {[
            ["Agent request", "GET /api/research", "HTTP 402 received"],
            ["Policy check", "max_per_call: 5 USDC", "merchant allowlisted"],
            ["Escrow", "USDC -> PaymentEscrow PDA", "dispute window: 300s"],
            ["Result", "response hash recorded", "status: pending settlement"],
          ].map((row, index) => (
            <div
              key={row[0]}
              className={cn(
                "grid grid-cols-[88px_1fr] gap-4 border-l border-warden-soul-light/25 pl-4",
                index > 0 ? "hidden sm:grid" : ""
              )}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-warden-dim">
                {row[0]}
              </span>
              <div className="space-y-1 font-mono text-sm">
                <p className="text-white">{row[1]}</p>
                <p className="text-warden-muted">{row[2]}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden border-t border-white/10 sm:grid md:border-l md:border-t-0">
          {metrics.slice(0, 3).map((metric) => (
            <div key={metric.label} className="border-b border-white/10 p-3 last:border-b-0">
              <SourceBadge tone={metric.tone}>{metric.source}</SourceBadge>
              <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              <p className="mt-1 text-sm text-warden-muted">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_0,rgba(215,227,106,0.05)_1px,transparent_2px)] bg-[length:100%_24px] opacity-50" />
    </div>
  );
}

function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden pt-20">
      <div className="absolute inset-0 -z-10 bg-[#090A0B]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(215,227,106,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(215,227,106,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="mx-auto grid min-h-[82svh] w-full max-w-[100vw] gap-7 px-4 pb-6 pt-4 sm:px-6 lg:max-w-7xl lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:px-8 lg:pb-14 lg:pt-14">
        <div className="w-full max-w-[340px] sm:max-w-4xl lg:max-w-2xl">
          <div className="flex max-w-full flex-wrap gap-2">
            {["x402-native", "Solana devnet verified", "MCP-ready"].map((item) => (
              <SourceBadge key={item} tone="teal">
                {item}
              </SourceBadge>
            ))}
          </div>
          <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl md:text-6xl lg:text-6xl">
            <span className="block">Let AI agents pay</span>
            <span className="block">without giving</span>
            <span className="block">them a blank check.</span>
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-warden-muted md:text-xl md:leading-8">
            x402warden sits between your agent and every paid API call: enforcing
            budgets and allowlists before payment, holding USDC in escrow during
            delivery, and enabling disputes or refunds when services fail.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={demoUrl}
              onClick={() =>
                trackLandingEvent("hero_cta_run_demo_clicked", {
                  section: "hero",
                  cta_label: "Run the demo",
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/40 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-warden-soul-light/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              Run the demo
            </a>
            <a
              href={architectureUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                trackLandingEvent("hero_cta_docs_clicked", {
                  section: "hero",
                  cta_label: "Read the architecture",
                });
                trackLandingEvent("architecture_link_clicked", {
                  section: "hero",
                  cta_label: "Read the architecture",
                });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
              Read the architecture
            </a>
            <CopyCommand
              text={mcpInstallCommand}
              eventProps={{ section: "hero", integration_type: "mcp" }}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {proofItems.map((item) => (
              <div
                key={item}
                className="flex min-h-12 min-w-0 items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-warden-muted sm:text-sm"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-warden-soul-light" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[340px] sm:max-w-none lg:min-w-0">
          <FirewallConsole />
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="border-t border-white/10 bg-[#111317] px-4 pb-16 pt-4 sm:px-6 md:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="problem"
          title="Autonomous payments create a new failure mode: bad spend at machine speed."
          copy="When agents discover and pay x402 services on their own, traditional wallet UX is too slow and merchant-side checkout is not enough."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {problemCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="border border-white/10 bg-white/[0.03] p-5">
                <div className={cn("inline-flex h-11 w-11 items-center justify-center border", toneStyles[card.tone])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-warden-muted">{card.copy}</p>
              </article>
            );
          })}
        </div>
        <div className="mt-10 grid gap-3 font-mono text-sm text-warden-muted lg:grid-cols-2">
          <div className="border border-red-400/20 bg-red-400/5 p-4">
            {"Agent -> Paid API -> Direct settlement -> No refund"}
          </div>
          <div className="border border-warden-soul-light/25 bg-warden-soul-light/5 p-4 text-warden-soul-light">
            {"Agent -> x402warden -> Escrow -> Service evidence -> Settle or recover"}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategorySection() {
  const columns = [
    {
      title: "Agent wallet",
      icon: WalletCards,
      items: ["Holds funds", "Manages keys", "Sets broad limits", "Does not prove service delivery"],
    },
    {
      title: "x402 checkout",
      icon: Clipboard,
      items: ["Quotes price", "Verifies payment", "Settles to merchant", "Optimized for seller flow"],
    },
    {
      title: "x402warden",
      icon: ShieldCheck,
      items: ["Checks policy", "Holds escrow", "Records receipt", "Disputes and recovers"],
    },
  ];

  return (
    <section className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="category"
          title="Wallets hold money. Checkouts collect money. x402warden protects the payer."
          copy="Agent wallets are useful for custody and broad spend controls. x402 checkouts are useful for merchants that want to charge. x402warden covers the missing buyer-side layer."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {columns.map((column, index) => {
            const Icon = column.icon;
            const highlighted = index === 2;
            return (
              <article
                key={column.title}
                className={cn(
                  "border p-6",
                  highlighted
                    ? "border-warden-soul-light/35 bg-warden-soul-light/[0.06]"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", highlighted ? "text-warden-soul-light" : "text-warden-muted")} aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-white">{column.title}</h3>
                </div>
                <ul className="mt-5 space-y-3">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-warden-muted">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-warden-dim" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-warden-dim">
          x402warden is complementary infrastructure. It can sit in front of wallets, facilitators, and marketplaces.
        </p>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how" className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="how it works"
          title="Every payment passes through a programmable settlement firewall."
          copy="x402warden wraps the x402 request, payment, and response cycle with policy checks, escrow, and recovery logic."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {howSteps.map((step, index) => (
            <article key={step.label} className="border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <SourceBadge tone={index === 4 ? "green" : "teal"}>{step.label}</SourceBadge>
                <span className="font-mono text-xs text-warden-dim">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 min-h-24 text-sm leading-6 text-warden-muted">{step.copy}</p>
              <pre className="mt-5 overflow-x-auto border border-white/10 bg-black/35 p-3 font-mono text-xs text-warden-bone">
                <code>{step.code}</code>
              </pre>
            </article>
          ))}
        </div>
        <details className="mt-8 border border-white/10 bg-black/25 p-5 text-sm text-warden-muted">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.2em] text-warden-soul-light">
            Under the hood
          </summary>
          <p className="mt-4 leading-7">
            AgentAccount, PolicyAccount, MerchantAllowlistAccount, PaymentEscrow, DisputeAccount, and optional PaymentEvidenceAccount.
          </p>
        </details>
      </div>
    </section>
  );
}

function MetricsSection() {
  return (
    <section className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="metrics"
          title="Measure protection, not just payments."
          copy="The dashboard should make risk visible: what agents tried to spend, what was allowed, what is in escrow, what was recovered, and which source proves each number."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="border border-white/10 bg-white/[0.03] p-6">
              <SourceBadge tone={metric.tone}>{metric.source}</SourceBadge>
              <p className="mt-6 text-4xl font-semibold text-white">{metric.value}</p>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-warden-bone">
                {metric.label}
              </h3>
              <p className="mt-4 text-sm leading-6 text-warden-muted">{metric.detail}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          `USDC blocked` is shown as verified only when backed by a signed BlockedPaymentReceiptV1 or equivalent source. Demo/local values must stay labeled as estimates.
        </div>
      </div>
    </section>
  );
}

function FeatureSection() {
  return (
    <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="capabilities"
          title="Built for autonomous buyers, not just autonomous spenders."
          copy="Each feature maps to a specific payment failure: bad policy, unknown merchant, failed delivery, missing receipt, or unclear spend."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="border border-white/10 bg-white/[0.03] p-6">
                <div className={cn("inline-flex h-11 w-11 items-center justify-center border", toneStyles[feature.tone])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-warden-muted">{feature.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReceiptSection() {
  const receipt = `{
  "version": 1,
  "source": "on_chain_payment_escrow",
  "paymentId": "42",
  "merchant": "8x4...Pda",
  "amount": "5000000",
  "state": "pending",
  "x402RequestHash": "2f9d...",
  "deliveryEvidence": {
    "source": "on_chain_account",
    "statusCode": 200,
    "responseHash": "9f4c...",
    "evidenceHash": "a81e..."
  }
}`;

  return (
    <section id="receipts" className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <SectionEyebrow>receipts</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-5xl">
            Every autonomous payment deserves a receipt.
          </h2>
          <p className="mt-5 text-base leading-7 text-warden-muted md:text-lg">
            A payment receipt should prove more than a transfer. It should explain
            what the agent requested, which policy allowed it, where the money
            went, which delivery evidence hash was recorded, and how settlement ended.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {["Policy decision", "Escrow state", "Delivery evidence", "Settlement outcome"].map((item) => (
              <div key={item} className="border border-white/10 bg-white/[0.03] p-4 text-sm text-warden-bone">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="border border-white/10 bg-black/35">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ReceiptText className="h-4 w-4 text-warden-soul-light" aria-hidden="true" />
              PaymentReceiptV1
            </div>
            <CopyCommand
              text={receipt}
              compact
              eventProps={{ section: "receipts", cta_label: "Copy receipt JSON" }}
            />
          </div>
          <pre className="max-h-[460px] overflow-auto p-5 font-mono text-sm leading-6 text-warden-bone">
            <code>{receipt}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  const [active, setActive] = useState(0);
  const scenario = scenarios[active];

  return (
    <section id="demo" className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="demo"
          title="A 3-minute demo: block bad spend, escrow good spend, recover failed spend."
          copy="The same agent attempts three payments. It keeps working autonomously, but it never gets a blank check."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {scenarios.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setActive(index);
                  trackLandingEvent("demo_scenario_selected", {
                    section: "landing_demo",
                    demo_scenario: item.name,
                  });
                }}
                className={cn(
                  "w-full border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60",
                  active === index
                    ? "border-warden-soul-light/35 bg-warden-soul-light/[0.07]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                  <SourceBadge tone={item.tone}>{item.status}</SourceBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-warden-muted">{item.prompt}</p>
              </button>
            ))}
          </div>
          <div className="border border-white/10 bg-black/30">
            <div className="border-b border-white/10 p-5">
              <SourceBadge tone={scenario.tone}>{scenario.source}</SourceBadge>
              <h3 className="mt-5 text-2xl font-semibold text-white">{scenario.name}</h3>
              <p className="mt-4 text-sm leading-7 text-warden-muted">{scenario.result}</p>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">metric update</p>
                <p className="mt-4 text-3xl font-semibold text-white">{scenario.metric}</p>
              </div>
              <div className="p-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">agent rule</p>
                <p className="mt-4 font-mono text-sm leading-6 text-warden-bone">
                  {"enforce -> escrow -> prove -> recover"}
                </p>
              </div>
            </div>
            <div className="border-t border-white/10 p-4">
              <Image
                src="/mcp-demo.gif"
                alt="x402warden MCP demo running in an agent environment"
                width={960}
                height={540}
                unoptimized
                className="h-auto w-full border border-white/10"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  return (
    <section className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="integrations"
          title="Protect payments from the stack your agent already uses."
          copy="Use x402warden through the CLI, HTTP proxy, SDK, or MCP server. Start simple, then move deeper as your agent stack matures."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="flex min-h-[340px] flex-col border border-white/10 bg-white/[0.03] p-5">
                <div className={cn("inline-flex h-11 w-11 items-center justify-center border", toneStyles[item.tone])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-warden-muted">{item.copy}</p>
                <div className="mt-auto pt-5">
                  <div className="flex items-start gap-2 border border-white/10 bg-black/35 p-3">
                    <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-5 text-warden-bone">
                      {item.command}
                    </code>
                    <CopyCommand
                      text={item.command}
                      compact
                      eventProps={{ section: "integrations", integration_type: item.title }}
                    />
                  </div>
                  <a
                    href={
                      item.title === "MCP server"
                        ? docsUrl
                        : item.title === "CLI" || item.title === "HTTP proxy"
                          ? integrateUrl
                          : sdkUrl
                    }
                    target={item.title === "TypeScript SDK" ? "_blank" : undefined}
                    rel={item.title === "TypeScript SDK" ? "noreferrer" : undefined}
                    onClick={() => {
                      if (item.title === "MCP server") {
                        trackLandingEvent("mcp_install_clicked", {
                          section: "integrations",
                          integration_type: "mcp",
                        });
                      } else if (item.title === "CLI") {
                        trackLandingEvent("cli_install_clicked", {
                          section: "integrations",
                          integration_type: "cli",
                        });
                      } else if (item.title === "HTTP proxy") {
                        trackLandingEvent("proxy_docs_clicked", {
                          section: "integrations",
                          integration_type: "proxy",
                        });
                      } else {
                        trackLandingEvent("sdk_docs_clicked", {
                          section: "integrations",
                          integration_type: "sdk",
                        });
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-warden-soul-light hover:text-white"
                  >
                    {item.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Python SDK", "LangChain", "CrewAI", "Vercel AI SDK", "ElizaOS", "Solana Agent Kit", "Webhooks"].map((item) => (
            <span key={item} className="border border-white/10 px-3 py-1.5 text-xs text-warden-dim">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompareSection() {
  return (
    <section id="compare" className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="compare"
          title="Built for the missing side of x402: the buyer."
          copy="Most payment tools help agents hold money or help merchants collect it. x402warden protects the buyer through the full payment lifecycle."
        />
        <div className="mt-12 overflow-x-auto border border-white/10">
          <table className="w-full min-w-[760px] border-collapse bg-black/25 text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-warden-dim">
                <th className="p-4 font-mono text-xs uppercase tracking-[0.2em]">Capability</th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.2em]">Wallets</th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.2em]">Checkouts</th>
                <th className="p-4 font-mono text-xs uppercase tracking-[0.2em] text-warden-soul-light">x402warden</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row[0]} className="border-b border-white/10 last:border-b-0">
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={cn(
                        "p-4",
                        index === 0 ? "font-semibold text-white" : "text-warden-muted",
                        index === 3 ? "bg-warden-soul-light/[0.04] text-warden-soul-light" : ""
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="use cases"
          title="Controlled spending power for real agent workflows."
          copy="x402warden is most useful where the agent needs autonomy, but the buyer still needs limits, proof, and recovery."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {useCases.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="border border-white/10 bg-white/[0.03] p-5">
                <div className={cn("inline-flex h-10 w-10 items-center justify-center border", toneStyles[item.tone])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-warden-muted">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const nodes = ["AgentAccount", "PolicyAccount", "MerchantAllowlist", "PaymentEscrow", "DisputeAccount", "PaymentEvidence"];

  return (
    <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionEyebrow>trust</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-white md:text-5xl">
            Enforced on-chain, not hidden in a dashboard toggle.
          </h2>
          <p className="mt-5 text-base leading-7 text-warden-muted md:text-lg">
            x402warden uses Solana accounts for agent state, policies, merchant allowlists, payment escrow, disputes, and optional payment evidence anchors.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Open source", "Solana devnet verified", "Anchor program", "CLI / SDK / Proxy / MCP", "Dashboard available"].map((item) => (
              <SourceBadge key={item} tone="moss">
                {item}
              </SourceBadge>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={architectureUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                trackLandingEvent("architecture_link_clicked", {
                  section: "architecture",
                  cta_label: "Read architecture",
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted transition hover:border-white/25 hover:text-white"
            >
              Read architecture
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href={landingLinks.security}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-warden-soul-light/20"
            >
              Security model
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {nodes.map((node, index) => (
            <div key={node} className="grid grid-cols-[48px_1fr] items-center gap-4 border border-white/10 bg-black/25 p-4">
              <div className="flex h-12 w-12 items-center justify-center border border-warden-soul-light/25 bg-warden-soul-light/10 font-mono text-sm text-warden-soul-light">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold text-white">{node}</p>
                <p className="mt-1 text-sm text-warden-muted">
                  {index < 3
                    ? "Pre-payment control surface."
                    : index === 3
                      ? "USDC held during the dispute window."
                      : index === 4
                        ? "Dispute state, reason, and merchant deadline."
                        : "Optional receipt and delivery hash anchor."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoadmapSection() {
  const lanes = [
    ["Now", "Policy enforcement", "Per-payment escrow", "Disputes", "CLI", "SDK", "Proxy", "MCP", "Dashboard"],
    ["Next", "Payment receipts with delivery evidence hashes", "Auto-dispute checks", "Merchant risk score", "Spend report", "Better demo metrics"],
    ["Later", "Policy DSL", "Marketplace integrations", "Mainnet audit", "Multisig overrides", "Webhooks", "Reputation graph"],
  ];

  return (
    <section className="border-t border-white/10 bg-[#090A0B] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="roadmap"
          title="From payment firewall to trust layer for autonomous commerce."
          copy="The goal is not to become another marketplace. The goal is to become the buyer protection layer every x402 marketplace and agent stack can use."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {lanes.map(([title, ...items], index) => (
            <article key={title} className="border border-white/10 bg-white/[0.03] p-6">
              <SourceBadge tone={index === 0 ? "teal" : index === 1 ? "amber" : "blue"}>{title}</SourceBadge>
              <ul className="mt-6 space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-warden-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-warden-soul-light" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <SectionEyebrow>start</SectionEyebrow>
        <h2 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
          Give your agent spending power, not unlimited trust.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-warden-muted md:text-lg">
          Start with devnet, protect one x402 payment, then add policies, receipts, and disputes as your agent stack grows.
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl items-center justify-between gap-3 border border-white/10 bg-black/35 p-3">
          <code className="min-w-0 overflow-x-auto font-mono text-sm text-warden-bone">
            {mcpInstallCommand}
          </code>
          <CopyCommand
            text={mcpInstallCommand}
            compact
            eventProps={{ section: "final_cta", integration_type: "mcp" }}
          />
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={demoUrl}
            onClick={() =>
              trackLandingEvent("hero_cta_run_demo_clicked", {
                section: "final_cta",
                cta_label: "Run demo",
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/40 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-warden-soul-light/20"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Run demo
          </a>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackLandingEvent("github_clicked", { section: "final_cta" })}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted transition hover:border-white/25 hover:text-white"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            View GitHub
          </a>
          <Link
            href={dashboardUrl}
            onClick={() => trackLandingEvent("dashboard_clicked", { section: "final_cta" })}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted transition hover:border-white/25 hover:text-white"
          >
            <WalletCards className="h-4 w-4" aria-hidden="true" />
            Launch dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#090A0B] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_2.4fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span className="font-semibold text-white">x402warden</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-warden-muted">
            Settlement firewall and buyer protection layer for autonomous x402 payments on Solana.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">{group.title}</p>
              <div className="mt-4 space-y-2">
                {group.links.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer" : undefined}
                    onClick={() => {
                      if (item.label === "GitHub") {
                        trackLandingEvent("github_clicked", { section: "footer" });
                      } else if (item.label === "Dashboard") {
                        trackLandingEvent("dashboard_clicked", { section: "footer" });
                      } else if (item.label === "Architecture") {
                        trackLandingEvent("architecture_link_clicked", { section: "footer" });
                      }
                    }}
                    className="block text-sm text-warden-muted transition hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useEffect(() => {
    trackLandingEvent("landing_viewed", { section: "landing" });

    const comparison = document.getElementById("compare");
    if (!comparison) return;

    let viewed = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewed) {
          viewed = true;
          trackLandingEvent("comparison_viewed", { section: "compare" });
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(comparison);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#090A0B] text-foreground">
      <LandingHeader />
      <main>
        <HeroSection />
        <ProblemSection />
        <CategorySection />
        <HowItWorksSection />
        <MetricsSection />
        <FeatureSection />
        <ReceiptSection />
        <DemoSection />
        <IntegrationsSection />
        <CompareSection />
        <UseCasesSection />
        <ArchitectureSection />
        <RoadmapSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
