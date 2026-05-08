use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(mut)]
    pub opener: Signer<'info>,

    #[account(
        has_one = owner @ ErrorCode::Unauthorized,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        mut,
        constraint = payment_escrow.state == PaymentState::Pending @ ErrorCode::InvalidPaymentState,
        constraint = payment_escrow.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

    #[account(
        init,
        payer = opener,
        space = DisputeAccount::LEN,
        seeds = [DISPUTE_SEED, payment_escrow.key().as_ref()],
        bump,
    )]
    pub dispute_account: Account<'info, DisputeAccount>,

    /// CHECK: validated via agent_account.owner
    pub owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<OpenDispute>,
    reason_code: u8,
    reason_uri: [u8; 64],
) -> Result<()> {
    require!(
        reason_code == REASON_NO_RESPONSE
            || reason_code == REASON_BAD_RESPONSE
            || reason_code == REASON_TIMEOUT
            || reason_code == REASON_OTHER,
        ErrorCode::InvalidReasonCode
    );

    let escrow = &ctx.accounts.payment_escrow;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp < escrow.settle_after,
        ErrorCode::DisputeWindowExpired
    );

    let dispute = &mut ctx.accounts.dispute_account;
    dispute.payment = escrow.key();
    dispute.opener = ctx.accounts.opener.key();
    dispute.reason_code = reason_code;
    dispute.reason_uri = reason_uri;
    dispute.opened_at = clock.unix_timestamp;
    dispute.merchant_response_deadline = clock.unix_timestamp + MERCHANT_RESPONSE_DEADLINE_SEC;
    dispute.state = DisputeState::Open;
    dispute.resolution = RESOLUTION_NONE;
    dispute.bump = ctx.bumps.dispute_account;

    let escrow = &mut ctx.accounts.payment_escrow;
    escrow.state = PaymentState::Disputed;

    emit!(DisputeOpened {
        payment: escrow.key(),
        dispute: dispute.key(),
        reason_code,
    });

    Ok(())
}
