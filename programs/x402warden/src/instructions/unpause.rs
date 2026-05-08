use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct UnpauseAgent<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,
}

pub fn handler(ctx: Context<UnpauseAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    require!(agent.paused, ErrorCode::AgentNotPaused);
    agent.paused = false;

    emit!(AgentUnpausedEvent {
        agent: agent.key(),
    });

    Ok(())
}
