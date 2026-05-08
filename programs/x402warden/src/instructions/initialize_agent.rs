use anchor_lang::prelude::*;
use crate::constants::*;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(agent_id: u64)]
pub struct InitializeAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = AgentAccount::LEN,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_id.to_le_bytes()],
        bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        init,
        payer = owner,
        space = PolicyAccount::LEN,
        seeds = [POLICY_SEED, agent_account.key().as_ref()],
        bump,
    )]
    pub policy_account: Account<'info, PolicyAccount>,

    /// CHECK: validated by the owner off-chain; stored as reference only
    pub usdc_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeAgent>, agent_id: u64) -> Result<()> {
    let clock = Clock::get()?;

    let agent = &mut ctx.accounts.agent_account;
    agent.owner = ctx.accounts.owner.key();
    agent.agent_id = agent_id;
    agent.usdc_token_account = ctx.accounts.usdc_token_account.key();
    agent.policy_account = ctx.accounts.policy_account.key();
    agent.total_spent_lifetime = 0;
    agent.total_disputed_lifetime = 0;
    agent.payment_count = 0;
    agent.created_at = clock.unix_timestamp;
    agent.paused = false;
    agent.bump = ctx.bumps.agent_account;

    let policy = &mut ctx.accounts.policy_account;
    policy.agent = agent.key();
    policy.max_per_call = u64::MAX;
    policy.max_per_day = u64::MAX;
    policy.max_per_period = u64::MAX;
    policy.period_seconds = 86400;
    policy.period_start = clock.unix_timestamp;
    policy.spent_in_period = 0;
    policy.allowlist_enabled = false;
    policy.allowlist_count = 0;
    policy.dispute_window_seconds = DEFAULT_DISPUTE_WINDOW_SEC;
    policy.auto_settle_enabled = true;
    policy.bump = ctx.bumps.policy_account;

    emit!(AgentCreated {
        owner: agent.owner,
        agent: agent.key(),
        agent_id,
    });

    Ok(())
}
