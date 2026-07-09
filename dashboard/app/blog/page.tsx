import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { blogPosts, landingLinks } from "@/data/landing";
import {
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { TrackedLink } from "@/components/landing/tracked-actions";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles about autonomous payments, buyer protection, x402 escrow, and payment receipts for AI agents.",
};

export default function BlogPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="blog"
          title="A short field guide to safer autonomous payments."
          copy="The blog backlog from the launch plan is live as three focused articles: category, architecture, and receipts."
          primary={{ label: "Run demo", href: landingLinks.demo }}
          secondary={{ label: "Read docs", href: landingLinks.docs }}
        />

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="articles"
              title="Autonomous payments need payer-side proof."
              copy="Each article answers a specific objection: why the category matters, how the escrow works, and what a receipt should prove."
            />
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {blogPosts.map((post) => (
                <TrackedLink
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex min-h-[300px] flex-col border border-white/10 bg-white/[0.03] p-6 transition hover:border-warden-soul-light/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <SourceBadge tone="teal">{post.eyebrow}</SourceBadge>
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-warden-dim">
                      {post.readTime}
                    </span>
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold leading-tight text-white">
                    {post.title}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-warden-muted">{post.description}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-warden-soul-light group-hover:text-white">
                    Read article
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </TrackedLink>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
