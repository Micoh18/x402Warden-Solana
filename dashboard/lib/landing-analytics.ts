"use client";

export type LandingEventName =
  | "landing_viewed"
  | "hero_cta_run_demo_clicked"
  | "hero_cta_docs_clicked"
  | "copy_command_clicked"
  | "mcp_install_clicked"
  | "cli_install_clicked"
  | "proxy_docs_clicked"
  | "sdk_docs_clicked"
  | "demo_scenario_selected"
  | "comparison_viewed"
  | "architecture_link_clicked"
  | "github_clicked"
  | "dashboard_clicked";

export type LandingEventProperties = {
  section?: string;
  cta_label?: string;
  integration_type?: string;
  demo_scenario?: string;
  href?: string;
  viewport?: string;
  referrer?: string;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackLandingEvent(
  event: LandingEventName,
  properties: LandingEventProperties = {}
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    ...properties,
    viewport:
      properties.viewport ?? `${window.innerWidth}x${window.innerHeight}`,
    referrer: properties.referrer ?? document.referrer ?? "",
  };

  window.dispatchEvent(
    new CustomEvent("x402warden:landing-event", { detail: payload })
  );
  window.dataLayer?.push(payload);
}
