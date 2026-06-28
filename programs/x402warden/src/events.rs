use anchor_lang::prelude::*;

#[event]
pub struct AgentCreated {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub agent_id: u64,
}

#[event]
pub struct PolicyUpdated {
    pub agent: Pubkey,
    pub max_per_call: u64,
    pub max_per_period: u64,
    pub period_seconds: u64,
    pub dispute_window_seconds: u32,
}

#[event]
pub struct MerchantAdded {
    pub agent: Pubkey,
    pub merchant: Pubkey,
    pub category: u8,
}

#[event]
pub struct MerchantRemoved {
    pub agent: Pubkey,
    pub merchant: Pubkey,
}

#[event]
pub struct PaymentInitiated {
    pub agent: Pubkey,
    pub payment: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub settle_after: i64,
}

#[event]
pub struct PaymentSettled {
    pub payment: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
}

#[event]
pub struct DisputeOpened {
    pub payment: Pubkey,
    pub dispute: Pubkey,
    pub reason_code: u8,
}

#[event]
pub struct PaymentEvidenceRecorded {
    pub payment: Pubkey,
    pub evidence: Pubkey,
    pub evidence_hash: [u8; 32],
    pub failure_code: u8,
    pub status_code: u16,
}

#[event]
pub struct DisputeResolved {
    pub dispute: Pubkey,
    pub payment: Pubkey,
    pub resolution: u8,
}

#[event]
pub struct AgentPausedEvent {
    pub agent: Pubkey,
}

#[event]
pub struct AgentUnpausedEvent {
    pub agent: Pubkey,
}
