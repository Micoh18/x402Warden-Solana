import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

const instructionDir = path.join(
  process.cwd(),
  "programs",
  "x402warden",
  "src",
  "instructions"
);
const stateDir = path.join(
  process.cwd(),
  "programs",
  "x402warden",
  "src",
  "state"
);
const programSrcDir = path.join(
  process.cwd(),
  "programs",
  "x402warden",
  "src"
);

function readInstruction(name: string): string {
  return fs.readFileSync(path.join(instructionDir, name), "utf-8");
}

function readState(name: string): string {
  return fs.readFileSync(path.join(stateDir, name), "utf-8");
}

function readProgramSource(name: string): string {
  return fs.readFileSync(path.join(programSrcDir, name), "utf-8");
}

function normalized(source: string): string {
  return source.replace(/\s+/g, " ");
}

function expectContains(source: string, snippet: string): void {
  expect(normalized(source)).to.include(normalized(snippet));
}

function expectBefore(source: string, first: string, second: string): void {
  const text = normalized(source);
  const firstIndex = text.indexOf(normalized(first));
  const secondIndex = text.indexOf(normalized(second));

  expect(firstIndex, `Missing first snippet: ${first}`).to.be.greaterThan(-1);
  expect(secondIndex, `Missing second snippet: ${second}`).to.be.greaterThan(-1);
  expect(firstIndex, `${first} should appear before ${second}`).to.be.lessThan(
    secondIndex
  );
}

