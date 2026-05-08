use anchor_lang::prelude::*;

#[account]
pub struct AgentAccount {
    pub owner: Pubkey,
    pub agent_id: u64,
    pub usdc_token_account: Pubkey,
    pub policy_account: Pubkey,
    pub total_spent_lifetime: u64,
    pub total_disputed_lifetime: u64,
    pub payment_count: u64,
    pub created_at: i64,
    pub paused: bool,
    pub bump: u8,
}

impl AgentAccount {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1;
}
