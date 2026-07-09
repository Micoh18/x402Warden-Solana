import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { comparisonRows, landingLinks } from "@/data/landing";
import {
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
  cn,
} from "@/components/landing/marketing-shell";
import { TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Compare x402warden with wallets, checkouts, marketplaces, and transaction guards for autonomous x402 payments.",
};

const competitors = [
  {
    title: "Agent wallets",
    useful: "Custody, key management, and broad spending controls.",
    gap: "They do not prove service delivery or provide per-payment dispute recovery.",
  },
  {
    title: "x402 checkouts",
    useful: "Quote prices, verify payment, and help merchants collect.",
    gap: "They are optimized for seller flow, not payer-side recovery.",
  },
  {
    title: "Marketplaces",
    useful: "Discovery, routing, reputation, and distribution.",
    gap: "Buyer protection still needs escrow, receipts, and objective failure evidence.",
  },
  {
    title: "Transaction guards",
    useful: "Detect risky transactions before signing.",
    gap: "They usually stop at pre-payment risk and do not manage post-payment delivery failure.",
  },
];

export default function ComparePage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="compare"
          title="Wallets hold money. Checkouts collect money. x402warden protects the payer."
          copy="x402warden is complementary infrastructure for autonomous commerce. It sits before and after settlement: policy checks before payment, escrow during delivery, and recovery when service fails."
          primary={{ label: "Run demo", href: landingLinks.demo }}
          secondary={{ label: "Read architecture", href: landingLinks.architecture, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="capabilities"
              title="Built for the missing side of x402: the buyer."
              copy="Most tools cover custody or collection. x402warden covers the full payment lifecycle from rule enforcement to evidence-backed recovery."
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

        <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-4">
            {competitors.map((item, index) => (
              <article key={item.title} className="border border-white/10 bg-white/[0.03] p-5">
                <SourceBadge tone={index === 0 ? "moss" : index === 1 ? "blue" : index === 2 ? "amber" : "teal"}>
                  {item.title}
                </SourceBadge>
                <h2 className="mt-5 text-lg font-semibold text-white">Where it helps</h2>
                <p className="mt-2 text-sm leading-6 text-warden-muted">{item.useful}</p>
                <h3 className="mt-5 text-lg font-semibold text-white">Where protection stops</h3>
                <p className="mt-2 text-sm leading-6 text-warden-muted">{item.gap}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="buyer lifecycle"
              title="The distinction is the recovery path."
              copy="A pre-payment block is useful, but autonomous commerce also needs to answer what happens after the agent paid and the service failed."
              align="left"
            />
            <div className="grid gap-3">
              {["Pre-payment policy", "Per-payment escrow", "Delivery evidence hash", "Dispute state", "Refund or settlement result"].map((item) => (
                <div key={item} className="flex items-center gap-3 border border-white/10 bg-black/25 p-4 text-sm text-warden-muted">
                  <CheckCircle2 className="h-4 w-4 text-warden-soul-light" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
              <TrackedLink
                href={landingLinks.receipts}
                event="hero_cta_docs_clicked"
                eventProps={{ section: "compare", cta_label: "View receipt model" }}
                className="inline-flex items-center gap-2 pt-4 text-sm font-semibold text-warden-soul-light hover:text-white"
              >
                View receipt model
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
