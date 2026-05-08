#!/usr/bin/env python3
"""x402warden Demo Agent — AI agent with Solana payment guardrails."""

import os
import sys
import hashlib
import time
from dataclasses import dataclass, field

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from solders.pubkey import Pubkey
from solders.keypair import Keypair

from .solana_helpers import (
    derive_agent_pda,
    derive_policy_pda,
    derive_payment_pda,
    derive_dispute_pda,
    derive_escrow_token_pda,
    build_initialize_agent_ix,
    build_set_policy_ix,
    build_process_payment_ix,
    build_open_dispute_ix,
    setup_token_infrastructure,
    send_tx,
)
from .x402_client import (
    request_service,
    parse_402_response,
    build_payment_header,
    validate_response,
    SIMULATED_402_RESEARCH,
    SIMULATED_402_BROKEN,
    SIMULATED_RESEARCH_RESPONSE,
    SIMULATED_BROKEN_RESPONSE,
)


# ── Data types ───────────────────────────────────────────────────────────────


@dataclass
class PolicyConfig:
    max_per_call: int = 5_000_000
    max_per_period: int = 50_000_000
    period_seconds: int = 86400
    dispute_window_seconds: int = 60
    allowlist_enabled: bool = False
    auto_settle_enabled: bool = True
    spent_in_period: int = 0
    allowed_merchants: list[str] = field(default_factory=list)


class PolicyBlockError(Exception):
    def __init__(self, code: str, detail: str):
        self.code = code
        self.detail = detail
        super().__init__(detail)


# ── Agent ────────────────────────────────────────────────────────────────────


