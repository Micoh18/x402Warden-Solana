"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { demoScenarios } from "@/data/landing";
import { trackLandingEvent } from "@/lib/landing-analytics";
import { cn, SourceBadge, toneStyles, type Tone } from "./marketing-shell";
import { CopyCommand, TrackedLink } from "./tracked-actions";

export function DemoSimulator() {
  const [active, setActive] = useState(0);
  const scenario = demoScenarios[active];
  const command =
    scenario.slug === "overspend-blocked"
      ? "npx x402warden pay https://api.example.com/research --max-amount 5000000"
      : scenario.slug === "good-payment"
        ? "npx x402warden pay https://api.example.com/research --record-evidence-on-chain"
        : "npx x402warden pay https://api.example.com/bad-data --auto-dispute";

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-3">
        {demoScenarios.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => {
              setActive(index);
              trackLandingEvent("demo_scenario_selected", {
                section: "demo_page",
                demo_scenario: item.slug,
              });
            }}
            className={cn(
              "w-full border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warden-soul-light/60",
              active === index
                ? "border-[#7CFFB2]/35 bg-[#7CFFB2]/[0.07]"
                : "border-white/10 bg-white/[0.03] hover:border-white/20"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">{item.name}</h2>
              <SourceBadge tone={item.tone as Tone}>{item.status}</SourceBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-warden-muted">{item.prompt}</p>
          </button>
        ))}
      </div>

      <div className="border border-white/10 bg-black/30">
        <div className="border-b border-white/10 p-5">
          <SourceBadge tone={scenario.tone as Tone}>{scenario.source}</SourceBadge>
          <h2 className="mt-5 text-2xl font-semibold text-white">{scenario.name}</h2>
          <p className="mt-4 text-sm leading-7 text-warden-muted">{scenario.result}</p>
        </div>
        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-white/10 p-5 md:border-b-0 md:border-r">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">
              metric update
            </p>
            <p className="mt-4 text-3xl font-semibold text-white">{scenario.metric}</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-warden-dim">
              policy decision
            </p>
            <p className="mt-4 text-sm leading-6 text-warden-bone">{scenario.rule}</p>
          </div>
        </div>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-start gap-2 border border-white/10 bg-black/35 p-3">
            <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-5 text-warden-bone">
              {command}
            </code>
            <CopyCommand
              text={command}
              compact
              eventProps={{ section: "demo_page", demo_scenario: scenario.slug }}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={cn("border p-4", toneStyles[scenario.tone as Tone])}>
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em]">
                enforce - escrow - prove - recover
              </p>
            </div>
            <TrackedLink
              href="/integrate"
              event="cli_install_clicked"
              eventProps={{ section: "demo_page", cta_label: "Protect an agent" }}
              className="inline-flex items-center justify-center gap-2 border border-white/15 bg-warden-text p-4 text-sm font-semibold text-warden-black transition hover:bg-warden-bone"
            >
              Protect an agent
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedLink>
          </div>
          <Image
            src="/mcp-demo.gif"
            alt="x402warden MCP demo running in an agent environment"
            width={960}
            height={540}
            unoptimized
            className="mt-4 h-auto w-full border border-white/10"
          />
        </div>
      </div>
    </div>
  );
}
