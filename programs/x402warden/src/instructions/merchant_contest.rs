use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;

#[derive(Accounts)]
pub struct MerchantContest<'info> {
    pub merchant: Signer<'info>,

    #[account(
        constraint = payment_escrow.state == PaymentState::Disputed @ ErrorCode::InvalidPaymentState,
        constraint = payment_escrow.merchant == merchant.key() @ ErrorCode::Unauthorized,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

    #[account(
        mut,
        constraint = dispute_account.state == DisputeState::Open @ ErrorCode::InvalidPaymentState,
        seeds = [DISPUTE_SEED, payment_escrow.key().as_ref()],
        bump = dispute_account.bump,
    )]
    pub dispute_account: Account<'info, DisputeAccount>,
}

pub fn handler(ctx: Context<MerchantContest>) -> Result<()> {
    let clock = Clock::get()?;
    let dispute = &ctx.accounts.dispute_account;

    require!(
        clock.unix_timestamp <= dispute.merchant_response_deadline,
        ErrorCode::DeadlineExpired
    );

    let dispute = &mut ctx.accounts.dispute_account;
    dispute.state = DisputeState::MerchantContested;

    Ok(())
}
