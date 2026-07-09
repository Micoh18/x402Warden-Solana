"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Github, Menu, WalletCards, X } from "lucide-react";
import { landingLinks, siteNavItems } from "@/data/landing";
import { trackLandingEvent } from "@/lib/landing-analytics";
import { TrackedLink } from "./tracked-actions";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-[#090A0B]/92 backdrop-blur-xl transition-colors",
        scrolled ? "border-warden-soul-light/20" : "border-white/10"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="x402warden home">
          <Image src="/logo.svg" alt="" width={30} height={30} priority />
          <span className="text-base font-semibold text-white">x402warden</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {siteNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-warden-muted transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <TrackedLink
            href={landingLinks.repo}
            external
            event="github_clicked"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-warden-muted transition hover:border-white/25 hover:text-white"
            ariaLabel="Open GitHub"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </TrackedLink>
          <TrackedLink
            href={landingLinks.dashboard}
            event="dashboard_clicked"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm text-warden-muted transition hover:border-white/25 hover:text-white"
          >
            <WalletCards className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </TrackedLink>
          <TrackedLink
            href={landingLinks.demo}
            event="hero_cta_run_demo_clicked"
            eventProps={{ section: "header", cta_label: "Run Demo" }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-4 text-sm font-semibold text-white transition hover:bg-warden-soul-light/15"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            Run demo
          </TrackedLink>
        </div>

        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm font-semibold text-white lg:hidden"
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
            {siteNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-warden-muted hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href={landingLinks.repo}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackLandingEvent("github_clicked", { section: "mobile_header" })}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-white"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                GitHub
              </a>
              <Link
                href={landingLinks.demo}
                onClick={() => {
                  setOpen(false);
                  trackLandingEvent("hero_cta_run_demo_clicked", {
                    section: "mobile_header",
                    cta_label: "Run Demo",
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-warden-soul-light/35 bg-warden-soul-light/10 px-3 py-2 text-sm font-semibold text-white"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                Run demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
