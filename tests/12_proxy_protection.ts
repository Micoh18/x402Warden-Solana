import { expect } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";
import {
  REASON_BAD_RESPONSE,
  reasonUriToEvidenceHash,
  verifyBlockedPaymentReceiptV1,
} from "../sdk/src";
import { interceptRequest } from "../proxy/src/interceptor";

function buildMockClient(args: {
  agentPda: PublicKey;
  merchant: PublicKey;
  amount?: number;
  onOpenDispute?: (args: {
    agentPda: string;
    escrowPda: string;
    reasonCode: number;
    reasonUri: number[];
  }) => void;
  recordEvidenceError?: string;
  onRecordEvidence?: (args: {
    agentPda: string;
    escrowPda: string;
    params: unknown;
  }) => void;
}) {
  const usdcTokenAccount = Keypair.generate().publicKey;
  const escrowTokenAccount = Keypair.generate().publicKey;
  let processPaymentCalls = 0;
  let openDisputeCalls = 0;
  let recordPaymentEvidenceCalls = 0;

  return {
    programId: Keypair.generate().publicKey,
    get processPaymentCalls() {
      return processPaymentCalls;
    },
    get openDisputeCalls() {
      return openDisputeCalls;
    },
    get recordPaymentEvidenceCalls() {
      return recordPaymentEvidenceCalls;
    },
    async getAgent() {
      return {
        usdcTokenAccount,
        paymentCount: new BN(0),
      };
    },
    async processPayment() {
      processPaymentCalls += 1;
      return "payment-tx-signature";
    },
    async getPayment(paymentEscrow: PublicKey) {
      return {
        agent: args.agentPda,
        paymentId: new BN(0),
        merchant: args.merchant,
        amount: new BN(args.amount ?? 1_000_000),
        escrowTokenAccount,
        createdAt: new BN(1_700_000_000),
        settleAfter: new BN(1_700_000_300),
        state: { pending: {} },
        x402RequestHash: new Array(32).fill(7),
        bump: 255,
      };
    },
    async openDispute(
      agentPda: PublicKey,
      escrowPda: PublicKey,
      reasonCode: number,
      reasonUri: number[]
    ) {
      openDisputeCalls += 1;
      args.onOpenDispute?.({
        agentPda: agentPda.toBase58(),
        escrowPda: escrowPda.toBase58(),
        reasonCode,
        reasonUri,
      });
      return "dispute-tx-signature";
    },
    async recordPaymentEvidence(
      agentPda: PublicKey,
      escrowPda: PublicKey,
      params: unknown
    ) {
      recordPaymentEvidenceCalls += 1;
      args.onRecordEvidence?.({
        agentPda: agentPda.toBase58(),
        escrowPda: escrowPda.toBase58(),
        params,
      });
      if (args.recordEvidenceError) {
        throw new Error(args.recordEvidenceError);
      }
      return "evidence-tx-signature";
    },
  };
}

