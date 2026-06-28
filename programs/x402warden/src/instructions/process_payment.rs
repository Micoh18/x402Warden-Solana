use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        mut,
        seeds = [POLICY_SEED, agent_account.key().as_ref()],
        bump = policy_account.bump,
        constraint = policy_account.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    #[account(
        init,
        payer = owner,
        space = PaymentEscrow::LEN,
        seeds = [PAYMENT_SEED, agent_account.key().as_ref(), &agent_account.payment_count.to_le_bytes()],
        bump,
    )]
    pub payment_escrow: Account<'info, PaymentEscrow>,

    #[account(
        mut,
        constraint = user_token_account.owner == owner.key(),
        constraint = user_token_account.mint == usdc_mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = owner,
        token::mint = usdc_mint,
        token::authority = payment_escrow,
        seeds = [ESCROW_TOKEN_SEED, payment_escrow.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, token::Mint>,

    #[account(
        constraint = allowlist_account.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub allowlist_account: Option<Account<'info, MerchantAllowlistAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<ProcessPayment>,
    amount: u64,
    merchant: Pubkey,
    x402_request_hash: [u8; 32],
) -> Result<()> {
    let agent = &ctx.accounts.agent_account;
    let policy = &mut ctx.accounts.policy_account;
    let clock = Clock::get()?;

    require!(!agent.paused, ErrorCode::AgentPaused);
    require!(amount <= policy.max_per_call, ErrorCode::ExceedsPerCallLimit);

    if policy.allowlist_enabled {
        let allowlist = ctx
            .accounts
            .allowlist_account
            .as_ref()
            .ok_or(ErrorCode::MerchantNotInAllowlist)?;

        let merchant_entry = allowlist
            .merchants
            .iter()
            .find(|entry| entry.merchant_pubkey == merchant)
            .ok_or(ErrorCode::MerchantNotInAllowlist)?;

        if merchant_entry.max_per_call_override > 0 {
            require!(
                amount <= merchant_entry.max_per_call_override,
                ErrorCode::ExceedsMerchantLimit
            );
        }
    }

    if clock.unix_timestamp - policy.period_start > policy.period_seconds as i64 {
        policy.period_start = clock.unix_timestamp;
        policy.spent_in_period = 0;
    }
    require!(
        policy
            .spent_in_period
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?
            <= policy.max_per_period,
        ErrorCode::ExceedsPeriodLimit
    );

    // Transfer USDC from user to escrow
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, amount)?;

    policy.spent_in_period = policy
        .spent_in_period
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    let agent = &mut ctx.accounts.agent_account;
    let payment_id = agent.payment_count;
    agent.payment_count = agent
        .payment_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    agent.total_spent_lifetime = agent
        .total_spent_lifetime
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    let escrow = &mut ctx.accounts.payment_escrow;
    escrow.agent = agent.key();
    escrow.payment_id = payment_id;
    escrow.merchant = merchant;
    escrow.amount = amount;
    escrow.escrow_token_account = ctx.accounts.escrow_token_account.key();
    escrow.created_at = clock.unix_timestamp;
    escrow.settle_after = clock.unix_timestamp + policy.dispute_window_seconds as i64;
    escrow.state = PaymentState::Pending;
    escrow.x402_request_hash = x402_request_hash;
    escrow.bump = ctx.bumps.payment_escrow;

    emit!(PaymentInitiated {
        agent: agent.key(),
        payment: escrow.key(),
        merchant,
        amount,
        settle_after: escrow.settle_after,
    });

    Ok(())
}
