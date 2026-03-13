"""
Auto-settlement loop — checks Polymarket for resolved markets
and settles any that have open bets in our system.
"""
from __future__ import annotations

import asyncio
import logging
import aiohttp
from database import get_db, settle_market, is_market_settled

logger = logging.getLogger(__name__)

GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events"
SETTLEMENT_CHECK_INTERVAL = 60  # check every 60 seconds


async def run_settlement_loop():
    """
    Periodically check if any markets with open bets have been resolved on Polymarket.
    If resolved, auto-settle them.
    """
    # Wait for initial bootstrap to complete
    await asyncio.sleep(30)
    logger.info("Settlement loop started — checking every 60s")

    while True:
        try:
            await _check_and_settle()
        except Exception as e:
            logger.error(f"Settlement loop error: {e}")

        await asyncio.sleep(SETTLEMENT_CHECK_INTERVAL)


async def _check_and_settle():
    """Find open bets on markets that have resolved on Polymarket."""
    conn = get_db()

    # Get all condition IDs with open bets that haven't been settled yet
    rows = conn.execute("""
        SELECT DISTINCT condition_id FROM bets
        WHERE status = 'open'
        AND condition_id NOT IN (SELECT condition_id FROM settlements)
    """).fetchall()
    conn.close()

    if not rows:
        return

    condition_ids = [r["condition_id"] for r in rows]
    logger.info(f"Settlement: checking {len(condition_ids)} markets with open bets")

    # Check each market against Polymarket
    async with aiohttp.ClientSession() as session:
        for condition_id in condition_ids:
            try:
                resolved = await _check_market_resolution(session, condition_id)
                if resolved:
                    winning_side = resolved["winning_side"]
                    source = resolved.get("source", "polymarket_auto")
                    summary = settle_market(condition_id, winning_side, source)
                    logger.info(
                        f"Auto-settled: {condition_id[:16]}... → {winning_side} | "
                        f"{summary['winners']} winners, ${summary['total_payout']:.2f} paid"
                    )
            except Exception as e:
                logger.warning(f"Settlement check error for {condition_id[:16]}: {e}")


async def _check_market_resolution(session: aiohttp.ClientSession, condition_id: str) -> dict:
    """
    Check if a market is resolved by looking at Gamma API.
    Returns {"winning_side": "yes"|"no"} if resolved, else None.
    """
    url = f"https://gamma-api.polymarket.com/markets/{condition_id}"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status != 200:
                return None
            data = await resp.json()

            # Check if market is closed and has a resolution
            if not data.get("closed", False):
                return None

            # Check outcome prices — resolved markets have prices at 0 or 1
            prices_raw = data.get("outcomePrices", "[]")
            if isinstance(prices_raw, str):
                import json
                prices = [float(p) for p in json.loads(prices_raw)]
            else:
                prices = [float(p) for p in (prices_raw or [])]

            if not prices or len(prices) < 2:
                return None

            # A fully resolved market has one outcome at 1.0 and another at 0.0
            if prices[0] >= 0.95:
                return {"winning_side": "yes", "source": "polymarket_resolution"}
            elif prices[1] >= 0.95:
                return {"winning_side": "no", "source": "polymarket_resolution"}

            return None

    except Exception:
        return None