describe("12 - Proxy Protection", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("blocks over-budget 402 responses with a signed receipt before payment", async () => {
    const signer = Keypair.generate();
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;

    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          accepts: [
            {
              maxAmountRequired: "10000000",
              payTo: merchant.toBase58(),
              network: "solana-devnet",
              description: "premium report",
            },
          ],
        }),
        {
          status: 402,
          headers: { "content-type": "application/json" },
        }
      );
    }) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/research",
      "GET",
      {},
      undefined,
      {} as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        signer: signer.publicKey,
        secretKey: signer.secretKey,
        agentId: 9,
        maxAmount: 5_000_000,
      }
    );

    expect(fetchCalls).to.equal(1);
    expect(result.paymentMade).to.equal(false);
    expect(result.statusCode).to.equal(402);
    expect(result.blockedSource).to.equal("signed_off_chain_record");
    expect(result.blockedReceipt?.reasonCode).to.equal("MAX_AMOUNT_EXCEEDED");
    expect(result.blockedReceipt?.amountRequested).to.equal("10000000");
    expect(result.blockedReceipt?.maxAllowed).to.equal("5000000");
    expect(result.blockedReceipt && verifyBlockedPaymentReceiptV1(result.blockedReceipt)).to.equal(true);

    const body = JSON.parse(result.body.toString("utf-8"));
    expect(body.status).to.equal("blocked");
    expect(body.blockedReceipt.reasonCode).to.equal("MAX_AMOUNT_EXCEEDED");
  });

  it("marks unsigned proxy block explanations as caller-provided evidence", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          accepts: [
            {
              maxAmountRequired: "7000000",
              payTo: merchant.toBase58(),
              network: "solana-devnet",
              description: "premium report",
            },
          ],
        }),
        {
          status: 402,
          headers: { "content-type": "application/json" },
        }
      )) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/research",
      "GET",
      {},
      undefined,
      {} as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        maxAmount: 5_000_000,
      }
    );

    expect(result.paymentMade).to.equal(false);
    expect(result.blockedSource).to.equal("caller_provided");
    expect(result.blockedReceipt).to.equal(undefined);

    const body = JSON.parse(result.body.toString("utf-8"));
    expect(body.status).to.equal("blocked");
    expect(body.blockedSource).to.equal("caller_provided");
    expect(body.blockedReceipt).to.equal(undefined);
  });

  it("does not auto-dispute when the paid retry satisfies delivery checks", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const client = buildMockClient({ agentPda, merchant, amount: 2_000_000 });
    const responses = [
      new Response(
        JSON.stringify({
          accepts: [
            {
              maxAmountRequired: "2000000",
              payTo: merchant.toBase58(),
              network: "solana-devnet",
              description: "dataset",
            },
          ],
        }),
        {
          status: 402,
          headers: { "content-type": "application/json" },
        }
      ),
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ];

    globalThis.fetch = (async () => responses.shift()!) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/dataset",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        autoDisputeOnFail: true,
        expectJson: true,
        expectNonEmpty: true,
      }
    );

    expect(client.processPaymentCalls).to.equal(1);
    expect(client.openDisputeCalls).to.equal(0);
    expect(result.paymentMade).to.equal(true);
    expect(result.statusCode).to.equal(200);
    expect(result.delivery?.delivered).to.equal(true);
    expect(result.delivery?.evidence.failureCode).to.equal(undefined);
    expect(result.autoDispute).to.equal(undefined);
    expect(result.receipt?.deliveryEvidence?.source).to.equal("caller_provided");
  });

  it("retries transient transport failures before parsing a 402", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const client = buildMockClient({ agentPda, merchant, amount: 2_000_000 });
    let fetchCalls = 0;

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        throw new Error("temporary network failure");
      }
      if (fetchCalls === 2) {
        return new Response(
          JSON.stringify({
            accepts: [
              {
                maxAmountRequired: "2000000",
                payTo: merchant.toBase58(),
                network: "solana-devnet",
                description: "dataset",
              },
            ],
          }),
          {
            status: 402,
            headers: { "content-type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/dataset",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        retries: 1,
        expectJson: true,
      }
    );

    expect(fetchCalls).to.equal(3);
    expect(client.processPaymentCalls).to.equal(1);
    expect(result.paymentMade).to.equal(true);
    expect(result.statusCode).to.equal(200);
    expect(result.delivery?.delivered).to.equal(true);
  });

  it("retries transient transport failures during the paid retry", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const client = buildMockClient({ agentPda, merchant, amount: 2_000_000 });
    let fetchCalls = 0;

    globalThis.fetch = (async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return new Response(
          JSON.stringify({
            accepts: [
              {
                maxAmountRequired: "2000000",
                payTo: merchant.toBase58(),
                network: "solana-devnet",
                description: "dataset",
              },
            ],
          }),
          {
            status: 402,
            headers: { "content-type": "application/json" },
          }
        );
      }
      if (fetchCalls === 2) {
        throw new Error("paid retry connection reset");
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/dataset",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        retries: 1,
        expectJson: true,
      }
    );

    expect(fetchCalls).to.equal(3);
    expect(client.processPaymentCalls).to.equal(1);
    expect(result.paymentMade).to.equal(true);
    expect(result.statusCode).to.equal(200);
    expect(result.delivery?.delivered).to.equal(true);
    expect(result.delivery?.retryError).to.equal(undefined);
  });

  it("opens auto-dispute with evidence hash when the paid retry fails", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    let capturedDispute:
      | {
          agentPda: string;
          escrowPda: string;
          reasonCode: number;
          reasonUri: number[];
        }
      | undefined;
    const client = buildMockClient({
      agentPda,
      merchant,
      amount: 3_000_000,
      onOpenDispute: (args) => {
        capturedDispute = args;
      },
    });
    const responses = [
      new Response(
        JSON.stringify({
          accepts: [
            {
              maxAmountRequired: "3000000",
              payTo: merchant.toBase58(),
              network: "solana-devnet",
              description: "report",
            },
          ],
        }),
        {
          status: 402,
          headers: { "content-type": "application/json" },
        }
      ),
      new Response(JSON.stringify({ error: "service failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    ];

    globalThis.fetch = (async () => responses.shift()!) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/report",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        autoDisputeOnFail: true,
        expectJson: true,
      }
    );

    expect(client.processPaymentCalls).to.equal(1);
    expect(client.openDisputeCalls).to.equal(1);
    expect(result.paymentMade).to.equal(true);
    expect(result.statusCode).to.equal(500);
    expect(result.delivery?.delivered).to.equal(false);
    expect(result.delivery?.evidence.failureCode).to.equal("NON_2XX");
    expect(result.autoDispute?.opened).to.equal(true);
    expect(result.autoDispute?.txSignature).to.equal("dispute-tx-signature");
    expect(result.autoDispute?.reasonCode).to.equal(REASON_BAD_RESPONSE);
    expect(capturedDispute?.agentPda).to.equal(agentPda.toBase58());
    expect(capturedDispute?.reasonCode).to.equal(REASON_BAD_RESPONSE);
    expect(reasonUriToEvidenceHash(capturedDispute?.reasonUri ?? [])).to.equal(
      result.delivery?.evidence.evidenceHash
    );
  });

  it("returns an explicit protection failure when required on-chain evidence is not recorded", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const client = buildMockClient({
      agentPda,
      merchant,
      amount: 2_000_000,
      recordEvidenceError: "evidence account already exists",
    });
    const responses = [
      new Response(
        JSON.stringify({
          accepts: [
            {
              maxAmountRequired: "2000000",
              payTo: merchant.toBase58(),
              network: "solana-devnet",
              description: "dataset",
            },
          ],
        }),
        {
          status: 402,
          headers: { "content-type": "application/json" },
        }
      ),
      new Response(JSON.stringify({ data: [1, 2, 3] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ];

    globalThis.fetch = (async () => responses.shift()!) as typeof fetch;

    const result = await interceptRequest(
      "https://api.example.com/dataset",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        recordEvidenceOnChain: true,
        requireEvidenceOnChain: true,
        expectJson: true,
      }
    );

    const body = JSON.parse(result.body.toString("utf-8"));
    expect(client.processPaymentCalls).to.equal(1);
    expect(client.recordPaymentEvidenceCalls).to.equal(1);
    expect(result.paymentMade).to.equal(true);
    expect(result.statusCode).to.equal(502);
    expect(result.txSignature).to.equal("payment-tx-signature");
    expect(result.receipt?.deliveryEvidence?.source).to.equal("caller_provided");
    expect(result.onChainEvidence?.recorded).to.equal(false);
    expect(result.onChainEvidence?.error).to.equal("evidence account already exists");
    expect(body.error).to.equal("On-chain evidence recording failed");
    expect(body.onChainEvidence.recorded).to.equal(false);
  });

  it("rejects impossible strict evidence configuration before payment", async () => {
    const agentPda = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const client = buildMockClient({ agentPda, merchant });

    const result = await interceptRequest(
      "https://api.example.com/dataset",
      "GET",
      {},
      undefined,
      client as any,
      agentPda,
      Keypair.generate().publicKey,
      {
        requireEvidenceOnChain: true,
      }
    );

    const body = JSON.parse(result.body.toString("utf-8"));
    expect(client.processPaymentCalls).to.equal(0);
    expect(result.paymentMade).to.equal(false);
    expect(result.statusCode).to.equal(400);
    expect(body.error).to.equal("Invalid protection configuration");
  });

  it("does not emit legacy non-canonical blocked source labels", () => {
    const files = [
      path.join(process.cwd(), "cli", "src", "commands", "pay.ts"),
      path.join(process.cwd(), "mcp", "src", "index.ts"),
      path.join(process.cwd(), "proxy", "src", "interceptor.ts"),
    ];
    const source = files.map((file) => fs.readFileSync(file, "utf-8")).join("\n");

    expect(source).not.to.include("local_policy_check");
    expect(source).not.to.include("caller_provided_local_estimate");
  });
});
