import type { Metadata } from "next";
import { landingLinks, threatModel } from "@/data/landing";
import {
  Checklist,
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Threat model, on-chain security controls, signer constraints, SPL token constraints, and production readiness for x402warden.",
};

export default function SecurityPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="security"
          title="A payment firewall is only credible when its evidence and limits are explicit."
          copy="x402warden uses Solana accounts for policy, allowlists, escrow, disputes, and evidence hashes. This page summarizes the threat model and the controls behind the landing claims."
          primary={{ label: "Read production checklist", href: landingLinks.productionReadiness, external: true, event: "hero_cta_docs_clicked" }}
          secondary={{ label: "Open architecture", href: landingLinks.architecture, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="threat model"
              title="The main risk is not key custody. It is bad settlement."
              copy="Autonomous agents can make valid signatures for bad economic outcomes. x402warden controls the before, during, and after of each payment."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-5">
              {threatModel.map((item, index) => (
                <article key={item.threat} className="border border-white/10 bg-white/[0.03] p-5">
                  <SourceBadge tone={index === 0 ? "red" : index === 1 ? "amber" : index === 2 ? "teal" : index === 3 ? "green" : "blue"}>
                    risk {index + 1}
                  </SourceBadge>
                  <h2 className="mt-5 text-lg font-semibold text-white">{item.threat}</h2>
                  <p className="mt-3 text-sm leading-6 text-warden-muted">{item.control}</p>
                  <p className="mt-4 border-t border-white/10 pt-4 font-mono text-xs leading-5 text-warden-dim">
                    {item.evidence}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-3">
            <div>
              <SectionHeading
                eyebrow="on-chain checks"
                title="Seeds, signers, and token accounts are the core controls."
                copy="The program model is designed so policy updates, payment processing, escrow token movement, and dispute outcomes have explicit authority constraints."
                align="left"
              />
            </div>
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
              <article className="border border-white/10 bg-black/25 p-5">
                <SourceBadge tone="moss">seeds</SourceBadge>
                <Checklist
                  items={[
                    'AgentAccount: ["agent", owner, agent_id]',
                    'PolicyAccount: ["policy", agent_account]',
                    'PaymentEscrow: ["payment", agent_account, payment_count]',
                    'DisputeAccount: ["dispute", payment_escrow]',
                  ]}
                />
              </article>
              <article className="border border-white/10 bg-black/25 p-5">
                <SourceBadge tone="teal">authorities</SourceBadge>
                <Checklist
                  items={[
                    "Policy updates require the owner signer.",
                    "Payment processing enforces agent ownership.",
                    "Merchant dispute actions require merchant signer.",
                    "Settlement and refund use PaymentEscrow PDA signer seeds.",
                  ]}
                />
              </article>
              <article className="border border-white/10 bg-black/25 p-5">
                <SourceBadge tone="blue">spl tokens</SourceBadge>
                <Checklist
                  items={[
                    "Payment source token account must be owned by the agent owner.",
                    "Escrow token account is owned by the PaymentEscrow PDA.",
                    "Merchant settlement account must belong to the merchant.",
                    "Refund account must belong to the buyer owner.",
                  ]}
                />
              </article>
              <article className="border border-white/10 bg-black/25 p-5">
                <SourceBadge tone="amber">known limits</SourceBadge>
                <Checklist
                  items={[
                    "Delivery evidence stores hashes and compact codes, not response bodies.",
                    "Blocked USDC is production-grade only with signed receipts or on-chain block events.",
                    "Merchant risk profiles are escrow-history summaries, not broad reputation.",
                    "Mainnet requires SBF build, audit, and upgrade authority controls.",
                  ]}
                />
              </article>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading
              eyebrow="next gate"
              title="Do not move real funds until the production gates pass."
              copy="The repo already records local gates, manual devnet gates, and mainnet checklist items. Treat those as release evidence only when freshly re-run."
            />
            <div className="mt-8">
              <TrackedLink
                href={landingLinks.productionReadiness}
                external
                event="architecture_link_clicked"
                eventProps={{ section: "security", cta_label: "Production readiness" }}
                className="inline-flex items-center justify-center rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white hover:bg-warden-soul-light/20"
              >
                Production readiness
              </TrackedLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
