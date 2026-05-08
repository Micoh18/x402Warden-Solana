use anchor_lang::prelude::*;

#[account]
pub struct DisputeAccount {
    pub payment: Pubkey,
    pub opener: Pubkey,
    pub reason_code: u8,
    pub reason_uri: [u8; 64],
    pub opened_at: i64,
    pub merchant_response_deadline: i64,
    pub state: DisputeState,
    pub resolution: u8,
    pub bump: u8,
}

impl DisputeAccount {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 64 + 8 + 8 + 1 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DisputeState {
    Open,
    MerchantAccepted,
    MerchantContested,
    AutoRefunded,
    Resolved,
}

pub const RESOLUTION_NONE: u8 = 0;
pub const RESOLUTION_FULL_REFUND: u8 = 1;
pub const RESOLUTION_MERCHANT_WINS: u8 = 2;
