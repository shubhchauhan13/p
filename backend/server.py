"""
FastAPI server — REST + WebSocket API for the frontend.
Includes price history proxy, news proxy, tag-based filtering,
and the internal betting system (auth, bets, settlement).
"""

import asyncio
import json
import logging
import xml.etree.ElementTree as ET
from html import unescape
import aiohttp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from store import store
from database import (
    create_user, get_user_by_id, get_user_by_username, get_user_by_email,
    get_all_users, get_platform_stats, update_balance, deposit_funds, withdraw_funds,
    place_bet, sell_position, get_user_bets, get_user_positions, get_balance,
    get_leaderboard, is_market_settled
)
from auth import (
    verify_password, get_password_hash, create_access_token, decode_access_token
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

logger = logging.getLogger(__name__)

app = FastAPI(title="Polymarket Data Platform", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLOB_BASE = "https://clob.polymarket.com"
NEWS_RSS_URL = "https://news.google.com/rss/search"


# ==================== PYDANTIC MODELS ====================

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email_or_username: str
    password: str

class PlaceBetRequest(BaseModel):
    user_id: str
    condition_id: str
    market_question: str = ""
    side: str  # "yes" or "no"
    amount: float

class SellRequest(BaseModel):
    user_id: str
    condition_id: str
    side: str
    shares: float

class AdjustBalanceRequest(BaseModel):
    user_id: str
    amount: float  # can be negative to deduct

class BankingRequest(BaseModel):
    amount: float

# ==================== ADMIN ENDPOINTS ====================

def require_admin(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@app.get("/api/admin/users")
async def api_admin_get_users(admin: dict = Depends(require_admin), limit: int = 100, offset: int = 0):
    users = get_all_users(limit, offset)
    return {"users": users}

@app.get("/api/admin/stats")
async def api_admin_get_stats(admin: dict = Depends(require_admin)):
    stats = get_platform_stats()
    return stats

@app.post("/api/admin/users/balance")
async def api_admin_adjust_balance(req: AdjustBalanceRequest, admin: dict = Depends(require_admin)):
    target_user = get_user_by_id(req.user_id)
    if not target_user:
        raise HTTPException(404, "Target user not found")
    new_balance = update_balance(req.user_id, req.amount)
    return {"user_id": req.user_id, "new_balance": new_balance, "adjustment": req.amount}

# ==================== AUTH ENDPOINTS ====================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    """Register a new user."""
    if len(req.username) < 3 or len(req.password) < 6:
        raise HTTPException(400, "Username (min 3) or password (min 6) too short")
    
    hashed_pwd = get_password_hash(req.password)
    try:
        user = create_user(req.username, req.email, hashed_pwd)
        token = create_access_token({"sub": user["id"], "username": user["username"]})
        return {"token": token, "user": user}
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    """Login and return JWT token."""
    login_str = req.email_or_username.lower().strip()
    user = get_user_by_email(login_str)
    if not user:
        user = get_user_by_username(login_str)
    
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "username": user["username"]})
    return {"token": token, "user": user}


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current logged in user."""
    return current_user

# ==================== BANKING ENDPOINTS ====================

@app.post("/api/banking/deposit")
async def api_deposit(req: BankingRequest, user: dict = Depends(get_current_user)):
    try:
        updated_user = deposit_funds(user["id"], req.amount)
        return updated_user
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/banking/withdraw")
async def api_withdraw(req: BankingRequest, user: dict = Depends(get_current_user)):
    try:
        updated_user = withdraw_funds(user["id"], req.amount)
        return updated_user
    except ValueError as e:
        raise HTTPException(400, str(e))

# ==================== BETTING ENDPOINTS ====================

@app.post("/api/bets")
async def api_place_bet(req: PlaceBetRequest, user: dict = Depends(get_current_user)):
    """Place a bet on a market."""
    # Look up current market price from store
    market = await store.get_market(req.condition_id)
    if not market:
        raise HTTPException(404, "Market not found")

    prices = market.get("outcome_prices", [0, 0])
    if req.side == "yes":
        price = prices[0] if prices else 0
    else:
        price = prices[1] if len(prices) > 1 else 0

    if price <= 0 or price >= 1:
        raise HTTPException(400, f"Invalid market price: {price}")

    question = req.market_question or market.get("question", "")

    if req.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot place bet for another user")
        
    try:
        bet = place_bet(
            user_id=req.user_id,
            condition_id=req.condition_id,
            market_question=question,
            side=req.side,
            price=round(price, 4),
            amount=req.amount,
        )
        # Return updated balance too
        balance = get_balance(req.user_id)
        return {"bet": bet, "new_balance": balance}
    except ValueError as e:
        raise HTTPException(400, str(e))

@app.post("/api/sell")
async def api_sell_position(req: SellRequest, user: dict = Depends(get_current_user)):
    """Sell open shares back to the AMM."""
    if req.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Cannot sell position for another user")
        
    market = await store.get_market(req.condition_id)
    if not market:
        raise HTTPException(404, "Market not found")
        
    prices = market.get("outcome_prices", [0, 0])
    if req.side == "yes":
        price = prices[0] if prices else 0
    else:
        price = prices[1] if len(prices) > 1 else 0

    if price <= 0 or price >= 1:
        raise HTTPException(400, f"Invalid market price: {price}")
        
    try:
        result = sell_position(
            user_id=req.user_id,
            condition_id=req.condition_id,
            side=req.side,
            amount_shares_to_sell=req.shares,
            current_price=round(price, 4)
        )
        balance = get_balance(req.user_id)
        result["new_balance"] = balance
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/bets/{user_id}")
async def api_get_bets(user_id: str, status: str = None, current_user: dict = Depends(get_current_user)):
    """Get all bets for a user, optionally filtered by status."""
    if user_id != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    bets = get_user_bets(user_id, status)
    return {"bets": bets, "total": len(bets)}


@app.get("/api/positions/{user_id}")
async def api_get_positions(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get aggregated positions per market for a user."""
    if user_id != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    positions = get_user_positions(user_id)
    # Enrich with current prices from store
    for pos in positions:
        market = await store.get_market(pos["condition_id"])
        if market:
            prices = market.get("outcome_prices", [0, 0])
            current_price = prices[0] if pos["side"] == "yes" else (prices[1] if len(prices) > 1 else 0)
            pos["current_price"] = round(current_price, 4)
            pos["current_value"] = round(pos["total_shares"] * current_price, 2)
            pos["pnl"] = round(pos["current_value"] - pos["total_amount"], 2)
        else:
            pos["current_price"] = 0
            pos["current_value"] = 0
            pos["pnl"] = 0
    return {"positions": positions}


@app.get("/api/leaderboard")
async def api_leaderboard(limit: int = 20):
    """Get top users by balance."""
    return get_leaderboard(limit)


# ==================== MARKET ENDPOINTS ====================

@app.get("/api/markets")
async def get_markets(
    search: str = Query("", description="Search markets"),
    category: str = Query("", description="Filter by category"),
    tag: str = Query("", description="Filter by tag slug"),
    sort: str = Query("volume_24hr", description="Sort"),
    limit: int = Query(100, ge=1, le=2000),
    offset: int = Query(0, ge=0),
):
    markets, total = await store.get_all_markets(search=search, category=category,
                                                   tag=tag, sort_by=sort,
                                                   limit=limit, offset=offset)
    return {"markets": markets, "total": total,
            "limit": limit, "offset": offset}


@app.get("/api/tags")
async def get_tags():
    return await store.get_tags_with_counts()


@app.get("/api/tags/{slug}/sub")
async def get_sub_tags(slug: str):
    return await store.get_sub_tags_for(slug)


@app.get("/api/markets/{condition_id}")
async def get_market(condition_id: str):
    market = await store.get_market(condition_id)
    if not market:
        raise HTTPException(404, "Market not found")
    return market


@app.get("/api/stats")
async def get_stats():
    return await store.get_stats()


@app.get("/api/categories")
async def get_categories():
    markets, _ = await store.get_all_markets(limit=50000)
    categories = set()
    for m in markets:
        cat = m.get("category", "")
        if cat:
            categories.add(cat)
    return sorted(categories)


@app.get("/api/prices-history/{token_id}")
async def get_price_history(
    token_id: str,
    interval: str = Query("max"),
    fidelity: int = Query(60),
):
    url = f"{CLOB_BASE}/prices-history"
    params = {"market": token_id, "interval": interval, "fidelity": fidelity}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return {"history": [], "error": f"CLOB API returned {resp.status}"}
                return await resp.json()
    except Exception as e:
        return {"history": [], "error": str(e)}


@app.get("/api/news/{slug}")
async def get_news(slug: str, limit: int = Query(5, ge=1, le=15)):
    query = slug.replace("-", " ")
    words = [w for w in query.split() if len(w) > 2 and w not in ("will", "the", "and", "for", "has", "are", "was", "can", "not")]
    search_query = " ".join(words[:6])
    params = {"q": search_query, "hl": "en-US", "gl": "US", "ceid": "US:en"}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(NEWS_RSS_URL, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    return {"articles": []}
                raw = await resp.text()
                return {"articles": _parse_rss(raw, limit)}
    except Exception as e:
        return {"articles": []}


def _parse_rss(xml_text: str, limit: int) -> list:
    articles = []
    try:
        root = ET.fromstring(xml_text)
        for item in root.findall(".//item"):
            if len(articles) >= limit:
                break
            title_el = item.find("title")
            link_el = item.find("link")
            pub_date_el = item.find("pubDate")
            source_el = item.find("source")
            title = title_el.text if title_el is not None else ""
            source = source_el.text if source_el is not None else ""
            if "polymarket" in source.lower():
                continue
            articles.append({
                "title": unescape(title) if title else "",
                "link": link_el.text if link_el is not None else "",
                "pubDate": pub_date_el.text if pub_date_el is not None else "",
                "source": source,
            })
    except ET.ParseError:
        pass
    return articles


# ==================== WEBSOCKET ====================

@app.websocket("/ws/prices")
async def websocket_prices(ws: WebSocket):
    await ws.accept()
    logger.info("Frontend WebSocket client connected")
    queue = store.subscribe()
    try:
        while True:
            message = await queue.get()
            await ws.send_text(message)
    except WebSocketDisconnect:
        logger.info("Frontend WebSocket client disconnected")
    except Exception as e:
        logger.warning(f"Frontend WebSocket error: {e}")
    finally:
        store.unsubscribe(queue)

# ==================== STATIC FRONTEND SERVING ====================
import os
frontend_dist_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")
    
    # Catch-all route to serve the SPA index.html
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Ignore API and WS routes
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="Not found")
            
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
