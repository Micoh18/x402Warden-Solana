import type { Metadata } from "next";
import { landingLinks, proofItems } from "@/data/landing";
import {
  Checklist,
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { CopyCommand, TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "x402warden en espanol",
  description:
    "Landing en espanol para x402warden: settlement firewall y proteccion del comprador para pagos autonomos x402.",
};

export default function SpanishLandingPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="espanol"
          title="Deja que tus agentes paguen sin entregarles un cheque en blanco."
          copy="x402warden se ubica entre tu agente y cada API pagada: revisa presupuesto y merchants antes de pagar, mantiene USDC en escrow durante la entrega y habilita disputa o refund si el servicio falla."
          primary={{ label: "Ver demo", href: landingLinks.demo }}
          secondary={{ label: "Leer arquitectura", href: landingLinks.architecture, external: true }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeading
              eyebrow="posicionamiento"
              title="Wallets guardan dinero. Checkouts cobran. x402warden protege al pagador."
              copy="La categoria no es otro wallet ni otro checkout. Es una capa de buyer protection para comercio x402 autonomo."
              align="left"
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Enforce", "Politicas de gasto, presupuesto por periodo, pausa y allowlist de merchants antes de mover fondos."],
                ["Escrow", "Cada pago permitido queda en un PaymentEscrow PDA durante la ventana de disputa."],
                ["Prove", "Receipts con hashes de requerimientos, contexto de request y evidencia de entrega."],
                ["Recover", "Disputas y refunds cuando el servicio falla o el merchant acepta la disputa."],
              ].map(([title, copy], index) => (
                <article key={title} className="border border-white/10 bg-white/[0.03] p-5">
                  <SourceBadge tone={index === 0 ? "moss" : index === 1 ? "teal" : index === 2 ? "blue" : "green"}>
                    {title}
                  </SourceBadge>
                  <p className="mt-5 text-sm leading-6 text-warden-muted">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#111317] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="prueba rapida"
                title="Instala MCP o usa CLI para proteger un pago."
                copy="La demo debe mostrar tres cosas: gasto bloqueado, pago bueno en escrow y servicio malo recuperado."
                align="left"
              />
              <div className="mt-8">
                <Checklist items={proofItems} />
              </div>
            </div>
            <div className="border border-white/10 bg-black/35 p-5">
              <div className="flex items-start gap-2 border border-white/10 bg-black/45 p-3">
                <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-warden-bone">
                  npx -y x402warden-mcp
                </code>
                <CopyCommand text="npx -y x402warden-mcp" compact eventProps={{ section: "spanish", integration_type: "mcp" }} />
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={landingLinks.dashboard}
                  event="dashboard_clicked"
                  eventProps={{ section: "spanish", cta_label: "Abrir dashboard" }}
                  className="inline-flex justify-center rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted hover:text-white"
                >
                  Abrir dashboard
                </TrackedLink>
                <TrackedLink
                  href={landingLinks.repo}
                  external
                  event="github_clicked"
                  eventProps={{ section: "spanish", cta_label: "Ver GitHub" }}
                  className="inline-flex justify-center rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white hover:bg-warden-soul-light/20"
                >
                  Ver GitHub
                </TrackedLink>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
