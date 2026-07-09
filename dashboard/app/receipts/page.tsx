import type { Metadata } from "next";
import { evidenceSources, landingLinks, receiptSchema } from "@/data/landing";
import {
  Checklist,
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { CopyCommand, TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Payment Receipts",
  description:
    "PaymentReceiptV1 schema, delivery evidence hashes, blocked payment receipts, and evidence sources for x402warden.",
};

export default function ReceiptsPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="receipts"
          title="Every autonomous payment deserves a receipt that proves more than a transfer."
          copy="A receipt should explain the request, the policy decision, where funds went, which delivery evidence hash was recorded, and how settlement ended."
          primary={{ label: "Open demo", href: landingLinks.demo }}
          secondary={{ label: "Protection model", href: landingLinks.protectionModels, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <SectionHeading
                eyebrow="schema"
                title="PaymentReceiptV1 is anchored on PaymentEscrow."
                copy="The v1 receipt stays useful even without an indexer because its core fields come from the on-chain escrow account."
                align="left"
              />
              <div className="mt-8">
                <Checklist
                  items={[
                    "Agent PDA and PaymentEscrow PDA identify the payer-side state.",
                    "Amount, merchant, escrow token account, and state come from escrow.",
                    "Payment requirements and request context hashes prove what was paid for.",
                    "DeliveryEvidenceV1 links HTTP outcome to settlement and disputes.",
                  ]}
                />
              </div>
            </div>
            <div className="border border-white/10 bg-black/35">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="text-sm font-semibold text-white">PaymentReceiptV1</div>
                <CopyCommand
                  text={receiptSchema}
                  compact
                  eventProps={{ section: "receipts", cta_label: "Copy receipt JSON" }}
                />
              </div>
              <pre className="max-h-[560px] overflow-auto p-5 font-mono text-sm leading-6 text-warden-bone">
                <code>{receiptSchema}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#0B1118] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="evidence"
              title="Claims stay credible when the source is explicit."
              copy="The landing and dashboard should not present demo estimates as production truth. Each receipt and metric gets a source label."
            />
            <div className="mt-12 overflow-x-auto border border-white/10">
              <table className="w-full min-w-[760px] border-collapse bg-black/25 text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-warden-dim">
                    <th className="p-4 font-mono text-xs uppercase tracking-[0.2em]">Source</th>
                    <th className="p-4 font-mono text-xs uppercase tracking-[0.2em]">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceSources.map(([source, meaning]) => (
                    <tr key={source} className="border-b border-white/10 last:border-b-0">
                      <td className="p-4 align-top">
                        <SourceBadge tone={source === "local_dev_only" ? "amber" : source === "unavailable" ? "red" : "teal"}>
                          {source}
                        </SourceBadge>
                      </td>
                      <td className="p-4 leading-6 text-warden-muted">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Allowed", "Policy passes, escrow is created, and the paid retry can attach delivery hashes."],
              ["Blocked", "Funds never move. A signed BlockedPaymentReceiptV1 can prove the block off-chain."],
              ["Recovered", "Escrow state changes to refunded through merchant accept or auto-refund path."],
            ].map(([title, copy], index) => (
              <article key={title} className="border border-white/10 bg-white/[0.03] p-5">
                <SourceBadge tone={index === 0 ? "teal" : index === 1 ? "red" : "blue"}>{title}</SourceBadge>
                <p className="mt-5 text-sm leading-6 text-warden-muted">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-7xl">
            <TrackedLink
              href={landingLinks.sdk}
              external
              event="sdk_docs_clicked"
              eventProps={{ section: "receipts", cta_label: "Read SDK receipt builders" }}
              className="text-sm font-semibold text-warden-bone hover:text-white"
            >
              Read SDK receipt builders
            </TrackedLink>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
