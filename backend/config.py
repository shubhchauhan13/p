"""Central configuration for the Polymarket data platform."""

import os

# Gamma REST API (market discovery)
GAMMA_API_URL = "https://gamma-api.polymarket.com/markets"
GAMMA_PAGE_SIZE = 200

# CLOB WebSocket (real-time streaming)
CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
WS_SHARD_SIZE = 500  # max asset IDs per WebSocket connection

# Market discovery loop
DISCOVERY_INTERVAL_SECONDS = 120  # re-fetch new markets every 2 minutes

# WebSocket reconnection
WS_RECONNECT_BASE_DELAY = 1.0  # seconds
WS_RECONNECT_MAX_DELAY = 60.0
WS_PING_INTERVAL = 20  # seconds
WS_PING_TIMEOUT = 10  # seconds

# FastAPI server
API_HOST = "0.0.0.0"
API_PORT = int(os.environ.get("PORT", 8000))

# Frontend WebSocket broadcast
BROADCAST_THROTTLE_MS = 100  # minimum interval between broadcasts to frontend
