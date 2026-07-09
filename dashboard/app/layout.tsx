import type { Metadata } from "next";
import { Orbitron, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://x402warden.dev"),
  title: {
    default: "x402warden - Settlement firewall for autonomous AI payments",
    template: "%s | x402warden",
  },
  description:
    "Protect x402 payments with on-chain policies, merchant allowlists, per-payment escrow, disputes, and refunds for autonomous AI agents.",
  keywords: [
    "x402 payment firewall",
    "AI agent payments",
    "autonomous payments",
    "Solana x402",
    "buyer protection x402",
    "agent wallet limits",
    "escrow for AI agents",
    "x402 dispute protection",
    "MCP payments",
    "programmable payment policy",
  ],
  openGraph: {
    title: "Let AI agents pay without giving them a blank check",
    description:
      "x402warden is the buyer protection layer for x402: policy checks before payment, escrow during delivery, and recovery when services fail.",
    type: "website",
  },
  icons: {
    icon: "/logo.svg",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "x402warden",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web, CLI, MCP",
  description:
    "Settlement firewall and buyer protection layer for autonomous x402 payments on Solana.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${orbitron.variable} ${jetbrainsMono.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
