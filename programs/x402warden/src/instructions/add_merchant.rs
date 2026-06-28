use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct AddMerchant<'info> {
    #[account(mut)]
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

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddMerchant>,
    merchant: Pubkey,
    category: u8,
    max_per_call_override: u64,
) -> Result<()> {
    let allowlist = &mut ctx.accounts.allowlist_account;
    require!(
        allowlist.merchants.len() < MAX_MERCHANTS_PER_PAGE,
        ErrorCode::AllowlistPageFull
    );

    allowlist.merchants.push(MerchantEntry {
        merchant_pubkey: merchant,
        category,
        max_per_call_override,
    });

    let policy = &mut ctx.accounts.policy_account;
    policy.allowlist_count = policy.allowlist_count.saturating_add(1);

    emit!(MerchantAdded {
        agent: ctx.accounts.agent_account.key(),
        merchant,
        category,
    });

    Ok(())
}
