use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(page_index: u16)]
pub struct CreateAllowlist<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        has_one = owner,
        seeds = [AGENT_SEED, owner.key().as_ref(), &agent_account.agent_id.to_le_bytes()],
        bump = agent_account.bump,
    )]
    pub agent_account: Account<'info, AgentAccount>,

    #[account(
        init,
        payer = owner,
        space = MerchantAllowlistAccount::BASE_LEN + MAX_MERCHANTS_PER_PAGE * MerchantEntry::LEN,
        seeds = [ALLOWLIST_SEED, agent_account.key().as_ref(), &page_index.to_le_bytes()],
        bump,
    )]
    pub allowlist_account: Account<'info, MerchantAllowlistAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateAllowlist>, page_index: u16) -> Result<()> {
    let allowlist = &mut ctx.accounts.allowlist_account;
    allowlist.agent = ctx.accounts.agent_account.key();
    allowlist.page_index = page_index;
    allowlist.merchants = Vec::new();
    allowlist.bump = ctx.bumps.allowlist_account;

    Ok(())
}
