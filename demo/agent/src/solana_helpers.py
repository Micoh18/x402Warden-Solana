"""Solana helpers — PDA derivation, instruction builders, token setup."""

import struct
from typing import Optional

from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.system_program import (
    create_account,
    CreateAccountParams,
    ID as SYS_PROGRAM_ID,
)
from solders.transaction import Transaction
from solders.message import Message

TOKEN_PROGRAM_ID = Pubkey.from_string(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
)
SYSVAR_RENT_ID = Pubkey.from_string(
    "SysvarRent111111111111111111111111111111111"
)

# ── Anchor discriminators (from target/idl/x402_warden.json) ────────────────

DISC_INITIALIZE_AGENT = bytes([129, 81, 19, 253, 119, 74, 252, 254])
DISC_SET_POLICY = bytes([40, 133, 12, 157, 235, 202, 2, 132])
DISC_PROCESS_PAYMENT = bytes([238, 115, 46, 68, 55, 166, 248, 16])
DISC_SETTLE_PAYMENT = bytes([129, 7, 163, 250, 122, 226, 158, 249])
DISC_OPEN_DISPUTE = bytes([137, 25, 99, 119, 23, 223, 161, 42])


# ── PDA derivation ──────────────────────────────────────────────────────────


def derive_agent_pda(
    owner: Pubkey, agent_id: int, program_id: Pubkey
) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"agent", bytes(owner), struct.pack("<Q", agent_id)],
        program_id,
    )


def derive_policy_pda(
    agent_key: Pubkey, program_id: Pubkey
) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"policy", bytes(agent_key)], program_id
    )


def derive_payment_pda(
    agent_key: Pubkey, payment_id: int, program_id: Pubkey
) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"payment", bytes(agent_key), struct.pack("<Q", payment_id)],
        program_id,
    )


def derive_dispute_pda(
    payment_key: Pubkey, program_id: Pubkey
) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"dispute", bytes(payment_key)], program_id
    )


def derive_escrow_token_pda(
    payment_key: Pubkey, program_id: Pubkey
) -> tuple[Pubkey, int]:
    return Pubkey.find_program_address(
        [b"escrow_token", bytes(payment_key)], program_id
    )


# ── x402warden instruction builders ─────────────────────────────────────────


def build_initialize_agent_ix(
    owner: Pubkey,
    agent_id: int,
    usdc_token_account: Pubkey,
    program_id: Pubkey,
) -> Instruction:
    agent_pda, _ = derive_agent_pda(owner, agent_id, program_id)
    policy_pda, _ = derive_policy_pda(agent_pda, program_id)
    data = DISC_INITIALIZE_AGENT + struct.pack("<Q", agent_id)
    return Instruction(
        program_id,
        data,
        [
            AccountMeta(owner, is_signer=True, is_writable=True),
            AccountMeta(agent_pda, is_signer=False, is_writable=True),
            AccountMeta(policy_pda, is_signer=False, is_writable=True),
            AccountMeta(usdc_token_account, is_signer=False, is_writable=False),
            AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
        ],
    )


def build_set_policy_ix(
    owner: Pubkey,
    agent_pda: Pubkey,
    policy_pda: Pubkey,
    max_per_call: int,
    max_per_period: int,
    period_seconds: int,
    dispute_window_seconds: int,
    allowlist_enabled: bool,
    auto_settle_enabled: bool,
    program_id: Pubkey,
) -> Instruction:
    data = DISC_SET_POLICY + struct.pack(
        "<QQQI??",
        max_per_call,
        max_per_period,
        period_seconds,
        dispute_window_seconds,
        allowlist_enabled,
        auto_settle_enabled,
    )
    return Instruction(
        program_id,
        data,
        [
            AccountMeta(owner, is_signer=True, is_writable=False),
            AccountMeta(agent_pda, is_signer=False, is_writable=False),
            AccountMeta(policy_pda, is_signer=False, is_writable=True),
        ],
    )


