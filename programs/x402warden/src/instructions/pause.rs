use anchor_lang::prelude::*;
use crate::constants::*;
use crate::events::*;
use crate::state::*;

#[derive(Accounts)]
pub struct PauseAgent<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,
}

pub fn handler(ctx: Context<PauseAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent_account;
    agent.paused = true;

    emit!(AgentPausedEvent {
        agent: agent.key(),
    });

    Ok(())
}
