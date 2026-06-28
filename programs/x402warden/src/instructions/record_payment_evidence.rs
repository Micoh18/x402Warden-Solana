use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct RecordPaymentEvidence<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        constraint = payment_escrow.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

    #[account(
        init,
        payer = owner,
        space = PaymentEvidenceAccount::LEN,
        seeds = [PAYMENT_EVIDENCE_SEED, payment_escrow.key().as_ref()],
        bump,
    )]
    pub payment_evidence: Account<'info, PaymentEvidenceAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordPaymentEvidence>,
    receipt_version: u8,
    payment_requirements_hash: [u8; 32],
    request_context_hash: [u8; 32],
    response_hash: [u8; 32],
    evidence_hash: [u8; 32],
    failure_code: u8,
    status_code: u16,
) -> Result<()> {
    require!(
        receipt_version == RECEIPT_VERSION_V1,
        ErrorCode::InvalidReceiptVersion
    );
    require!(
        failure_code == DELIVERY_FAILURE_NONE
            || failure_code == DELIVERY_FAILURE_NO_RESPONSE
            || failure_code == DELIVERY_FAILURE_TIMEOUT
            || failure_code == DELIVERY_FAILURE_NON_2XX
            || failure_code == DELIVERY_FAILURE_INVALID_JSON
            || failure_code == DELIVERY_FAILURE_EMPTY_BODY
            || failure_code == DELIVERY_FAILURE_SERVICE_ERROR
            || failure_code == DELIVERY_FAILURE_OTHER,
        ErrorCode::InvalidDeliveryFailureCode
    );

    let clock = Clock::get()?;
    let evidence = &mut ctx.accounts.payment_evidence;
    evidence.payment = ctx.accounts.payment_escrow.key();
    evidence.recorder = ctx.accounts.owner.key();
    evidence.receipt_version = receipt_version;
    evidence.payment_requirements_hash = payment_requirements_hash;
    evidence.request_context_hash = request_context_hash;
    evidence.response_hash = response_hash;
    evidence.evidence_hash = evidence_hash;
    evidence.failure_code = failure_code;
    evidence.status_code = status_code;
    evidence.recorded_at = clock.unix_timestamp;
    evidence.bump = ctx.bumps.payment_evidence;

    emit!(PaymentEvidenceRecorded {
        payment: evidence.payment,
        evidence: evidence.key(),
        evidence_hash,
        failure_code,
        status_code,
    });

    Ok(())
}
