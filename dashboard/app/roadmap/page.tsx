import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { landingLinks, roadmapLanes } from "@/data/landing";
import {
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
  type Tone,
} from "@/components/landing/marketing-shell";
import { TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "Public roadmap for x402warden from payment firewall to trust layer for autonomous x402 commerce.",
};

export default function RoadmapPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="roadmap"
          title="From payment firewall to trust layer for autonomous commerce."
          copy="The roadmap avoids artificial dates. The sequence is about product confidence: verified receipts first, then automation, then mainnet and ecosystem integrations."
          primary={{ label: "Open issues", href: landingLinks.issues, external: true, event: "github_clicked" }}
          secondary={{ label: "Read production gates", href: landingLinks.productionReadiness, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="lanes"
              title="Now, next, later. No launch theater."
              copy="x402warden should earn trust by making payment evidence better before expanding the surface area."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {roadmapLanes.map((lane) => (
                <article key={lane.title} className="border border-white/10 bg-white/[0.03] p-6">
                  <SourceBadge tone={lane.tone as Tone}>{lane.title}</SourceBadge>
                  <ul className="mt-6 space-y-3">
                    {lane.items.map((item) => (
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

        <section className="border-t border-white/10 bg-[#0B1118] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="strategy"
              title="The goal is not another marketplace."
              copy="The goal is the buyer protection layer every x402 marketplace and agent stack can use before autonomous money moves."
              align="left"
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Receipts first", "PaymentReceiptV1 and delivery evidence hashes keep claims verifiable."],
                ["Automation second", "Auto-dispute and spend reports only matter when evidence is reliable."],
                ["Risk with humility", "Merchant risk starts from escrow history, not social reputation or LLM guesses."],
                ["Mainnet last", "Audit, deploy authority, monitoring, and incident response precede real funds."],
              ].map(([title, copy]) => (
                <article key={title} className="border border-white/10 bg-black/25 p-5">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <p className="mt-3 text-sm leading-6 text-warden-muted">{copy}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-7xl">
            <TrackedLink
              href={landingLinks.repo}
              external
              event="github_clicked"
              eventProps={{ section: "roadmap", cta_label: "View GitHub" }}
              className="text-sm font-semibold text-warden-soul-light hover:text-white"
            >
              View GitHub repository
            </TrackedLink>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
