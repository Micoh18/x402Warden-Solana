type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

export type LandingIntegration = {
  slug: "mcp" | "cli" | "proxy" | "sdk";
  title: string;
  copy: string;
  command: string;
  cta: string;
  href: string;
  external?: boolean;
};

export const landingLinks = {
  repo: "https://github.com/Micoh18/x402Warden-Solana",
  docs: "/docs",
  demo: "/demo",
  compare: "/compare",
  receipts: "/receipts",
  security: "/security",
  roadmap: "/roadmap",
  dashboard: "/agents",
  dashboardAlias: "/dashboard",
  integrate: "/integrate",
  spanish: "/es",
  blog: "/blog",
  architecture:
    "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/architecture.md",
  demoGuide:
    "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/demo.md",
  policies:
    "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/policies.md",
  sdk: "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/sdk.md",
  protectionModels:
    "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/protection-models.md",
  productionReadiness:
    "https://github.com/Micoh18/x402Warden-Solana/blob/main/docs/production-readiness.md",
  issues: "https://github.com/Micoh18/x402Warden-Solana/issues",
  x402: "https://www.x402.org/",
  discord: "https://github.com/Micoh18/x402Warden-Solana/discussions",
  twitter: "https://x.com/search?q=x402warden",
  contact: "https://github.com/Micoh18/x402Warden-Solana/issues/new",
};

export const mcpInstallCommand = "npx -y x402warden-mcp";

export const siteNavItems = [
  { label: "How it works", href: "/#how" },
  { label: "Receipts", href: landingLinks.receipts },
  { label: "Demo", href: landingLinks.demo },
  { label: "Docs", href: landingLinks.docs },
  { label: "Compare", href: landingLinks.compare },
];

export const footerGroups: FooterGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: landingLinks.dashboard },
      { label: "CLI", href: landingLinks.integrate },
      { label: "MCP", href: landingLinks.docs },
      { label: "Proxy", href: landingLinks.integrate },
      { label: "SDK", href: landingLinks.sdk, external: true },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Docs", href: landingLinks.docs },
      { label: "Architecture", href: landingLinks.architecture, external: true },
      { label: "Policies", href: landingLinks.policies, external: true },
      { label: "Demo guide", href: landingLinks.demoGuide, external: true },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "GitHub", href: landingLinks.repo, external: true },
      { label: "Roadmap", href: landingLinks.roadmap },
      { label: "Security", href: landingLinks.security },
      { label: "x402", href: landingLinks.x402, external: true },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: landingLinks.discord, external: true },
      { label: "X/Twitter", href: landingLinks.twitter, external: true },
      { label: "Contact", href: landingLinks.contact, external: true },
      { label: "Spanish", href: landingLinks.spanish },
    ],
  },
];

export const proofItems = [
  "On-chain policy enforcement",
  "Per-payment escrow",
  "Dispute + refund path",
  "CLI / Proxy / SDK / MCP",
];

export const protectionMetrics = [
  {
    value: "125 USDC",
    label: "USDC protected",
    detail: "Total volume guarded by policy and escrow.",
    source: "on-chain escrow",
    tone: "teal",
  },
  {
    value: "25 USDC",
    label: "USDC blocked",
    detail: "Overspend stopped before settlement.",
    source: "signed receipt or demo estimate",
    tone: "red",
  },
  {
    value: "15 USDC",
    label: "USDC in escrow",
    detail: "Funds held during the dispute window.",
    source: "on-chain escrow",
    tone: "amber",
  },
  {
    value: "5 USDC",
    label: "USDC recovered",
    detail: "Failed services converted into refunds.",
    source: "refunded escrow",
    tone: "green",
  },
] as const;

export const demoScenarios = [
  {
    slug: "overspend-blocked",
    name: "Overspend blocked",
    status: "Blocked",
    tone: "red",
    prompt: "Agent requests a 25 USDC report while max_per_call is 5 USDC.",
    rule: "Amount exceeds the per-call policy before any USDC leaves the buyer wallet.",
    result: "No escrow is created. The buyer receives a signed blocked-payment receipt.",
    metric: "+25 USDC blocked",
    source: "signed receipt or demo estimate",
  },
  {
    slug: "good-payment",
    name: "Good payment",
    status: "Escrowed",
    tone: "teal",
    prompt: "Agent calls an approved research API with a 5 USDC x402 quote.",
    rule: "Merchant allowlist, per-call limit, and period budget all pass.",
    result: "USDC moves into escrow, the paid retry returns data, and the receipt records delivery hashes.",
    metric: "+5 USDC protected",
    source: "on-chain escrow",
  },
  {
    slug: "bad-service-recovered",
    name: "Bad service recovered",
    status: "Recovered",
    tone: "green",
    prompt: "Agent pays an endpoint that returns malformed or empty data.",
    rule: "Delivery evidence fails objective checks during the dispute window.",
    result: "A dispute opens and the refund path returns escrowed funds to the buyer.",
    metric: "+5 USDC recovered",
    source: "refunded escrow",
  },
] as const;

export const integrations: LandingIntegration[] = [
  {
    slug: "mcp",
    title: "MCP server",
    copy: "Let Claude, Cursor, and MCP-compatible clients call x402 tools with policy limits, escrow, and dispute protection.",
    command: mcpInstallCommand,
    cta: "Install MCP",
    href: landingLinks.docs,
  },
  {
    slug: "cli",
    title: "CLI",
    copy: "Any agent can shell out to a command and receive structured JSON back.",
    command: "npx x402warden pay https://api.example.com/research",
    cta: "View CLI guide",
    href: landingLinks.integrate,
  },
  {
    slug: "proxy",
    title: "HTTP proxy",
    copy: "Route paid requests through a local proxy without rewriting the agent.",
    command: "HTTP_PROXY=http://localhost:4020 python agent.py",
    cta: "Use proxy",
    href: landingLinks.integrate,
  },
  {
    slug: "sdk",
    title: "TypeScript SDK",
    copy: "Create agents, set policies, process payments, record evidence, and open disputes from your app.",
    command: "await client.processPayment(agentPda, amount, merchant, requestHash)",
    cta: "Read SDK docs",
    href: landingLinks.sdk,
    external: true,
  },
];

