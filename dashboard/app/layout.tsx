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
  title: "x402warden — AI Agent Security",
  description: "Security smart account for AI agents on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${orbitron.variable} ${jetbrainsMono.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
