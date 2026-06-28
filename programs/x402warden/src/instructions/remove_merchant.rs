use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct RemoveMerchant<'info> {
    pub owner: Signer<'info>,

    #[account(
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        mut,
        seeds = [ALLOWLIST_SEED, agent_account.key().as_ref(), &allowlist_account.page_index.to_le_bytes()],
        bump = allowlist_account.bump,
        constraint = allowlist_account.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub allowlist_account: Account<'info, MerchantAllowlistAccount>,

    #[account(
        mut,
        seeds = [POLICY_SEED, agent_account.key().as_ref()],
        bump = policy_account.bump,
        constraint = policy_account.agent == agent_account.key() @ ErrorCode::Unauthorized,
    )]
    pub policy_account: Account<'info, PolicyAccount>,
}

pub fn handler(ctx: Context<RemoveMerchant>, merchant: Pubkey) -> Result<()> {
    let allowlist = &mut ctx.accounts.allowlist_account;
    let idx = allowlist
        .merchants
        .iter()
        .position(|e| e.merchant_pubkey == merchant)
        .ok_or(ErrorCode::MerchantNotFound)?;

    allowlist.merchants.swap_remove(idx);

    let policy = &mut ctx.accounts.policy_account;
    policy.allowlist_count = policy.allowlist_count.saturating_sub(1);

    emit!(MerchantRemoved {
        agent: ctx.accounts.agent_account.key(),
        merchant,
    });

    Ok(())
}
