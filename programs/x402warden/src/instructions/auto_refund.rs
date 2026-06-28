use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct AutoRefund<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = payment_escrow.state == PaymentState::Disputed @ ErrorCode::InvalidPaymentState,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

    #[account(
        mut,
        constraint = dispute_account.state == DisputeState::Open @ ErrorCode::InvalidPaymentState,
        constraint = dispute_account.payment == payment_escrow.key() @ ErrorCode::Unauthorized,
        seeds = [DISPUTE_SEED, payment_escrow.key().as_ref()],
        bump = dispute_account.bump,
    )]
    pub dispute_account: Account<'info, DisputeAccount>,

    #[account(
        mut,
        constraint = agent_account.key() == payment_escrow.agent,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        mut,
        constraint = escrow_token_account.key() == payment_escrow.escrow_token_account @ ErrorCode::Unauthorized,
        constraint = escrow_token_account.owner == payment_escrow.key() @ ErrorCode::Unauthorized,
        seeds = [ESCROW_TOKEN_SEED, payment_escrow.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.owner == agent_account.owner @ ErrorCode::Unauthorized,
        constraint = owner_token_account.mint == escrow_token_account.mint,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<AutoRefund>) -> Result<()> {
    let clock = Clock::get()?;
    let dispute = &ctx.accounts.dispute_account;

    require!(
        clock.unix_timestamp > dispute.merchant_response_deadline,
        ErrorCode::DeadlineNotReached
    );

    let escrow = &ctx.accounts.payment_escrow;
    let agent_key = escrow.agent;
    let payment_id_bytes = escrow.payment_id.to_le_bytes();
    let bump = escrow.bump;
    let escrow_seeds: &[&[u8]] = &[
        PAYMENT_SEED,
        agent_key.as_ref(),
        &payment_id_bytes,
        &[bump],
    ];

    let signer_seeds = &[escrow_seeds];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.owner_token_account.to_account_info(),
            authority: ctx.accounts.payment_escrow.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, escrow.amount)?;

    let dispute = &mut ctx.accounts.dispute_account;
    dispute.state = DisputeState::AutoRefunded;
    dispute.resolution = RESOLUTION_FULL_REFUND;

    let escrow = &mut ctx.accounts.payment_escrow;
    escrow.state = PaymentState::Refunded;

    let agent = &mut ctx.accounts.agent_account;
    agent.total_disputed_lifetime = agent
        .total_disputed_lifetime
        .checked_add(escrow.amount)
        .ok_or(ErrorCode::Overflow)?;

    emit!(DisputeResolved {
        dispute: dispute.key(),
        payment: escrow.key(),
        resolution: RESOLUTION_FULL_REFUND,
    });

    Ok(())
}
