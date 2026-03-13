"""
Sharded WebSocket manager for Polymarket CLOB real-time streaming.
Chunks asset IDs across multiple connections for scalability.
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import time
import websockets
from config import (
    CLOB_WS_URL,
    WS_SHARD_SIZE,
    WS_RECONNECT_BASE_DELAY,
    WS_RECONNECT_MAX_DELAY,
    WS_PING_INTERVAL,
    WS_PING_TIMEOUT,
)
from store import store

logger = logging.getLogger(__name__)


class WebSocketShard:
    """A single WebSocket connection managing a chunk of asset IDs."""
    
    def __init__(self, shard_id: int, asset_ids: list[str]):
        self.shard_id = shard_id
        self.asset_ids = list(asset_ids)
        self._task: asyncio.Task | None = None
        self._running = False
        self._reconnect_delay = WS_RECONNECT_BASE_DELAY
    
    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run_forever())
    
    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    def add_assets(self, new_ids: list[str]):
        """Add new asset IDs — will take effect on next reconnection."""
        self.asset_ids.extend(new_ids)
    
    async def _run_forever(self):
        """Connect, subscribe, listen. Reconnect on failure."""
        while self._running:
            try:
                await self._connect_and_listen()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                if not self._running:
                    break
                jitter = random.uniform(0, self._reconnect_delay * 0.5)
                wait = min(self._reconnect_delay + jitter, WS_RECONNECT_MAX_DELAY)
                logger.warning(
                    f"Shard {self.shard_id}: connection error ({e}). "
                    f"Reconnecting in {wait:.1f}s..."
                )
                await asyncio.sleep(wait)
                self._reconnect_delay = min(self._reconnect_delay * 2, WS_RECONNECT_MAX_DELAY)
    
    async def _connect_and_listen(self):
        """Single connection lifecycle."""
        logger.info(f"Shard {self.shard_id}: connecting with {len(self.asset_ids)} assets...")
        
        async with websockets.connect(
            CLOB_WS_URL,
            ping_interval=WS_PING_INTERVAL,
            ping_timeout=WS_PING_TIMEOUT,
            close_timeout=5,
            max_size=10 * 1024 * 1024,  # 10MB — initial subscription responses can be large
        ) as ws:
            # Subscribe
            sub_msg = {
                "assets_ids": self.asset_ids,
                "type": "market",
            }
            await ws.send(json.dumps(sub_msg))
            logger.info(f"Shard {self.shard_id}: subscribed to {len(self.asset_ids)} assets ✓")
            
            # Reset reconnect delay on successful connection
            self._reconnect_delay = WS_RECONNECT_BASE_DELAY
            
            # Listen
            async for raw_message in ws:
                try:
                    data = json.loads(raw_message)
                    await self._handle_message(data)
                except json.JSONDecodeError:
                    logger.debug(f"Shard {self.shard_id}: non-JSON message received")
                except Exception as e:
                    logger.warning(f"Shard {self.shard_id}: error handling message: {e}")
    
    async def _handle_message(self, data: dict):
        """Process an incoming WebSocket event."""
        # Handle both single events and arrays
        events = data if isinstance(data, list) else [data]
        
        for event in events:
            event_type = event.get("event_type", "")
            asset_id = event.get("asset_id", "")
            
            if not event_type or not asset_id:
                continue
            
            if event_type in ("best_bid_ask", "last_trade_price", "price_change"):
                await store.update_price(asset_id, event_type, event)


class ShardManager:
    """Manages all WebSocket shards."""
    
    def __init__(self):
        self.shards: list[WebSocketShard] = []
    
    async def start(self, all_asset_ids: list[str]):
        """Create and start shards for all asset IDs."""
        # Chunk asset IDs
        chunks = [
            all_asset_ids[i:i + WS_SHARD_SIZE]
            for i in range(0, len(all_asset_ids), WS_SHARD_SIZE)
        ]
        
        logger.info(
            f"ShardManager: creating {len(chunks)} shards for "
            f"{len(all_asset_ids)} assets ({WS_SHARD_SIZE}/shard)"
        )
        
        self.shards = [
            WebSocketShard(shard_id=i, asset_ids=chunk)
            for i, chunk in enumerate(chunks)
        ]
        
        await store.set_shard_count(len(self.shards))
        
        # Start shards with staggered delay to avoid connection burst
        for shard in self.shards:
            await shard.start()
            await asyncio.sleep(0.5)  # stagger connections
    
    async def add_assets(self, new_asset_ids: list[str]):
        """Add new asset IDs to existing shards or create new ones."""
        if not new_asset_ids:
            return
        
        # Find shards with capacity
        remaining = list(new_asset_ids)
        for shard in self.shards:
            if not remaining:
                break
            capacity = WS_SHARD_SIZE - len(shard.asset_ids)
            if capacity > 0:
                to_add = remaining[:capacity]
                shard.add_assets(to_add)
                remaining = remaining[capacity:]
        
        # Create new shards for overflow
        if remaining:
            chunks = [
                remaining[i:i + WS_SHARD_SIZE]
                for i in range(0, len(remaining), WS_SHARD_SIZE)
            ]
            for chunk in chunks:
                shard = WebSocketShard(
                    shard_id=len(self.shards),
                    asset_ids=chunk,
                )
                self.shards.append(shard)
                await shard.start()
        
        await store.set_shard_count(len(self.shards))
        logger.info(f"ShardManager: added {len(new_asset_ids)} new assets, total shards: {len(self.shards)}")
    
    async def stop(self):
        """Stop all shards."""
        logger.info("ShardManager: stopping all shards...")
        await asyncio.gather(*(shard.stop() for shard in self.shards))
        self.shards.clear()


# Singleton
shard_manager = ShardManager()
