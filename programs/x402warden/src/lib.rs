use anchor_lang::prelude::*;

mod constants;
mod errors;
mod events;
mod instructions;
mod state;

use instructions::*;

declare_id!("9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A");

#[program]
pub mod x402_warden {
    use super::*;

    pub fn initialize_agent_account(
        ctx: Context<InitializeAgent>,
        agent_id: u64,
    ) -> Result<()> {
        instructions::initialize_agent::handler(ctx, agent_id)
    }

    pub fn set_policy(ctx: Context<SetPolicy>, params: SetPolicyParams) -> Result<()> {
        instructions::set_policy::handler(ctx, params)
    }

    pub fn create_allowlist(ctx: Context<CreateAllowlist>, page_index: u16) -> Result<()> {
        instructions::create_allowlist::handler(ctx, page_index)
    }

    pub fn add_merchant_to_allowlist(
        ctx: Context<AddMerchant>,
        merchant: Pubkey,
        category: u8,
        max_per_call_override: u64,
    ) -> Result<()> {
        instructions::add_merchant::handler(ctx, merchant, category, max_per_call_override)
    }

    pub fn remove_merchant_from_allowlist(
        ctx: Context<RemoveMerchant>,
        merchant: Pubkey,
    ) -> Result<()> {
        instructions::remove_merchant::handler(ctx, merchant)
    }

    pub fn process_x402_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
        merchant: Pubkey,
        x402_request_hash: [u8; 32],
    ) -> Result<()> {
        instructions::process_payment::handler(ctx, amount, merchant, x402_request_hash)
    }

    pub fn settle_payment(ctx: Context<SettlePayment>) -> Result<()> {
        instructions::settle_payment::handler(ctx)
    }

    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        reason_code: u8,
        reason_uri: [u8; 64],
    ) -> Result<()> {
        instructions::open_dispute::handler(ctx, reason_code, reason_uri)
    }

    pub fn merchant_accept_dispute(ctx: Context<MerchantAccept>) -> Result<()> {
        instructions::merchant_accept::handler(ctx)
    }

    pub fn merchant_contest_dispute(ctx: Context<MerchantContest>) -> Result<()> {
        instructions::merchant_contest::handler(ctx)
    }

    pub fn auto_refund_dispute(ctx: Context<AutoRefund>) -> Result<()> {
        instructions::auto_refund::handler(ctx)
    }

    pub fn pause_agent(ctx: Context<PauseAgent>) -> Result<()> {
        instructions::pause::handler(ctx)
    }

    pub fn unpause_agent(ctx: Context<UnpauseAgent>) -> Result<()> {
        instructions::unpause::handler(ctx)
    }
}
