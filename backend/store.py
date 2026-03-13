"""
In-memory data store for market data.
Thread-safe async store replacing Redis for local development.
Now supports tag-based filtering from the events API.
"""
from __future__ import annotations

import asyncio
import time
import json
from dataclasses import dataclass, field, asdict
from typing import Optional
from collections import defaultdict


@dataclass
class MarketData:
    """Represents a single Polymarket market with its latest price data."""
    # Identity
    condition_id: str
    question: str
    slug: str
    
    # Display
    image: str = ""
    icon: str = ""
    category: str = ""
    description: str = ""
    end_date: str = ""
    
    # Tokens
    clob_token_ids: list = field(default_factory=list)
    outcomes: list = field(default_factory=lambda: ["Yes", "No"])
    
    # Prices (from Gamma bootstrap, updated by WebSocket)
    outcome_prices: list = field(default_factory=lambda: [0.0, 0.0])
    best_bid: float = 0.0
    best_ask: float = 0.0
    last_trade_price: float = 0.0
    spread: float = 0.0
    
    # Volume
    volume: float = 0.0
    volume_24hr: float = 0.0
    liquidity: float = 0.0
    
    # Price changes
    one_day_price_change: float = 0.0
    one_hour_price_change: float = 0.0
    
    # Status
    active: bool = True
    closed: bool = False
    
    # Metadata
    last_updated: float = 0.0
    event_title: str = ""
    event_slug: str = ""
    
    # Tags — list of {"label": "...", "slug": "..."} dicts
    tags: list = field(default_factory=list)
    
    # Timing
    created_at: str = ""
    
    def to_dict(self) -> dict:
        return asdict(self)


# Polymarket's main navigation tabs in order
MAIN_NAV_TAGS = [
    {"slug": "_trending", "label": "Trending", "icon": "Flame"},
    {"slug": "_new", "label": "New", "icon": "Sparkles"},
    {"slug": "politics", "label": "Politics", "icon": "Landmark"},
    {"slug": "sports", "label": "Sports", "icon": "Trophy"},
    {"slug": "crypto", "label": "Crypto", "icon": "Bitcoin"},
    {"slug": "finance", "label": "Finance", "icon": "TrendingUp"},
    {"slug": "geopolitics", "label": "Geopolitics", "icon": "Globe"},
    {"slug": "tech", "label": "Tech", "icon": "Monitor"},
    {"slug": "pop-culture", "label": "Culture", "icon": "Theater"},
    {"slug": "world", "label": "World", "icon": "Earth"},
    {"slug": "science", "label": "Science", "icon": "Microscope"},
]


