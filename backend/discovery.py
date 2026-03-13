"""
Market discovery loop — periodically fetches new markets from Gamma
and subscribes them to WebSocket shards.
Now uses incremental discovery: fetches only the most recent events
to find new ones quickly without re-fetching everything.
Routes through a proxy to bypass geo-blocking in restricted regions.
"""

import asyncio
import logging
import urllib.parse
import aiohttp
import json
from config import DISCOVERY_INTERVAL_SECONDS, GAMMA_PAGE_SIZE
from store import store, MarketData
from ws_manager import shard_manager

logger = logging.getLogger(__name__)

GAMMA_EVENTS_URL = "https://gamma-api.polymarket.com/events"
PROXY_BASE = "https://api.codetabs.com/v1/proxy/?quest="


def _build_proxy_url(base_url: str, params: dict) -> str:
    """Build a proxied URL by encoding the target URL with query params."""
    query_string = urllib.parse.urlencode(params)
    target_url = f"{base_url}?{query_string}"
    return f"{PROXY_BASE}{urllib.parse.quote(target_url, safe='')}"


async def run_discovery_loop():
    """
    Periodically check for new markets on Polymarket.
    Uses incremental approach: fetch recent events sorted by creation date.
    """
    while True:
        await asyncio.sleep(DISCOVERY_INTERVAL_SECONDS)
        
        try:
            logger.info("Discovery: checking for new events...")
            new_count = 0
            new_token_ids = []
            
            async with aiohttp.ClientSession() as session:
                # Fetch the 200 most recently updated events
                for offset in range(0, 200, GAMMA_PAGE_SIZE):
                    params = {
                        "limit": GAMMA_PAGE_SIZE,
                        "offset": offset,
                        "closed": "false",
                        "active": "true",
                        "order": "startDate",
                        "ascending": "false",
                    }
                    try:
                        proxy_url = _build_proxy_url(GAMMA_EVENTS_URL, params)
                        async with session.get(proxy_url,
                                               timeout=aiohttp.ClientTimeout(total=45)) as resp:
                            if resp.status != 200:
                                break
                            events = await resp.json()
                            if not events:
                                break
                            
                            known_ids = await store.get_known_condition_ids()
                            
                            for event_raw in events:
                                tags = _parse_tags(event_raw.get("tags", []))
                                event_title = event_raw.get("title", "")
                                event_slug = event_raw.get("slug", "")
                                event_image = event_raw.get("image", "")
                                event_icon = event_raw.get("icon", "")
                                
                                for raw_market in event_raw.get("markets", []):
                                    cid = raw_market.get("conditionId", raw_market.get("id", ""))
                                    if cid and cid not in known_ids:
                                        market = _parse_market_from_event(
                                            raw_market, tags, event_title,
                                            event_slug, event_image, event_icon
                                        )
                                        if market and market.clob_token_ids:
                                            await store.upsert_market(market)
                                            new_token_ids.extend(market.clob_token_ids)
                                            new_count += 1
                    except Exception as e:
                        logger.error(f"Discovery: page error at offset {offset}: {e}")
                        break
            
            if new_count > 0:
                logger.info(f"Discovery: found {new_count} new markets, {len(new_token_ids)} tokens")
                if new_token_ids:
                    await shard_manager.add_assets(new_token_ids)
                    logger.info(f"Discovery: subscribed {len(new_token_ids)} new tokens")
            else:
                logger.info("Discovery: no new markets found")
                
        except Exception as e:
            logger.error(f"Discovery: error during refresh: {e}")


def _parse_tags(tags_raw):
    tags = []
    for tag in tags_raw:
        slug = tag.get("slug", "")
        label = tag.get("label", "")
        if slug and label:
            tags.append({"slug": slug.lower(), "label": label})
    return tags


def _parse_market_from_event(raw, event_tags, event_title, event_slug, event_image, event_icon):
    try:
        condition_id = raw.get("conditionId", raw.get("id", ""))
        if not condition_id:
            return None
        
        clob_raw = raw.get("clobTokenIds", "[]")
        if isinstance(clob_raw, str):
            clob_token_ids = json.loads(clob_raw)
        else:
            clob_token_ids = clob_raw or []
        
        if not clob_token_ids:
            return None
        
        outcomes_raw = raw.get("outcomes", '["Yes", "No"]')
        if isinstance(outcomes_raw, str):
            outcomes = json.loads(outcomes_raw)
        else:
            outcomes = outcomes_raw or ["Yes", "No"]
        
        prices_raw = raw.get("outcomePrices", '[0, 0]')
        if isinstance(prices_raw, str):
            outcome_prices = [float(p) for p in json.loads(prices_raw)]
        else:
            outcome_prices = [float(p) for p in (prices_raw or [0, 0])]
        
        image = raw.get("image", "") or event_image
        icon = raw.get("icon", "") or event_icon
        
        return MarketData(
            condition_id=condition_id,
            question=raw.get("question", ""),
            slug=raw.get("slug", ""),
            image=image,
            icon=icon,
            category=raw.get("category", ""),
            description=raw.get("description", ""),
            end_date=raw.get("endDate", ""),
            clob_token_ids=clob_token_ids,
            outcomes=outcomes,
            outcome_prices=outcome_prices,
            best_bid=float(raw.get("bestBid", 0) or 0),
            best_ask=float(raw.get("bestAsk", 0) or 0),
            last_trade_price=float(raw.get("lastTradePrice", 0) or 0),
            spread=float(raw.get("spread", 0) or 0),
            volume=float(raw.get("volumeNum", 0) or 0),
            volume_24hr=float(raw.get("volume24hr", 0) or 0),
            liquidity=float(raw.get("liquidityNum", 0) or 0),
            one_day_price_change=float(raw.get("oneDayPriceChange", 0) or 0),
            one_hour_price_change=float(raw.get("oneHourPriceChange", 0) or 0),
            active=raw.get("active", True),
            closed=raw.get("closed", False),
            event_title=event_title,
            event_slug=event_slug,
            tags=event_tags,
            created_at=raw.get("createdAt", ""),
        )
    except Exception as e:
        logger.warning(f"Discovery: failed to parse market: {e}")
        return None
