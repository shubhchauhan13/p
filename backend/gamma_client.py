"""
Gamma API client — fetches active Polymarket events with markets and tags.
Uses the /events endpoint for structured tag data, extracting markets from each event.
Routes through a proxy to bypass geo-blocking in restricted regions.
"""
from __future__ import annotations

import json
import logging
import urllib.parse
import aiohttp
from store import MarketData, store
from config import GAMMA_API_URL, GAMMA_PAGE_SIZE

logger = logging.getLogger(__name__)

# Use events endpoint instead of markets
GAMMA_EVENTS_URL = GAMMA_API_URL.replace("/markets", "/events")

# Proxy to bypass geo-blocking (Polymarket blocks certain regions)
PROXY_BASE = "https://api.codetabs.com/v1/proxy/?quest="

# Polymarket has 6000+ active events — fetch all of them
MAX_EVENTS = 10000
MAX_MARKETS = 50000


def _build_proxy_url(base_url: str, params: dict) -> str:
    """Build a proxied URL by encoding the target URL with query params."""
    query_string = urllib.parse.urlencode(params)
    target_url = f"{base_url}?{query_string}"
    return f"{PROXY_BASE}{urllib.parse.quote(target_url, safe='')}"


async def fetch_all_markets() -> list[MarketData]:
    """
    Fetch active events from Gamma Events API, extract individual markets
    with tags from their parent event. Returns flat list of MarketData.
    """
    all_markets: list[MarketData] = []
    offset = 0
    empty_streak = 0
    seen_events = 0
    
    async with aiohttp.ClientSession() as session:
        while seen_events < MAX_EVENTS and len(all_markets) < MAX_MARKETS:
            params = {
                "limit": GAMMA_PAGE_SIZE,
                "offset": offset,
                "closed": "false",
                "active": "true",
                "order": "volume24hr",
                "ascending": "false",
            }
            
            try:
                # Try direct connection first, fallback to proxy if it fails
                events = None
                
                # Attempt 1: Direct connection
                try:
                    logger.info(f"Direct API call at offset {offset}")
                    async with session.get(GAMMA_EVENTS_URL, params=params,
                                           timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            events = await resp.json()
                            logger.info(f"Direct API call successful at offset {offset}")
                except Exception as direct_error:
                    logger.info(f"Direct API call failed: {direct_error}, trying proxy...")
                
                # Attempt 2: Proxy fallback
                if events is None:
                    proxy_url = _build_proxy_url(GAMMA_EVENTS_URL, params)
                    async with session.get(proxy_url,
                                           timeout=aiohttp.ClientTimeout(total=45)) as resp:
                        if resp.status != 200:
                            logger.error(f"Gamma Events API (via proxy) returned {resp.status} at offset {offset}")
                            break
                        events = await resp.json()
                        logger.info(f"Proxy API call successful at offset {offset}")
                
                if events is None:
                    logger.error(f"Both direct and proxy API calls failed at offset {offset}")
                    break
                    
                if not events or len(events) == 0:
                    logger.info(f"Gamma Events API: reached end at offset {offset}")
                    break
                
                page_added = 0
                for event_raw in events:
                    seen_events += 1
                    # Extract tags from event
                    event_tags = _parse_tags(event_raw.get("tags", []))
                    event_title = event_raw.get("title", "")
                    event_slug = event_raw.get("slug", "")
                    event_image = event_raw.get("image", "")
                    event_icon = event_raw.get("icon", "")
                    
                    # Extract markets from event
                    raw_markets = event_raw.get("markets", [])
                    if not raw_markets:
                        continue
                    
                    for raw_market in raw_markets:
                        market = _parse_market(raw_market, event_tags, event_title,
                                                event_slug, event_image, event_icon)
                        if market and market.clob_token_ids:
                            all_markets.append(market)
                            page_added += 1

                if page_added > 0:
                    await store.bulk_upsert_markets(all_markets[-page_added:])

                
                logger.info(
                    f"Gamma API: page at offset={offset} → "
                    f"{page_added} active markets from {len(events)} events (total: {len(all_markets)})"
                )
                
                if page_added == 0:
                    empty_streak += 1
                    if empty_streak >= 3:
                        logger.info("Gamma API: 3 consecutive empty pages, stopping")
                        break
                else:
                    empty_streak = 0
                
                offset += GAMMA_PAGE_SIZE
                    
            except Exception as e:
                logger.error(f"Gamma Events API error at offset {offset}: {e}")
                break
    
    # Sort by 24h volume descending
    all_markets.sort(key=lambda m: m.volume_24hr, reverse=True)
    
    if len(all_markets) > MAX_MARKETS:
        all_markets = all_markets[:MAX_MARKETS]
    
    # Log tag coverage
    all_tag_slugs = set()
    for m in all_markets:
        for t in m.tags:
            all_tag_slugs.add(t.get("slug", ""))
    logger.info(f"Gamma API: ✓ {len(all_markets)} markets from {seen_events} events, {len(all_tag_slugs)} unique tags")
    
    return all_markets


def _parse_tags(tags_raw: list) -> list[dict]:
    """Extract tag label+slug pairs from the event tags array."""
    tags = []
    for tag in tags_raw:
        slug = tag.get("slug", "")
        label = tag.get("label", "")
        if slug and label:
            tags.append({"slug": slug.lower(), "label": label})
    return tags


def _parse_market(raw: dict, event_tags: list, event_title: str,
                   event_slug: str, event_image: str, event_icon: str) -> MarketData:
    """Parse a raw market dict (from inside an event) into a MarketData object."""
    try:
        condition_id = raw.get("conditionId", raw.get("id", ""))
        if not condition_id:
            return None
        
        # Parse clobTokenIds from JSON string
        clob_raw = raw.get("clobTokenIds", "[]")
        if isinstance(clob_raw, str):
            clob_token_ids = json.loads(clob_raw)
        else:
            clob_token_ids = clob_raw or []
        
        if not clob_token_ids:
            return None
        
        # Parse outcomes from JSON string
        outcomes_raw = raw.get("outcomes", '["Yes", "No"]')
        if isinstance(outcomes_raw, str):
            outcomes = json.loads(outcomes_raw)
        else:
            outcomes = outcomes_raw or ["Yes", "No"]
        
        # Parse outcome prices from JSON string
        prices_raw = raw.get("outcomePrices", '[0, 0]')
        if isinstance(prices_raw, str):
            outcome_prices = [float(p) for p in json.loads(prices_raw)]
        else:
            outcome_prices = [float(p) for p in (prices_raw or [0, 0])]
        
        # Use event image/icon as fallback
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
        logger.warning(f"Failed to parse market: {e}")
        return None