class MarketStore:
    """
    Async-safe in-memory store for all Polymarket data.
    Replaces Redis for local development.
    """
    
    def __init__(self):
        self._markets: dict[str, MarketData] = {}  # condition_id -> MarketData
        self._token_to_market: dict[str, str] = {}  # asset_id -> condition_id
        self._tag_index: dict[str, set] = defaultdict(set)  # tag_slug -> {condition_ids}
        self._tag_labels: dict[str, str] = {}  # tag_slug -> label
        self._lock = asyncio.Lock()
        self._subscribers: list[asyncio.Queue] = []
        self._stats = {
            "total_markets": 0,
            "total_assets": 0,
            "ws_shards": 0,
            "updates_received": 0,
            "start_time": time.time(),
        }
    
    async def upsert_market(self, market: MarketData):
        """Insert or update a market and register its token mappings."""
        async with self._lock:
            self._markets[market.condition_id] = market
            for token_id in market.clob_token_ids:
                self._token_to_market[token_id] = market.condition_id
            # Index tags
            for tag in market.tags:
                slug = tag.get("slug", "")
                if slug:
                    self._tag_index[slug].add(market.condition_id)
                    self._tag_labels[slug] = tag.get("label", slug)
            self._stats["total_markets"] = len(self._markets)
            self._stats["total_assets"] = len(self._token_to_market)
    
    async def bulk_upsert_markets(self, markets: list[MarketData]):
        """Bulk insert/update markets."""
        async with self._lock:
            for market in markets:
                self._markets[market.condition_id] = market
                for token_id in market.clob_token_ids:
                    self._token_to_market[token_id] = market.condition_id
                # Index tags
                for tag in market.tags:
                    slug = tag.get("slug", "")
                    if slug:
                        self._tag_index[slug].add(market.condition_id)
                        self._tag_labels[slug] = tag.get("label", slug)
            self._stats["total_markets"] = len(self._markets)
            self._stats["total_assets"] = len(self._token_to_market)
    
    async def update_price(self, asset_id: str, event_type: str, data: dict):
        """Update market price data from a WebSocket event."""
        async with self._lock:
            condition_id = self._token_to_market.get(asset_id)
            if not condition_id:
                return
            
            market = self._markets.get(condition_id)
            if not market:
                return
            
            self._stats["updates_received"] += 1
            market.last_updated = time.time()
            
            # Determine which outcome this token represents (YES=index 0, NO=index 1)
            token_index = 0
            if len(market.clob_token_ids) > 1 and asset_id == market.clob_token_ids[1]:
                token_index = 1
            
            if event_type == "best_bid_ask":
                bid = float(data.get("best_bid", 0) or 0)
                ask = float(data.get("best_ask", 0) or 0)
                if token_index == 0:
                    market.best_bid = bid
                    market.best_ask = ask
                    market.outcome_prices[0] = round((bid + ask) / 2, 4) if (bid + ask) > 0 else market.outcome_prices[0]
                    market.outcome_prices[1] = round(1 - market.outcome_prices[0], 4)
                market.spread = round(ask - bid, 4) if ask > bid else 0.0
                
            elif event_type == "last_trade_price":
                price = float(data.get("price", 0) or 0)
                if token_index == 0:
                    market.last_trade_price = price
                    market.outcome_prices[0] = price
                    market.outcome_prices[1] = round(1 - price, 4)
                    
            elif event_type == "price_change":
                price = float(data.get("price", 0) or 0)
                if token_index == 0 and price > 0:
                    market.outcome_prices[0] = price
                    market.outcome_prices[1] = round(1 - price, 4)
        
        # Broadcast update to frontend subscribers (outside lock)
        update_msg = json.dumps({
            "type": "price_update",
            "condition_id": condition_id,
            "asset_id": asset_id,
            "event_type": event_type,
            "prices": market.outcome_prices,
            "best_bid": market.best_bid,
            "best_ask": market.best_ask,
            "last_trade_price": market.last_trade_price,
            "spread": market.spread,
            "timestamp": market.last_updated,
        })
        await self._broadcast(update_msg)
    
    async def get_all_markets(self, search: str = "", category: str = "",
                              tag: str = "", sort_by: str = "volume",
                              limit: int = 100, offset: int = 0) -> tuple:
        """Get markets, filtered and sorted. Returns (list[dict], total_count)."""
        async with self._lock:
            # Tag filtering
            if tag and tag.startswith("_"):
                markets = list(self._markets.values())
                if tag == "_new":
                    markets.sort(key=lambda m: m.created_at, reverse=True)
                elif tag == "_trending":
                    markets.sort(key=lambda m: m.volume_24hr, reverse=True)
            elif tag:
                condition_ids = self._tag_index.get(tag, set())
                markets = [self._markets[cid] for cid in condition_ids if cid in self._markets]
            else:
                markets = list(self._markets.values())
        
        # Text search — match question, description, event_title, and event_slug
        if search:
            search_lower = search.lower()
            markets = [m for m in markets if search_lower in m.question.lower()
                       or search_lower in (m.description or "").lower()
                       or search_lower in (m.event_title or "").lower()
                       or search_lower in (m.event_slug or "").lower()]
        
        # Legacy category filter
        if category:
            category_lower = category.lower()
            markets = [m for m in markets if category_lower in (m.category or "").lower()]
        
        # Sort
        if sort_by == "volume":
            markets.sort(key=lambda m: m.volume, reverse=True)
        elif sort_by == "volume_24hr":
            markets.sort(key=lambda m: m.volume_24hr, reverse=True)
        elif sort_by == "last_updated":
            markets.sort(key=lambda m: m.last_updated, reverse=True)
        elif sort_by == "liquidity":
            markets.sort(key=lambda m: m.liquidity, reverse=True)
        elif sort_by == "newest":
            markets.sort(key=lambda m: m.created_at, reverse=True)
        
        # Filter dead markets and deduplicate by event_slug
        # Skip dedup when user is actively searching (show all matching results)
        filtered_markets = []
        seen_events = set()
        do_dedup = not bool(search)
        
        for m in markets:
            # Dead market filter — remove sub-1% and over-99% markets
            # Dead market filter intentionally disabled to fix missing markets bug
            price = m.outcome_prices[0] if m.outcome_prices else 0
            if False: # if (0.0 < price <= 0.01) or price >= 0.99:
                continue
                
            # Deduplication filter (only for feed/browse, not search)
            if do_dedup and m.event_slug:
                if m.event_slug in seen_events:
                    continue
                seen_events.add(m.event_slug)
                
            filtered_markets.append(m)
        
        total = len(filtered_markets)
        sliced = filtered_markets[offset:offset + limit]
        return [m.to_dict() for m in sliced], total
    
    async def get_tags_with_counts(self) -> list[dict]:
        """
        Get all tags with market counts.
        Returns main nav tags first (with counts), then other discovered tags.
        """
        async with self._lock:
            main_slugs = {t["slug"] for t in MAIN_NAV_TAGS}
            
            # Main nav tags always shown, in order
            result = []
            for nav in MAIN_NAV_TAGS:
                slug = nav["slug"]
                if slug.startswith("_"):
                    # Pseudo-tags count all markets
                    count = len(self._markets)
                else:
                    count = len(self._tag_index.get(slug, set()))
                result.append({
                    "slug": slug,
                    "label": nav["label"],
                    "icon": nav["icon"],
                    "count": count,
                    "main": True,
                })
            
            # Additional tags (sub-filters) sorted by count
            other_tags = []
            for slug, cids in self._tag_index.items():
                if slug not in main_slugs and len(cids) >= 2:
                    other_tags.append({
                        "slug": slug,
                        "label": self._tag_labels.get(slug, slug),
                        "count": len(cids),
                        "main": False,
                    })
            other_tags.sort(key=lambda t: t["count"], reverse=True)
            result.extend(other_tags)
            
            return result
    
    async def get_sub_tags_for(self, tag_slug: str) -> list[dict]:
        """Get sub-tags for markets within a given tag. Used for sidebar filters."""
        async with self._lock:
            if tag_slug.startswith("_"):
                condition_ids = set(self._markets.keys())
            else:
                condition_ids = self._tag_index.get(tag_slug, set())
            
            # Count sub-tags within this set
            sub_counts = defaultdict(int)
            for cid in condition_ids:
                market = self._markets.get(cid)
                if not market:
                    continue
                for t in market.tags:
                    s = t.get("slug", "")
                    if s and s != tag_slug:
                        sub_counts[s] += 1
            
            # Sort by count, return top 20, filtering out internal tags
            INTERNAL_TAGS = {"hide-from-new", "recurring", "multi-strikes", "hit-price",
                             "hide-from-breaking", "force-show-new"}
            result = []
            for slug, count in sorted(sub_counts.items(), key=lambda x: x[1], reverse=True)[:30]:
                if count >= 2 and slug not in INTERNAL_TAGS:
                    result.append({
                        "slug": slug,
                        "label": self._tag_labels.get(slug, slug),
                        "count": count,
                    })
            return result[:20]
    
    async def get_market(self, condition_id: str) -> Optional[dict]:
        """Get a single market by condition ID."""
        async with self._lock:
            market = self._markets.get(condition_id)
            return market.to_dict() if market else None
    
    async def get_all_token_ids(self) -> list[str]:
        """Get all registered asset/token IDs."""
        async with self._lock:
            return list(self._token_to_market.keys())
    
    async def get_known_condition_ids(self) -> set[str]:
        """Get set of all known market condition IDs."""
        async with self._lock:
            return set(self._markets.keys())
    
    async def get_stats(self) -> dict:
        """Get platform statistics."""
        async with self._lock:
            return {
                **self._stats,
                "total_tags": len(self._tag_index),
                "uptime_seconds": round(time.time() - self._stats["start_time"]),
            }
    
    async def set_shard_count(self, count: int):
        async with self._lock:
            self._stats["ws_shards"] = count
    
    # --- Frontend broadcast ---
    
    def subscribe(self) -> asyncio.Queue:
        """Create a new subscriber queue for frontend WebSocket."""
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subscribers.append(q)
        return q
    
    def unsubscribe(self, q: asyncio.Queue):
        """Remove a subscriber queue."""
        if q in self._subscribers:
            self._subscribers.remove(q)
    
    async def _broadcast(self, message: str):
        """Send update to all subscribed frontend clients."""
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Drop oldest, push newest
                try:
                    q.get_nowait()
                    q.put_nowait(message)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    dead.append(q)
        for q in dead:
            self._subscribers.remove(q)


# Singleton store
store = MarketStore()
