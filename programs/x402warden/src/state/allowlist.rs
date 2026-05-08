use anchor_lang::prelude::*;

#[account]
pub struct MerchantAllowlistAccount {
    pub agent: Pubkey,
    pub page_index: u16,
    pub merchants: Vec<MerchantEntry>,
    pub bump: u8,
}

impl MerchantAllowlistAccount {
    pub const BASE_LEN: usize = 8 + 32 + 2 + 4 + 1;

    pub fn current_len(&self) -> usize {
        Self::BASE_LEN + self.merchants.len() * MerchantEntry::LEN
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MerchantEntry {
    pub merchant_pubkey: Pubkey,
    pub category: u8,
    pub max_per_call_override: u64,
}

impl MerchantEntry {
    pub const LEN: usize = 32 + 1 + 8;
}