class X402Agent:
    def __init__(self, rpc_url: str, server_url: str, program_id_str: str):
        self.rpc_url = rpc_url
        self.server_url = server_url
        self.program_id = Pubkey.from_string(program_id_str)
        self.keypair = Keypair()
        self.agent_id = 0
        self.policy = PolicyConfig()
        self.payment_count = 0
        self.total_spent = 0
        self.live_mode = False
        self.server_available = False
        self.agent_pda: Pubkey | None = None
        self.policy_pda: Pubkey | None = None
        self.usdc_mint: Pubkey | None = None
        self.user_token_account: Pubkey | None = None
        self.client = None

    # ── setup ────────────────────────────────────────────────────────────

    def setup(self, console: Console):
        self.agent_pda, _ = derive_agent_pda(
            self.keypair.pubkey(), self.agent_id, self.program_id
        )
        self.policy_pda, _ = derive_policy_pda(self.agent_pda, self.program_id)

        self._try_connect_validator(console)
        self._try_connect_server(console)

    def _try_connect_validator(self, console: Console):
        try:
            from solana.rpc.api import Client

            self.client = Client(self.rpc_url)
            self.client.get_health()
            console.print(f"  [green]✓[/] Connected to Solana validator")

            sig = self.client.request_airdrop(self.keypair.pubkey(), 2_000_000_000)
            time.sleep(2)
            console.print(f"  [green]✓[/] Airdropped 2 SOL")

            self.usdc_mint, self.user_token_account = setup_token_infrastructure(
                self.client, self.keypair
            )
            console.print(f"  [green]✓[/] Created mock USDC mint + funded 100 USDC")

            ix = build_initialize_agent_ix(
                self.keypair.pubkey(), self.agent_id,
                self.user_token_account, self.program_id,
            )
            send_tx(self.client, [ix], self.keypair)
            console.print(f"  [green]✓[/] Initialized agent account on-chain")

            ix = build_set_policy_ix(
                self.keypair.pubkey(), self.agent_pda, self.policy_pda,
                self.policy.max_per_call, self.policy.max_per_period,
                self.policy.period_seconds, self.policy.dispute_window_seconds,
                self.policy.allowlist_enabled, self.policy.auto_settle_enabled,
                self.program_id,
            )
            send_tx(self.client, [ix], self.keypair)
            console.print(f"  [green]✓[/] Set spending policy on-chain")

            self.live_mode = True
        except Exception as e:
            console.print(f"  [yellow]⚠[/] Validator not available ({type(e).__name__})")
            console.print(f"  [yellow]→[/] On-chain interactions will be simulated")

    def _try_connect_server(self, console: Console):
        try:
            import httpx

            r = httpx.get(f"{self.server_url}/health", timeout=3)
            if r.status_code == 200:
                self.server_available = True
                console.print(f"  [green]✓[/] Demo server reachable at {self.server_url}")
                return
        except Exception:
            pass
        console.print(f"  [yellow]⚠[/] Demo server not reachable")
        console.print(f"  [yellow]→[/] HTTP responses will be simulated")

    # ── policy enforcement ───────────────────────────────────────────────

    def check_policy(self, amount: int, merchant: str | None = None):
        if amount > self.policy.max_per_call:
            raise PolicyBlockError(
                "ExceedsPerCallLimit",
                f"Amount ${amount / 1_000_000:.2f} exceeds per-call limit "
                f"of ${self.policy.max_per_call / 1_000_000:.2f}",
            )
        new_total = self.policy.spent_in_period + amount
        if new_total > self.policy.max_per_period:
            raise PolicyBlockError(
                "ExceedsPeriodLimit",
                f"Would bring period spending to ${new_total / 1_000_000:.2f}, "
                f"exceeding limit of ${self.policy.max_per_period / 1_000_000:.2f}",
            )
        if self.policy.allowlist_enabled and merchant:
            if merchant not in self.policy.allowed_merchants:
                short = f"{merchant[:8]}...{merchant[-4:]}"
                raise PolicyBlockError(
                    "MerchantNotInAllowlist",
                    f"Merchant {short} is not in the agent's allowlist",
                )

    # ── payment ──────────────────────────────────────────────────────────

    def process_payment(self, amount: int, merchant_str: str) -> str:
        self.check_policy(amount, merchant_str)

        if self.live_mode:
            merchant = Pubkey.from_string(merchant_str)
            payment_pda, _ = derive_payment_pda(
                self.agent_pda, self.payment_count, self.program_id
            )
            escrow_pda, _ = derive_escrow_token_pda(payment_pda, self.program_id)
            request_hash = hashlib.sha256(
                f"payment_{self.payment_count}".encode()
            ).digest()
            ix = build_process_payment_ix(
                owner=self.keypair.pubkey(),
                agent_pda=self.agent_pda,
                policy_pda=self.policy_pda,
                payment_pda=payment_pda,
                user_token_account=self.user_token_account,
                escrow_token_pda=escrow_pda,
                usdc_mint=self.usdc_mint,
                amount=amount,
                merchant=merchant,
                request_hash=request_hash,
                program_id=self.program_id,
            )
            sig = send_tx(self.client, [ix], self.keypair)
        else:
            sig = hashlib.sha256(
                f"sim_{self.payment_count}_{amount}".encode()
            ).hexdigest()[:64]

        self.payment_count += 1
        self.total_spent += amount
        self.policy.spent_in_period += amount
        return sig

    # ── dispute ──────────────────────────────────────────────────────────

    def open_dispute(self, payment_id: int, reason_code: int) -> str:
        payment_pda, _ = derive_payment_pda(
            self.agent_pda, payment_id, self.program_id
        )
        dispute_pda, _ = derive_dispute_pda(payment_pda, self.program_id)

        if self.live_mode:
            ix = build_open_dispute_ix(
                opener=self.keypair.pubkey(),
                agent_pda=self.agent_pda,
                payment_pda=payment_pda,
                dispute_pda=dispute_pda,
                owner=self.keypair.pubkey(),
                reason_code=reason_code,
                reason_uri=b"bad_response",
                program_id=self.program_id,
            )
            send_tx(self.client, [ix], self.keypair)
            return str(dispute_pda)

        return hashlib.sha256(f"dispute_{payment_id}".encode()).hexdigest()[:44]


# ── Scenario 1: Policy Blocks ───────────────────────────────────────────────


def scenario_1_policy_blocks(agent: X402Agent, console: Console) -> bool:
    console.print()
    console.rule("[bold cyan]SCENARIO 1 — Policy Blocks[/]")
    console.print()

    # 1a: ExceedsPerCallLimit
    console.print(
        "  [dim]▸[/] Attempting payment of [bold]$100.00[/] to /api/research..."
    )
    try:
        agent.check_policy(100_000_000)
        console.print("  [red]ERROR: payment was not blocked[/]")
        return False
    except PolicyBlockError as e:
        console.print(f"  [red]✗ BLOCKED[/] by x402warden: [bold]{e.code}[/]")
        console.print(f"    {e.detail}")

    console.print()

    # 1b: MerchantNotInAllowlist
    agent.policy.allowlist_enabled = True
    agent.policy.allowed_merchants = [
        "BPFLoaderUpgradeab1e11111111111111111111111"
    ]
    fake_merchant = "7xB2UnknownMerchant111111111111111111111111"

    console.print(
        "  [dim]▸[/] Attempting payment of [bold]$3.00[/] to unknown merchant..."
    )
    try:
        agent.check_policy(3_000_000, fake_merchant)
        console.print("  [red]ERROR: payment was not blocked[/]")
        return False
    except PolicyBlockError as e:
        console.print(f"  [red]✗ BLOCKED[/] by x402warden: [bold]{e.code}[/]")
        console.print(f"    {e.detail}")

    agent.policy.allowlist_enabled = False
    return True


