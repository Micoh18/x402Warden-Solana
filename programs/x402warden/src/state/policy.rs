use anchor_lang::prelude::*;

#[account]
pub struct PolicyAccount {
    pub agent: Pubkey,
    pub max_per_call: u64,
    pub max_per_day: u64,
    pub max_per_period: u64,
    pub period_seconds: u64,
    pub period_start: i64,
    pub spent_in_period: u64,
    pub allowlist_enabled: bool,
    pub allowlist_count: u8,
    pub dispute_window_seconds: u32,
    pub auto_settle_enabled: bool,
    pub bump: u8,
}

impl PolicyAccount {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 4 + 1 + 1;
}