export const comparisonRows = [
  ["Hold funds", "Yes", "No", "No"],
  ["Quote price", "No", "Yes", "Reads"],
  ["Spending caps", "Some", "No", "Yes"],
  ["Merchant allowlist", "Some", "No", "Yes"],
  ["Escrow per payment", "No", "Rare", "Yes"],
  ["Dispute path", "No", "Seller-side", "Buyer-side"],
  ["Refund recovery", "No", "Manual", "Built-in"],
  ["Receipts", "Logs", "Payment proof", "Service evidence"],
] as const;

export const receiptSchema = `{
  "version": 1,
  "source": "on_chain_payment_escrow",
  "agentPda": "Agt...Pda",
  "paymentEscrow": "Esc...Pda",
  "paymentId": "42",
  "merchant": "8x4...Pda",
  "amount": "5000000",
  "escrowTokenAccount": "Tok...Esc",
  "x402RequestHash": "2f9d...",
  "paymentRequirementsHash": "18c0...",
  "requestContextHash": "7b91...",
  "txSignature": "4fW...ABCD",
  "state": "pending",
  "createdAt": "2026-07-09T12:00:00.000Z",
  "settleAfter": "2026-07-09T12:05:00.000Z",
  "deliveryEvidence": {
    "version": 1,
    "paymentEscrow": "Esc...Pda",
    "source": "on_chain_account",
    "statusCode": 200,
    "responseHash": "9f4c...",
    "evidenceHash": "a81e..."
  }
}`;

export const evidenceSources = [
  ["on_chain_account", "Current Solana account state such as PaymentEscrow, DisputeAccount, or PaymentEvidenceAccount."],
  ["on_chain_event", "Program event emitted by a confirmed transaction and indexed with signature context."],
  ["signed_off_chain_record", "Canonical JSON signed by the buyer or agent wallet before funds move."],
  ["caller_provided", "Runtime evidence observed by CLI, MCP, proxy, or dashboard caller."],
  ["local_dev_only", "Mock or fixture data. It must be labeled as demo-only and never as production proof."],
  ["unavailable", "No reliable source exists yet, so the product should say unavailable."],
] as const;

export const roadmapLanes = [
  {
    title: "Now",
    tone: "teal",
    items: [
      "Policy enforcement",
      "Per-payment escrow",
      "Disputes",
      "CLI",
      "SDK",
      "Proxy",
      "MCP",
      "Dashboard",
      "Devnet demo",
    ],
  },
  {
    title: "Next",
    tone: "amber",
    items: [
      "Payment receipts with delivery evidence hashes",
      "Auto-dispute checks",
      "Merchant risk score",
      "Dashboard spend report",
      "Better demo metrics",
    ],
  },
  {
    title: "Later",
    tone: "blue",
    items: [
      "Policy DSL",
      "Marketplace integrations",
      "Agent framework plugins",
      "Mainnet audit",
      "Multi-sig enterprise overrides",
      "Webhooks",
      "Reputation graph",
    ],
  },
] as const;

export const threatModel = [
  {
    threat: "Overspend by prompt or merchant manipulation",
    control: "PolicyAccount checks max_per_call and max_per_period before transfer.",
    evidence: "BlockedPaymentReceiptV1 or failed process_x402_payment transaction.",
  },
  {
    threat: "Unknown merchant receives funds",
    control: "MerchantAllowlistAccount gates the merchant address when allowlists are enabled.",
    evidence: "Policy state plus allowlist account state.",
  },
  {
    threat: "Service fails after payment",
    control: "PaymentEscrow holds funds through a dispute window before settlement.",
    evidence: "PaymentEscrow state and DeliveryEvidenceV1 hashes.",
  },
  {
    threat: "Merchant contests or ignores dispute",
    control: "DisputeAccount tracks response deadline and enables accept or auto-refund paths.",
    evidence: "DisputeAccount state and escrow settlement/refund result.",
  },
  {
    threat: "Dashboard overclaims saved funds",
    control: "Protection metrics require explicit evidence sources and mark demo estimates.",
    evidence: "buildProtectionMetricsV1 aggregation rules in the SDK.",
  },
] as const;

export const blogPosts = [
  {
    slug: "why-autonomous-payments-need-buyer-protection",
    title: "Why Autonomous Payments Need Buyer Protection",
    description:
      "AI agents can now discover paid services and spend at machine speed. The missing layer is payer-side protection.",
    eyebrow: "Category",
    readTime: "5 min",
  },
  {
    slug: "how-x402warden-escrows-x402-payments-on-solana",
    title: "How x402warden Escrows x402 Payments on Solana",
    description:
      "A practical walkthrough of policies, PaymentEscrow accounts, dispute windows, and settlement.",
    eyebrow: "Architecture",
    readTime: "7 min",
  },
  {
    slug: "payment-receipts-for-ai-agents",
    title: "Payment Receipts for AI Agents",
    description:
      "A receipt should prove the request, the policy decision, the escrow state, and the delivery evidence.",
    eyebrow: "Receipts",
    readTime: "6 min",
  },
] as const;