def build_process_payment_ix(
    owner: Pubkey,
    agent_pda: Pubkey,
    policy_pda: Pubkey,
    payment_pda: Pubkey,
    user_token_account: Pubkey,
    escrow_token_pda: Pubkey,
    usdc_mint: Pubkey,
    amount: int,
    merchant: Pubkey,
    request_hash: bytes,
    program_id: Pubkey,
) -> Instruction:
    data = (
        DISC_PROCESS_PAYMENT
        + struct.pack("<Q", amount)
        + bytes(merchant)
        + request_hash
    )
    return Instruction(
        program_id,
        data,
        [
            AccountMeta(owner, is_signer=True, is_writable=True),
            AccountMeta(agent_pda, is_signer=False, is_writable=True),
            AccountMeta(policy_pda, is_signer=False, is_writable=True),
            AccountMeta(payment_pda, is_signer=False, is_writable=True),
            AccountMeta(user_token_account, is_signer=False, is_writable=True),
            AccountMeta(escrow_token_pda, is_signer=False, is_writable=True),
            AccountMeta(usdc_mint, is_signer=False, is_writable=False),
            AccountMeta(TOKEN_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
            AccountMeta(SYSVAR_RENT_ID, is_signer=False, is_writable=False),
        ],
    )


def build_open_dispute_ix(
    opener: Pubkey,
    agent_pda: Pubkey,
    payment_pda: Pubkey,
    dispute_pda: Pubkey,
    owner: Pubkey,
    reason_code: int,
    reason_uri: bytes,
    program_id: Pubkey,
) -> Instruction:
    data = DISC_OPEN_DISPUTE + bytes([reason_code]) + reason_uri[:64].ljust(64, b"\x00")
    return Instruction(
        program_id,
        data,
        [
            AccountMeta(opener, is_signer=True, is_writable=True),
            AccountMeta(agent_pda, is_signer=False, is_writable=False),
            AccountMeta(payment_pda, is_signer=False, is_writable=True),
            AccountMeta(dispute_pda, is_signer=False, is_writable=True),
            AccountMeta(owner, is_signer=False, is_writable=False),
            AccountMeta(SYS_PROGRAM_ID, is_signer=False, is_writable=False),
        ],
    )


# ── SPL Token instruction builders (minimal set for demo setup) ─────────────


def _build_init_mint2_ix(
    mint: Pubkey, decimals: int, authority: Pubkey
) -> Instruction:
    data = bytes([20, decimals]) + bytes(authority) + bytes([0])
    return Instruction(
        TOKEN_PROGRAM_ID, data,
        [AccountMeta(mint, is_signer=False, is_writable=True)],
    )


def _build_init_account_ix(
    account: Pubkey, mint: Pubkey, owner: Pubkey
) -> Instruction:
    return Instruction(
        TOKEN_PROGRAM_ID, bytes([1]),
        [
            AccountMeta(account, is_signer=False, is_writable=True),
            AccountMeta(mint, is_signer=False, is_writable=False),
            AccountMeta(owner, is_signer=False, is_writable=False),
            AccountMeta(SYSVAR_RENT_ID, is_signer=False, is_writable=False),
        ],
    )


def _build_mint_to_ix(
    mint: Pubkey, dest: Pubkey, authority: Pubkey, amount: int
) -> Instruction:
    data = bytes([7]) + struct.pack("<Q", amount)
    return Instruction(
        TOKEN_PROGRAM_ID, data,
        [
            AccountMeta(mint, is_signer=False, is_writable=True),
            AccountMeta(dest, is_signer=False, is_writable=True),
            AccountMeta(authority, is_signer=True, is_writable=False),
        ],
    )


# ── Transaction helpers ─────────────────────────────────────────────────────


def send_tx(client, instructions: list[Instruction], payer: Keypair,
            extra_signers: Optional[list[Keypair]] = None) -> str:
    blockhash = client.get_latest_blockhash().value.blockhash
    msg = Message.new_with_blockhash(instructions, payer.pubkey(), blockhash)
    tx = Transaction.new_unsigned(msg)
    signers = [payer] + (extra_signers or [])
    tx.sign(signers, blockhash)
    result = client.send_transaction(tx)
    return str(result.value)


def setup_token_infrastructure(
    client, payer: Keypair
) -> tuple[Pubkey, Pubkey]:
    """Create mock USDC mint + token account, mint 100 USDC. Returns (mint, token_account)."""
    mint_kp = Keypair()
    token_kp = Keypair()

    mint_rent = client.get_minimum_balance_for_rent_exemption(82).value
    token_rent = client.get_minimum_balance_for_rent_exemption(165).value

    ixs = [
        create_account(CreateAccountParams(
            from_pubkey=payer.pubkey(), to_pubkey=mint_kp.pubkey(),
            lamports=mint_rent, space=82, owner=TOKEN_PROGRAM_ID,
        )),
        _build_init_mint2_ix(mint_kp.pubkey(), 6, payer.pubkey()),
        create_account(CreateAccountParams(
            from_pubkey=payer.pubkey(), to_pubkey=token_kp.pubkey(),
            lamports=token_rent, space=165, owner=TOKEN_PROGRAM_ID,
        )),
        _build_init_account_ix(token_kp.pubkey(), mint_kp.pubkey(), payer.pubkey()),
        _build_mint_to_ix(mint_kp.pubkey(), token_kp.pubkey(), payer.pubkey(), 100_000_000),
    ]

    send_tx(client, ixs, payer, [mint_kp, token_kp])
    return mint_kp.pubkey(), token_kp.pubkey()