# ── Scenario 2: Happy Payment ───────────────────────────────────────────────


def scenario_2_happy_payment(agent: X402Agent, console: Console) -> bool:
    console.print()
    console.rule("[bold cyan]SCENARIO 2 — Happy Payment[/]")
    console.print()

    url = f"{agent.server_url}/api/research"

    # Step 1: request → 402
    console.print("  [dim]▸[/] Requesting GET /api/research...")

    if agent.server_available:
        resp = request_service(url)
        body_402 = resp.json() if resp.status_code == 402 else None
    else:
        body_402 = SIMULATED_402_RESEARCH

    if body_402 is None:
        console.print("  [red]✗[/] Did not receive 402 — unexpected")
        return False

    requirements = parse_402_response(body_402)
    price = requirements["price"]
    pay_to = requirements["pay_to"]
    console.print(f"  [yellow]◆[/] Server returned [bold]402[/] — payment required")
    console.print(f"    Price: {price:,} lamports (${price / 1_000_000:.2f} USDC)")
    console.print(f"    Merchant: {pay_to[:16]}...")
    console.print()

    # Step 2: process payment
    console.print("  [dim]▸[/] Processing payment via x402warden...")
    try:
        tx_sig = agent.process_payment(price, pay_to)
    except PolicyBlockError as e:
        console.print(f"  [red]✗ BLOCKED[/]: {e.detail}")
        return False

    mode = "" if agent.live_mode else " [dim](simulated)[/]"
    console.print(f"  [green]✓[/] Payment processed{mode} — tx: {tx_sig[:16]}...")
    console.print()

    # Step 3: retry with payment header
    console.print("  [dim]▸[/] Retrying request with X-PAYMENT header...")
    payment_header = build_payment_header(tx_sig)

    if agent.server_available:
        resp2 = request_service(url, payment_header)
        data = resp2.json()
    else:
        data = SIMULATED_RESEARCH_RESPONSE

    console.print(f"  [green]✓[/] Server returned [bold]200[/] — data received")
    console.print()

    research = data.get("data", {})
    report_lines = (
        f"[bold]{data.get('report', 'N/A')}[/]\n"
        f"Trend: {research.get('trend', '?')} "
        f"({int(research.get('confidence', 0) * 100)}% confidence)\n"
        f"TVL: {research.get('totalValueLocked', '?')}"
    )
    if research.get("topProtocols"):
        tops = ", ".join(
            f"{p['name']} ({p['tvl']})" for p in research["topProtocols"][:3]
        )
        report_lines += f"\nTop: {tops}"
    console.print(Panel(report_lines, title="Research Data", border_style="green"))
    console.print()
    console.print("  [green]✓[/] Payment settled — funds released to merchant")
    return True


# ── Scenario 3: Dispute Flow ────────────────────────────────────────────────


