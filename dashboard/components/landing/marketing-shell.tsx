import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { footerGroups, landingLinks } from "@/data/landing";
import type { LandingEventName } from "@/lib/landing-analytics";
import { MarketingHeader } from "./marketing-header";
import { TrackedLink } from "./tracked-actions";

export type Tone = "teal" | "amber" | "red" | "green" | "blue" | "moss";

export const toneStyles: Record<Tone, string> = {
  teal: "border-warden-soul-light/30 bg-warden-soul-light/10 text-warden-soul-light",
  amber: "border-[#D8B35E]/30 bg-[#D8B35E]/10 text-[#E3C46F]",
  red: "border-[#E36C61]/30 bg-[#E36C61]/10 text-[#F08A7D]",
  green: "border-[#93B978]/30 bg-[#93B978]/10 text-[#A9CB8A]",
  blue: "border-warden-heart/30 bg-warden-heart/10 text-warden-heart",
  moss: "border-warden-lichen/30 bg-warden-lichen/10 text-warden-lichen",
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SourceBadge({ children, tone = "teal" }: { children: React.ReactNode; tone?: Tone }) {
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

export function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.28em] text-warden-soul-light">
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl")}>
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

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#090A0B] text-foreground">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  primary,
  secondary,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  primary?: { label: string; href: string; external?: boolean; event?: LandingEventName };
  secondary?: { label: string; href: string; external?: boolean; event?: LandingEventName };
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(215,227,106,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(215,227,106,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] text-white md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-warden-muted md:text-xl">
            {copy}
          </p>
          {(primary || secondary) && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {primary && (
                <TrackedLink
                  href={primary.href}
                  external={primary.external}
                  event={primary.event ?? "hero_cta_run_demo_clicked"}
                  eventProps={{ section: eyebrow.toLowerCase(), cta_label: primary.label }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/40 bg-warden-soul-light/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-warden-soul-light/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  {primary.label}
                </TrackedLink>
              )}
              {secondary && (
                <TrackedLink
                  href={secondary.href}
                  external={secondary.external}
                  event={secondary.event ?? "hero_cta_docs_clicked"}
                  eventProps={{ section: eyebrow.toLowerCase(), cta_label: secondary.label }}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-5 py-3 text-sm font-semibold text-warden-muted transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60"
                >
                  {secondary.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </TrackedLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-warden-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-warden-soul-light" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#090A0B] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.2fr_2.4fr]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="" width={28} height={28} />
            <span className="font-semibold text-white">x402warden</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-warden-muted">
            Settlement firewall and buyer protection layer for autonomous x402 payments on Solana.
          </p>
          <div className="mt-5 flex gap-2">
            <SourceBadge tone="teal">x402-native</SourceBadge>
            <SourceBadge tone="moss">devnet</SourceBadge>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">
                {group.title}
              </p>
              <div className="mt-4 space-y-2">
                {group.links.map((item) => (
                  <TrackedLink
                    key={item.label}
                    href={item.href}
                    external={item.external}
                    event={
                      item.label === "GitHub"
                        ? "github_clicked"
                        : item.label === "Dashboard"
                          ? "dashboard_clicked"
                          : undefined
                    }
                    eventProps={{ section: "footer", cta_label: item.label }}
                    className="block text-sm text-warden-muted transition hover:text-white"
                  >
                    {item.label}
                  </TrackedLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-xs leading-6 text-warden-dim">
        x402warden reports protected, blocked, escrowed, and recovered funds only with explicit evidence sources.
        See the <Link href={landingLinks.security} className="text-warden-muted hover:text-white"> security model</Link>.
      </div>
    </footer>
  );
}