describe("16 - Program Security Invariants", () => {
  it("process_payment checks owner, token, allowlist, and budget before transfer", () => {
    const source = readInstruction("process_payment.rs");

    expectContains(source, "pub owner: Signer<'info>");
    expectContains(source, "has_one = owner");
    expectContains(source, "constraint = policy_account.agent == agent_account.key() @ ErrorCode::Unauthorized");
    expectContains(source, "constraint = user_token_account.owner == owner.key()");
    expectContains(source, "constraint = user_token_account.mint == usdc_mint.key()");
    expectContains(source, "token::authority = payment_escrow");
    expectContains(source, "constraint = allowlist_account.agent == agent_account.key() @ ErrorCode::Unauthorized");
    expectContains(source, "require!(!agent.paused, ErrorCode::AgentPaused)");
    expectContains(source, "require!(amount <= policy.max_per_call, ErrorCode::ExceedsPerCallLimit)");
    expectContains(source, "ErrorCode::MerchantNotInAllowlist");
    expectContains(source, "ErrorCode::ExceedsMerchantLimit");
    expectContains(source, "checked_add(amount)");
    expectContains(source, "<= policy.max_per_period");
    expectContains(source, "ErrorCode::ExceedsPeriodLimit");
    expectContains(source, "policy.spent_in_period = policy");
    expectContains(source, "agent.payment_count = agent");
    expectContains(source, "checked_add(1)");
    expectContains(source, "agent.total_spent_lifetime = agent");
    expectContains(source, "ErrorCode::Overflow");

    expectBefore(
      source,
      "require!(!agent.paused, ErrorCode::AgentPaused)",
      "token::transfer(transfer_ctx, amount)?"
    );
    expectBefore(
      source,
      "<= policy.max_per_period",
      "token::transfer(transfer_ctx, amount)?"
    );
    expectBefore(
      source,
      "token::transfer(transfer_ctx, amount)?",
      "escrow.state = PaymentState::Pending"
    );
  });

  it("open_dispute validates reason code, owner authority, state, and dispute window", () => {
    const source = readInstruction("open_dispute.rs");

    expectContains(source, "pub opener: Signer<'info>");
    expectContains(source, "has_one = owner @ ErrorCode::Unauthorized");
    expectContains(source, "constraint = payment_escrow.state == PaymentState::Pending @ ErrorCode::InvalidPaymentState");
    expectContains(source, "constraint = payment_escrow.agent == agent_account.key() @ ErrorCode::Unauthorized");
    expectContains(source, "seeds = [DISPUTE_SEED, payment_escrow.key().as_ref()]");
    expectContains(source, "reason_code == REASON_NO_RESPONSE");
    expectContains(source, "reason_code == REASON_BAD_RESPONSE");
    expectContains(source, "reason_code == REASON_TIMEOUT");
    expectContains(source, "reason_code == REASON_OTHER");
    expectContains(source, "clock.unix_timestamp < escrow.settle_after");
    expectContains(source, "dispute.state = DisputeState::Open");
    expectContains(source, "escrow.state = PaymentState::Disputed");
  });

  it("record_payment_evidence is owner-only and stores only fixed hashes", () => {
    const instruction = readInstruction("record_payment_evidence.rs");
    const state = readState("payment_evidence.rs");
    const constants = readProgramSource("constants.rs");

    expectContains(instruction, "pub owner: Signer<'info>");
    expectContains(instruction, "has_one = owner @ ErrorCode::Unauthorized");
    expectContains(instruction, "constraint = payment_escrow.agent == agent_account.key() @ ErrorCode::Unauthorized");
    expectContains(instruction, "seeds = [PAYMENT_EVIDENCE_SEED, payment_escrow.key().as_ref()]");
    expectContains(instruction, "receipt_version == RECEIPT_VERSION_V1");
    expectContains(instruction, "ErrorCode::InvalidReceiptVersion");
    expectContains(instruction, "failure_code == DELIVERY_FAILURE_NONE");
    expectContains(instruction, "failure_code == DELIVERY_FAILURE_SERVICE_ERROR");
    expectContains(instruction, "failure_code == DELIVERY_FAILURE_OTHER");
    expectContains(instruction, "ErrorCode::InvalidDeliveryFailureCode");
    expectContains(instruction, "evidence.payment = ctx.accounts.payment_escrow.key()");
    expectContains(instruction, "evidence.recorder = ctx.accounts.owner.key()");
    expectContains(instruction, "evidence.evidence_hash = evidence_hash");
    expectContains(instruction, "emit!(PaymentEvidenceRecorded");

    expectContains(state, "pub payment_requirements_hash: [u8; 32]");
    expectContains(state, "pub request_context_hash: [u8; 32]");
    expectContains(state, "pub response_hash: [u8; 32]");
    expectContains(state, "pub evidence_hash: [u8; 32]");
    expectContains(state, "pub status_code: u16");
    expectContains(constants, "pub const PAYMENT_EVIDENCE_SEED: &[u8] = b\"payment_evidence\"");
  });

  it("settle_payment only releases pending escrow to merchant after settle_after", () => {
    const source = readInstruction("settle_payment.rs");

    expectContains(source, "pub settler: Signer<'info>");
    expectContains(source, "constraint = payment_escrow.state == PaymentState::Pending @ ErrorCode::InvalidPaymentState");
    expectContains(source, "constraint = escrow_token_account.key() == payment_escrow.escrow_token_account @ ErrorCode::Unauthorized");
    expectContains(source, "constraint = escrow_token_account.owner == payment_escrow.key() @ ErrorCode::Unauthorized");
    expectContains(source, "constraint = merchant_token_account.owner == payment_escrow.merchant");
    expectContains(source, "constraint = merchant_token_account.mint == escrow_token_account.mint");
    expectContains(source, "clock.unix_timestamp >= escrow.settle_after");
    expectContains(source, "CpiContext::new_with_signer");
    expectContains(source, "authority: ctx.accounts.payment_escrow.to_account_info()");
    expectContains(source, "token::transfer(transfer_ctx, escrow.amount)?");
    expectContains(source, "escrow.state = PaymentState::Settled");

    expectBefore(
      source,
      "clock.unix_timestamp >= escrow.settle_after",
      "token::transfer(transfer_ctx, escrow.amount)?"
    );
  });

  it("merchant_accept and auto_refund refund only disputed open escrows to owner token accounts", () => {
    const merchantAccept = readInstruction("merchant_accept.rs");
    const autoRefund = readInstruction("auto_refund.rs");

    for (const source of [merchantAccept, autoRefund]) {
      expectContains(source, "constraint = payment_escrow.state == PaymentState::Disputed @ ErrorCode::InvalidPaymentState");
      expectContains(source, "constraint = dispute_account.state == DisputeState::Open @ ErrorCode::InvalidPaymentState");
      expectContains(source, "constraint = dispute_account.payment == payment_escrow.key() @ ErrorCode::Unauthorized");
      expectContains(source, "constraint = agent_account.key() == payment_escrow.agent");
      expectContains(source, "constraint = escrow_token_account.key() == payment_escrow.escrow_token_account @ ErrorCode::Unauthorized");
      expectContains(source, "constraint = escrow_token_account.owner == payment_escrow.key() @ ErrorCode::Unauthorized");
      expectContains(source, "constraint = owner_token_account.owner == agent_account.owner @ ErrorCode::Unauthorized");
      expectContains(source, "constraint = owner_token_account.mint == escrow_token_account.mint");
      expectContains(source, "CpiContext::new_with_signer");
      expectContains(source, "authority: ctx.accounts.payment_escrow.to_account_info()");
      expectContains(source, "token::transfer(transfer_ctx, escrow.amount)?");
      expectContains(source, "dispute.resolution = RESOLUTION_FULL_REFUND");
      expectContains(source, "escrow.state = PaymentState::Refunded");
      expectContains(source, "agent.total_disputed_lifetime = agent");
      expectContains(source, "checked_add(escrow.amount)");
      expectContains(source, "ErrorCode::Overflow");
    }

    expectContains(
      merchantAccept,
      "constraint = payment_escrow.merchant == merchant.key() @ ErrorCode::Unauthorized"
    );
    expectContains(
      autoRefund,
      "clock.unix_timestamp > dispute.merchant_response_deadline"
    );
  });

  it("merchant_contest is merchant-only and deadline-bound", () => {
    const source = readInstruction("merchant_contest.rs");

    expectContains(source, "pub merchant: Signer<'info>");
    expectContains(source, "constraint = payment_escrow.state == PaymentState::Disputed @ ErrorCode::InvalidPaymentState");
    expectContains(source, "constraint = payment_escrow.merchant == merchant.key() @ ErrorCode::Unauthorized");
    expectContains(source, "constraint = dispute_account.state == DisputeState::Open @ ErrorCode::InvalidPaymentState");
    expectContains(source, "constraint = dispute_account.payment == payment_escrow.key() @ ErrorCode::Unauthorized");
    expectContains(source, "clock.unix_timestamp <= dispute.merchant_response_deadline");
    expectContains(source, "dispute.state = DisputeState::MerchantContested");
  });

  it("set_policy is owner-only and keeps dispute window bounds", () => {
    const source = readInstruction("set_policy.rs");

    expectContains(source, "pub owner: Signer<'info>");
    expectContains(source, "has_one = owner");
    expectContains(source, "constraint = policy_account.agent == agent_account.key() @ ErrorCode::Unauthorized");
    expectContains(source, "params.dispute_window_seconds >= MIN_DISPUTE_WINDOW_SEC");
    expectContains(source, "params.dispute_window_seconds <= MAX_DISPUTE_WINDOW_SEC");
    expectContains(source, "ErrorCode::InvalidDisputeWindow");
  });

  it("allowlist admin actions are owner-only and scoped to the agent policy", () => {
    const addMerchant = readInstruction("add_merchant.rs");
    const removeMerchant = readInstruction("remove_merchant.rs");

    for (const source of [addMerchant, removeMerchant]) {
      expectContains(source, "pub owner: Signer<'info>");
      expectContains(source, "has_one = owner");
      expectContains(source, "seeds = [ALLOWLIST_SEED, agent_account.key().as_ref(), &allowlist_account.page_index.to_le_bytes()]");
      expectContains(source, "constraint = allowlist_account.agent == agent_account.key() @ ErrorCode::Unauthorized");
      expectContains(source, "seeds = [POLICY_SEED, agent_account.key().as_ref()]");
      expectContains(source, "constraint = policy_account.agent == agent_account.key() @ ErrorCode::Unauthorized");
    }

    expectContains(addMerchant, "allowlist.merchants.len() < MAX_MERCHANTS_PER_PAGE");
    expectContains(addMerchant, "policy.allowlist_count = policy.allowlist_count.saturating_add(1)");
    expectContains(removeMerchant, "ErrorCode::MerchantNotFound");
    expectContains(removeMerchant, "policy.allowlist_count = policy.allowlist_count.saturating_sub(1)");
  });
});
