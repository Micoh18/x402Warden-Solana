use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct SetPolicyParams {
    pub max_per_call: u64,
    pub max_per_period: u64,
    pub period_seconds: u64,
    pub dispute_window_seconds: u32,
    pub allowlist_enabled: bool,
    pub auto_settle_enabled: bool,
}

#[derive(Accounts)]
pub struct SetPolicy<'info> {
    pub owner: Signer<'info>,

    #[account(
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        mut,
        has_one = agent @ ErrorCode::Unauthorized,
        seeds = [POLICY_SEED, agent_account.key().as_ref()],
        bump = policy_account.bump,
        constraint = policy_account.agent == agent_account.key(),
    )]
    pub policy_account: Account<'info, PolicyAccount>,
}

pub fn handler(ctx: Context<SetPolicy>, params: SetPolicyParams) -> Result<()> {
    require!(
        params.dispute_window_seconds >= MIN_DISPUTE_WINDOW_SEC
            && params.dispute_window_seconds <= MAX_DISPUTE_WINDOW_SEC,
        ErrorCode::InvalidDisputeWindow
    );

    let policy = &mut ctx.accounts.policy_account;
    policy.max_per_call = params.max_per_call;
    policy.max_per_period = params.max_per_period;
    policy.period_seconds = params.period_seconds;
    policy.dispute_window_seconds = params.dispute_window_seconds;
    policy.allowlist_enabled = params.allowlist_enabled;
    policy.auto_settle_enabled = params.auto_settle_enabled;

    emit!(PolicyUpdated {
        agent: ctx.accounts.agent_account.key(),
        max_per_call: params.max_per_call,
        max_per_period: params.max_per_period,
        period_seconds: params.period_seconds,
        dispute_window_seconds: params.dispute_window_seconds,
    });

    Ok(())
}
