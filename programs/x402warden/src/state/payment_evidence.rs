use anchor_lang::prelude::*;

#[account]
pub struct PaymentEvidenceAccount {
    pub payment: Pubkey,
    pub recorder: Pubkey,
    pub receipt_version: u8,
    pub payment_requirements_hash: [u8; 32],
    pub request_context_hash: [u8; 32],
    pub response_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub failure_code: u8,
    pub status_code: u16,
    pub recorded_at: i64,
    pub bump: u8,
}

impl PaymentEvidenceAccount {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 32 + 32 + 32 + 32 + 1 + 2 + 8 + 1;
}
