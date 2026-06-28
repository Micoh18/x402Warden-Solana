use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct SettlePayment<'info> {
    #[account(mut)]
    pub settler: Signer<'info>,

    #[account(
        mut,
        constraint = payment_escrow.state == PaymentState::Pending @ ErrorCode::InvalidPaymentState,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

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
        constraint = merchant_token_account.owner == payment_escrow.merchant,
        constraint = merchant_token_account.mint == escrow_token_account.mint,
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SettlePayment>) -> Result<()> {
    let escrow = &ctx.accounts.payment_escrow;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= escrow.settle_after,
        ErrorCode::DisputeWindowOpen
    );

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
            to: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.payment_escrow.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, escrow.amount)?;

    let escrow = &mut ctx.accounts.payment_escrow;
    let merchant = escrow.merchant;
    let amount = escrow.amount;
    escrow.state = PaymentState::Settled;

    emit!(PaymentSettled {
        payment: escrow.key(),
        merchant,
        amount,
    });

    Ok(())
}
