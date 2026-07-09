import type { MetadataRoute } from "next";

const routes = [
  "",
  "/docs",
  "/demo",
  "/compare",
  "/receipts",
  "/security",
  "/roadmap",
  "/blog",
  "/blog/why-autonomous-payments-need-buyer-protection",
  "/blog/how-x402warden-escrows-x402-payments-on-solana",
  "/blog/payment-receipts-for-ai-agents",
  "/es",
  "/integrate",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://x402warden.dev";

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date("2026-07-09"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
