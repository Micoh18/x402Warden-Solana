use anchor_lang::prelude::*;

#[account]
pub struct PaymentEscrow {
    pub agent: Pubkey,
    pub payment_id: u64,
    pub merchant: Pubkey,
    pub amount: u64,
    pub escrow_token_account: Pubkey,
    pub created_at: i64,
    pub settle_after: i64,
    pub state: PaymentState,
    pub x402_request_hash: [u8; 32],
    pub bump: u8,
}

impl PaymentEscrow {
    pub const LEN: usize = 8 + 32 + 8 + 32 + 8 + 32 + 8 + 8 + 1 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PaymentState {
    Pending,
    Disputed,
    Settled,
    Refunded,
}
