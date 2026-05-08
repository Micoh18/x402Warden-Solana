"""x402 protocol helpers — HTTP requests, 402 parsing, response validation."""

import json
import httpx


# ── Simulated responses (used when demo server is unreachable) ───────────────

SIMULATED_402_RESEARCH = {
    "x402Version": 1,
    "accepts": [{
        "scheme": "exact",
        "network": "solana-devnet",
        "maxAmountRequired": "5000000",
        "resource": "http://localhost:3001/api/research",
        "description": "Research API access — premium market analysis",
        "payTo": "BPFLoaderUpgradeab1e11111111111111111111111",
    }],
}

SIMULATED_402_BROKEN = {
    "x402Version": 1,
    "accepts": [{
        "scheme": "exact",
        "network": "solana-devnet",
        "maxAmountRequired": "3000000",
        "resource": "http://localhost:3001/api/broken",
        "description": "Premium analytics dashboard data",
        "payTo": "BPFLoaderUpgradeab1e11111111111111111111111",
    }],
}

SIMULATED_RESEARCH_RESPONSE = {
    "report": "Solana DeFi Market Analysis — Q2 2025",
    "generated": "2025-05-08T12:00:00.000Z",
    "data": {
        "totalValueLocked": "$14.2B",
        "topProtocols": [
            {"name": "Jupiter", "tvl": "$2.1B", "change24h": "+3.4%"},
            {"name": "Marinade", "tvl": "$1.8B", "change24h": "+1.2%"},
            {"name": "Raydium", "tvl": "$1.5B", "change24h": "-0.8%"},
        ],
        "trend": "bullish",
        "confidence": 0.82,
        "summary": (
            "Solana DeFi ecosystem continues strong growth driven by increased "
            "institutional adoption and improvements in transaction throughput."
        ),
    },
}

SIMULATED_BROKEN_RESPONSE = {
    "report": "Premium Analytics",
    "status": "generating",
    "data": None,
    "error_internal": "SERVICE_CRASHED",
    "partial_garbage": "\xff\xd8\xff\xe0 \x00\x00TRUNCATED_RESPONSE...",
}


# ── HTTP helpers ─────────────────────────────────────────────────────────────


def request_service(url: str, payment_header: dict | None = None) -> httpx.Response:
    headers = {}
    if payment_header:
        headers["X-PAYMENT"] = json.dumps(payment_header)
    return httpx.get(url, headers=headers, timeout=10)


def parse_402_response(body: dict) -> dict | None:
    accepts = body.get("accepts", [])
    if not accepts:
        return None
    req = accepts[0]
    return {
        "price": int(req.get("maxAmountRequired", 0)),
        "pay_to": req.get("payTo", ""),
        "description": req.get("description", ""),
        "resource": req.get("resource", ""),
        "network": req.get("network", ""),
    }


def build_payment_header(tx_signature: str) -> dict:
    return {
        "x402Version": 1,
        "scheme": "exact",
        "network": "solana-devnet",
        "payload": {"signature": tx_signature},
    }


def validate_response(data: dict) -> tuple[bool, str]:
    if data.get("data") is None:
        return False, "data field is null"
    if "error_internal" in data:
        return False, f"internal error: {data['error_internal']}"
    raw = json.dumps(data)
    if "partial_garbage" in data or "TRUNCATED" in raw:
        return False, "response contains garbage/truncated data"
    return True, "valid"
