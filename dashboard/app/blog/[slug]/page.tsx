import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts, landingLinks } from "@/data/landing";
import {
  MarketingShell,
  PageHero,
  SectionHeading,
  SourceBadge,
} from "@/components/landing/marketing-shell";
import { TrackedLink } from "@/components/landing/tracked-actions";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const articleBodies: Record<string, Array<{ title: string; copy: string }>> = {
  "why-autonomous-payments-need-buyer-protection": [
    {
      title: "The failure mode is economic, not just technical",
      copy: "An agent can hold keys, parse API responses, and still make a bad purchase. The dangerous moment is when it accepts a price, merchant, or service result faster than a human can review it.",
    },
    {
      title: "Wallets are necessary, but not sufficient",
      copy: "A wallet can custody funds and apply broad controls. It does not usually know whether the paid service delivered useful output, whether the merchant was approved for this workflow, or whether the buyer should recover funds after failure.",
    },
    {
      title: "Buyer protection needs a lifecycle",
      copy: "The minimum useful lifecycle is enforce before payment, escrow during delivery, prove what happened, and recover when objective checks fail. That is the category x402warden is trying to name.",
    },
  ],
  "how-x402warden-escrows-x402-payments-on-solana": [
    {
      title: "Policy runs before funds move",
      copy: "The agent owner configures limits and allowlists in Solana accounts. When an x402 quote arrives, the payment processor checks amount, period budget, pause state, and merchant approval before transferring USDC.",
    },
    {
      title: "Escrow replaces immediate merchant settlement",
      copy: "Allowed payments move into a PaymentEscrow PDA and escrow token account. The merchant does not receive funds immediately, giving the buyer a defined dispute window.",
    },
    {
      title: "Settlement and refund are state transitions",
      copy: "If delivery is acceptable, settlement releases funds after the dispute window. If service fails, the buyer can open a dispute and recover funds through merchant accept or auto-refund paths.",
    },
  ],
  "payment-receipts-for-ai-agents": [
    {
      title: "A transfer hash is not enough",
      copy: "Autonomous payments need receipts that explain what was requested, what policy allowed or blocked it, where the money went, and which response evidence was attached.",
    },
    {
      title: "Evidence sources should be visible",
      copy: "On-chain escrow state is strong evidence for protected, active, settled, and refunded funds. Blocked funds require signed receipts or future on-chain block events. Demo estimates must be labeled as estimates.",
    },
    {
      title: "Receipts make disputes operational",
      copy: "DeliveryEvidenceV1 gives the dispute path objective inputs: status code, response hash, failure code, and optional evidence hash. The system does not need to store large response bodies on-chain to prove a failure class.",
    },
  ],
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  const body = articleBodies[slug];

  if (!post || !body) notFound();

  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow={post.eyebrow}
          title={post.title}
          copy={post.description}
          primary={{ label: "Run demo", href: landingLinks.demo }}
          secondary={{ label: "Back to blog", href: landingLinks.blog }}
        />

        <article className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 flex items-center gap-3">
              <SourceBadge tone="teal">{post.readTime}</SourceBadge>
              <SourceBadge tone="moss">x402warden</SourceBadge>
            </div>
            <div className="space-y-12">
              {body.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-semibold leading-tight text-white md:text-3xl">
                    {section.title}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-warden-muted">
                    {section.copy}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </article>

        <section className="border-t border-white/10 bg-[#0B1118] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeading
              eyebrow="next"
              title="See the protection loop in the product."
              copy="The article explains the category. The demo shows the same idea as money blocked, escrowed, and recovered."
            />
            <div className="mt-8">
              <TrackedLink
                href={landingLinks.demo}
                event="hero_cta_run_demo_clicked"
                eventProps={{ section: "blog_article", cta_label: "Open demo" }}
                className="inline-flex rounded-md border border-white/15 bg-warden-text px-5 py-3 text-sm font-semibold text-warden-black hover:bg-warden-bone"
              >
                Open demo
              </TrackedLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
