import type { Metadata } from "next";
import { landingLinks } from "@/data/landing";
import { DemoSimulator } from "@/components/landing/demo-simulator";
import {
  MarketingShell,
  PageHero,
  SectionHeading,
} from "@/components/landing/marketing-shell";

export const metadata: Metadata = {
  title: "Interactive Demo",
  description:
    "Run through x402warden demo scenarios: overspend blocked, good payment escrowed, and bad service recovered.",
};

export default function DemoPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="interactive demo"
          title="The same agent tries three payments. Only the safe outcomes move money."
          copy="Switch between the core scenarios from the demo narrative: a blocked overspend, a valid escrowed x402 payment, and a failed service recovered through dispute."
          primary={{ label: "Protect an agent", href: landingLinks.integrate, event: "cli_install_clicked" }}
          secondary={{ label: "Read demo guide", href: landingLinks.demoGuide, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="scenarios"
              title="Block bad spend, escrow good spend, recover failed spend."
              copy="The demo keeps claims tied to evidence sources. Blocked USDC must be signed or marked as estimate; protected and recovered funds come from escrow state."
            />
            <div className="mt-12">
              <DemoSimulator />
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
