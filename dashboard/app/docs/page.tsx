import type { Metadata } from "next";
import { ArrowRight, BookOpen, Code2, FileText, GitBranch, ShieldCheck, Terminal } from "lucide-react";
import { integrations, landingLinks, mcpInstallCommand } from "@/data/landing";
import {
  Checklist,
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { CopyCommand, TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Documentation hub for x402warden: architecture, policies, demo guide, CLI, MCP, proxy, SDK, receipts, and security model.",
};

const docCards = [
  {
    title: "Architecture",
    copy: "Account model, program instructions, payment flow, and dispute resolution.",
    href: landingLinks.architecture,
    external: true,
    icon: GitBranch,
  },
  {
    title: "Policy guide",
    copy: "Configure spend limits, period budgets, allowlists, dispute windows, and policy templates.",
    href: landingLinks.policies,
    external: true,
    icon: ShieldCheck,
  },
  {
    title: "SDK reference",
    copy: "Use the TypeScript SDK to create agents, set policies, process payments, and build receipts.",
    href: landingLinks.sdk,
    external: true,
    icon: Code2,
  },
  {
    title: "Demo guide",
    copy: "Run the merchant server, Python agent, dashboard, and three core scenarios.",
    href: landingLinks.demoGuide,
    external: true,
    icon: Terminal,
  },
  {
    title: "Receipt model",
    copy: "Understand PaymentReceiptV1, delivery evidence, blocked receipts, and metric sources.",
    href: landingLinks.receipts,
    icon: FileText,
  },
  {
    title: "Production readiness",
    copy: "Security checklist, local gates, devnet manual gates, and mainnet limits.",
    href: landingLinks.productionReadiness,
    external: true,
    icon: BookOpen,
  },
];

export default function DocsPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="docs"
          title="Choose the fastest path to protect one autonomous payment."
          copy="Start with MCP if your agent runs inside an MCP client, CLI if any language can shell out, proxy if you want low-code interception, or SDK if you need direct control."
          primary={{ label: "Run interactive demo", href: landingLinks.demo }}
          secondary={{ label: "Read architecture", href: landingLinks.architecture, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="integration paths"
              title="Four ways into the same protection model."
              copy="Every integration is built around the same lifecycle: enforce policy before payment, escrow during delivery, prove what happened, and recover when service fails."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-4">
              {integrations.map((item) => (
                <article key={item.slug} className="flex min-h-[310px] flex-col border border-white/10 bg-white/[0.03] p-5">
                  <SourceBadge tone={item.slug === "mcp" ? "teal" : item.slug === "sdk" ? "amber" : "blue"}>
                    {item.title}
                  </SourceBadge>
                  <p className="mt-5 text-sm leading-6 text-warden-muted">{item.copy}</p>
                  <div className="mt-auto pt-5">
                    <div className="flex items-start gap-2 border border-white/10 bg-black/35 p-3">
                      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-5 text-warden-bone">
                        {item.command}
                      </code>
                      <CopyCommand
                        text={item.command}
                        compact
                        eventProps={{ section: "docs", integration_type: item.slug }}
                      />
                    </div>
                    <TrackedLink
                      href={item.href}
                      external={item.external}
                      event={
                        item.slug === "mcp"
                          ? "mcp_install_clicked"
                          : item.slug === "cli"
                            ? "cli_install_clicked"
                            : item.slug === "proxy"
                              ? "proxy_docs_clicked"
                              : "sdk_docs_clicked"
                      }
                      eventProps={{ section: "docs", integration_type: item.slug }}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-warden-soul-light hover:text-white"
                    >
                      {item.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </TrackedLink>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="reference"
              title="Docs that map to real product surfaces."
              copy="The public pages explain product behavior. The repository docs carry implementation-level detail and verification notes."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {docCards.map((card) => {
                const Icon = card.icon;
                return (
                  <TrackedLink
                    key={card.title}
                    href={card.href}
                    external={card.external}
                    event={card.title === "Architecture" ? "architecture_link_clicked" : undefined}
                    eventProps={{ section: "docs", cta_label: card.title }}
                    className="group border border-white/10 bg-white/[0.03] p-5 transition hover:border-warden-soul-light/30"
                  >
                    <Icon className="h-5 w-5 text-warden-soul-light" aria-hidden="true" />
                    <h2 className="mt-5 text-xl font-semibold text-white">{card.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-warden-muted">{card.copy}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-warden-soul-light group-hover:text-white">
                      Open
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </TrackedLink>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeading
              eyebrow="quick start"
              title="Install MCP, then keep the evidence visible."
              copy="The fastest demo path is the MCP server. From there, switch to CLI or SDK when you need explicit policy and receipt control."
              align="left"
            />
            <div className="border border-white/10 bg-black/35 p-5">
              <div className="flex items-start gap-2 border border-white/10 bg-black/45 p-3">
                <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-warden-bone">
                  {mcpInstallCommand}
                </code>
                <CopyCommand text={mcpInstallCommand} compact eventProps={{ section: "docs", integration_type: "mcp" }} />
              </div>
              <div className="mt-6">
                <Checklist
                  items={[
                    "Create a devnet agent and policy.",
                    "Call one paid endpoint through CLI, proxy, SDK, or MCP.",
                    "Confirm the receipt source before reporting metrics.",
                    "Use the dashboard to inspect escrows, disputes, and recovery.",
                  ]}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