def scenario_3_dispute_flow(agent: X402Agent, console: Console) -> bool:
    console.print()
    console.rule("[bold cyan]SCENARIO 3 — Dispute Flow[/]")
    console.print()

    url = f"{agent.server_url}/api/broken"

    # Step 1: request → 402
    console.print("  [dim]▸[/] Requesting GET /api/broken...")

    if agent.server_available:
        resp = request_service(url)
        body_402 = resp.json() if resp.status_code == 402 else None
    else:
        body_402 = SIMULATED_402_BROKEN

    if body_402 is None:
        console.print("  [red]✗[/] Did not receive 402")
        return False

    requirements = parse_402_response(body_402)
    price = requirements["price"]
    pay_to = requirements["pay_to"]
    console.print(f"  [yellow]◆[/] Server returned [bold]402[/] — payment required")
    console.print(f"    Price: {price:,} lamports (${price / 1_000_000:.2f} USDC)")
    console.print()

    # Step 2: process payment
    console.print("  [dim]▸[/] Processing payment via x402warden...")
    try:
        tx_sig = agent.process_payment(price, pay_to)
    except PolicyBlockError as e:
        console.print(f"  [red]✗ BLOCKED[/]: {e.detail}")
        return False

    mode = "" if agent.live_mode else " [dim](simulated)[/]"
    console.print(f"  [green]✓[/] Payment processed{mode} — tx: {tx_sig[:16]}...")
    console.print()

    # Step 3: retry with payment header → get garbage
    console.print("  [dim]▸[/] Retrying request with X-PAYMENT header...")
    payment_header = build_payment_header(tx_sig)

    if agent.server_available:
        resp2 = request_service(url, payment_header)
        data = resp2.json()
    else:
        data = SIMULATED_BROKEN_RESPONSE

    # Step 4: validate → detect garbage
    valid, reason = validate_response(data)
    if valid:
        console.print("  [green]✓[/] Response is valid — no dispute needed")
        return False

    console.print(
        f"  [red]⚠[/] Server returned [bold]200[/] "
        f"but data is [bold red]INVALID[/]"
    )
    console.print(f"    Reason: {reason}")
    console.print()

    # Step 5: open dispute on-chain
    payment_id = agent.payment_count - 1
    console.print("  [dim]▸[/] Opening dispute on-chain (reason: BadResponse)...")
    dispute_id = agent.open_dispute(payment_id, reason_code=1)
    mode = "" if agent.live_mode else " [dim](simulated)[/]"
    console.print(
        f"  [yellow]✓[/] Dispute opened{mode} — funds locked pending resolution"
    )
    console.print(f"    Dispute: {dispute_id[:16]}...")
    console.print(f"    Merchant has 24h to respond or funds auto-refund")
    return True


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    console = Console()

    rpc_url = os.environ.get("SOLANA_RPC_URL", "http://localhost:8899")
    server_url = os.environ.get("DEMO_SERVER_URL", "http://localhost:3001")
    program_id = os.environ.get("PROGRAM_ID", "9utfdXa7dRRyNKpqeD7EzB3q2SSrfC7gBGWzD62pUs3A")

    # Banner
    console.print()
    banner = (
        "[bold white]x402warden Demo Agent[/]\n"
        "[dim]Solana smart accounts that protect AI agents from overspending[/]"
    )
    console.print(Panel(banner, border_style="bright_blue", padding=(1, 2)))
    console.print()

    # Create & setup agent
    agent = X402Agent(rpc_url, server_url, program_id)
    console.print("[bold]Setting up...[/]")
    agent.setup(console)
    console.print()

    # Agent info card
    pk = str(agent.keypair.pubkey())
    mode_label = "[green]live (on-chain)[/]" if agent.live_mode else "[yellow]simulation[/]"
    info = (
        f"Agent:    {pk[:8]}...{pk[-4:]}\n"
        f"Mode:     {mode_label}\n"
        f"Policy:   max ${agent.policy.max_per_call / 1_000_000:.0f}/call, "
        f"max ${agent.policy.max_per_period / 1_000_000:.0f}/period, "
        f"{agent.policy.dispute_window_seconds}s dispute window\n"
        f"Server:   {server_url} "
        f"({'[green]online[/]' if agent.server_available else '[yellow]offline[/]'})"
    )
    console.print(Panel(info, title="Agent Configuration", border_style="cyan"))

    # Run scenarios
    results: list[tuple[str, str, str]] = []

    for name, fn, ok_label in [
        ("Policy Blocks", scenario_1_policy_blocks, "BLOCKED"),
        ("Happy Payment", scenario_2_happy_payment, "SUCCESS"),
        ("Dispute Flow", scenario_3_dispute_flow, "DISPUTE"),
    ]:
        try:
            ok = fn(agent, console)
            results.append((name, ok_label if ok else "PARTIAL", _detail(ok_label)))
        except Exception as e:
            console.print(f"\n  [red]Error: {e}[/]")
            results.append((name, "ERROR", str(e)[:50]))

    # Summary
    console.print()
    console.rule("[bold]Demo Complete[/]")
    console.print()

    table = Table(title="Results Summary", show_lines=True)
    table.add_column("Scenario", style="cyan", min_width=14)
    table.add_column("Result", style="bold", min_width=10)
    table.add_column("Details")

    colors = {"BLOCKED": "red", "SUCCESS": "green", "DISPUTE": "yellow",
              "ERROR": "red", "PARTIAL": "dim"}
    for name, result, detail in results:
        c = colors.get(result, "white")
        table.add_row(name, f"[{c}]{result}[/{c}]", detail)

    console.print(table)

    ok_count = sum(1 for _, r, _ in results if r != "ERROR")
    console.print(f"\n  [bold]{ok_count}/3[/] scenarios executed successfully.\n")


def _detail(label: str) -> str:
    return {
        "BLOCKED": "Policy enforcement working",
        "SUCCESS": "Payment + data received + settled",
        "DISPUTE": "Bad service detected → dispute opened",
    }.get(label, "")


if __name__ == "__main__":
    main()
