"""
Main entry point — orchestrates bootstrap, streaming, discovery, settlement, and API server.
"""

import asyncio
import logging
import uvicorn
from config import API_HOST, API_PORT
from gamma_client import fetch_all_markets
from store import store
from ws_manager import shard_manager
from discovery import run_discovery_loop
from settlement import run_settlement_loop
from database import init_db
from server import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-18s │ %(levelname)-5s │ %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("main")


async def bootstrap():
    """Step 1: Initialize DB, fetch markets, start streams."""
    logger.info("=" * 60)
    logger.info("POLYMARKET DATA PLATFORM — Starting up")
    logger.info("=" * 60)

    # Initialize database
    init_db()
    logger.info("Database initialized ✓")

    logger.info("Step 1: Bootstrapping from Gamma API...")
    markets = await fetch_all_markets()

    if not markets:
        logger.error("No markets fetched! Check network / Gamma API.")
        return

    await store.bulk_upsert_markets(markets)

    all_token_ids = []
    for m in markets:
        all_token_ids.extend(m.clob_token_ids)

    logger.info(f"Bootstrapped {len(markets)} markets with {len(all_token_ids)} token IDs")

    # Step 2: Start WebSocket shards
    logger.info("Step 2: Starting WebSocket shards...")
    await shard_manager.start(all_token_ids)

    # Step 3: Start discovery loop
    logger.info("Step 3: Starting market discovery loop...")
    asyncio.create_task(run_discovery_loop())

    # Step 4: Start settlement loop
    logger.info("Step 4: Starting auto-settlement loop...")
    asyncio.create_task(run_settlement_loop())

    logger.info("=" * 60)
    logger.info(f"✓ Platform ready — API at http://localhost:{API_PORT}")
    logger.info(f"  REST:       http://localhost:{API_PORT}/api/markets")
    logger.info(f"  Betting:    http://localhost:{API_PORT}/api/bets")
    logger.info(f"  WebSocket:  ws://localhost:{API_PORT}/ws/prices")
    logger.info(f"  Stats:      http://localhost:{API_PORT}/api/stats")
    logger.info("=" * 60)


async def main():
    # Start bootstrap in the background so API server can listen immediately
    asyncio.create_task(bootstrap())
    
    config = uvicorn.Config(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info",
        access_log=False,
    )
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main())
