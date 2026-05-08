pub const AGENT_SEED: &[u8] = b"agent";
pub const POLICY_SEED: &[u8] = b"policy";
pub const ALLOWLIST_SEED: &[u8] = b"allowlist";
pub const PAYMENT_SEED: &[u8] = b"payment";
pub const DISPUTE_SEED: &[u8] = b"dispute";
pub const ESCROW_TOKEN_SEED: &[u8] = b"escrow_token";

pub const DEFAULT_DISPUTE_WINDOW_SEC: u32 = 300;
pub const MIN_DISPUTE_WINDOW_SEC: u32 = 60;
pub const MAX_DISPUTE_WINDOW_SEC: u32 = 86400;
pub const MERCHANT_RESPONSE_DEADLINE_SEC: i64 = 86400;

pub const MAX_MERCHANTS_PER_PAGE: usize = 32;

pub const REASON_NO_RESPONSE: u8 = 0;
pub const REASON_BAD_RESPONSE: u8 = 1;
pub const REASON_TIMEOUT: u8 = 2;
pub const REASON_OTHER: u8 = 99;
