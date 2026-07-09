"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import {
  trackLandingEvent,
  type LandingEventName,
  type LandingEventProperties,
} from "@/lib/landing-analytics";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function TrackedLink({
  href,
  children,
  className,
  event,
  eventProps,
  external = false,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  event?: LandingEventName;
  eventProps?: LandingEventProperties;
  external?: boolean;
  ariaLabel?: string;
}) {
  const onClick = () => {
    if (event) trackLandingEvent(event, { href, ...eventProps });
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

export function CopyCommand({
  text,
  label = "Copy",
  compact = false,
  eventProps,
}: {
  text: string;
  label?: string;
  compact?: boolean;
  eventProps?: LandingEventProperties;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackLandingEvent("copy_command_clicked", {
      cta_label: label,
      ...eventProps,
    });
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] text-sm text-warden-muted transition hover:border-[#7CFFB2]/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7CFFB2]/60",
        compact ? "px-2.5 py-2" : "px-3 py-2"
      )}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Clipboard className="h-4 w-4" aria-hidden="true" />
      )}
      {!compact && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}
