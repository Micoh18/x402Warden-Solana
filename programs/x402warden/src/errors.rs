use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Agent is paused")]
    AgentPaused,
    #[msg("Amount exceeds per-call limit")]
    ExceedsPerCallLimit,
    #[msg("Amount exceeds period limit")]
    ExceedsPeriodLimit,
    #[msg("Amount exceeds merchant-specific limit")]
    ExceedsMerchantLimit,
    #[msg("Merchant not in allowlist")]
    MerchantNotInAllowlist,
    #[msg("Invalid payment state for this action")]
    InvalidPaymentState,
    #[msg("Dispute window still open")]
    DisputeWindowOpen,
    #[msg("Dispute window has expired")]
    DisputeWindowExpired,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Allowlist page is full")]
    AllowlistPageFull,
    #[msg("Merchant not found in allowlist")]
    MerchantNotFound,
    #[msg("Merchant response deadline not reached")]
    DeadlineNotReached,
    #[msg("Merchant response deadline expired")]
    DeadlineExpired,
    #[msg("Agent is not paused")]
    AgentNotPaused,
    #[msg("Invalid dispute window duration")]
    InvalidDisputeWindow,
    #[msg("Invalid dispute reason code")]
    InvalidReasonCode,
}
