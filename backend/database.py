"""
SQLite database for the betting system.
Tables: users, bets, settlements
"""
from __future__ import annotations

import sqlite3
import uuid
import time
import os
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "polymarket.db")

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER NOT NULL DEFAULT 0,
            balance REAL NOT NULL DEFAULT 1000.0,
            total_deposited REAL NOT NULL DEFAULT 1000.0,
            total_withdrawn REAL NOT NULL DEFAULT 0.0,
            created_at REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            condition_id TEXT NOT NULL,
            market_question TEXT NOT NULL DEFAULT '',
            side TEXT NOT NULL CHECK(side IN ('yes', 'no')),
            price REAL NOT NULL,
            amount REAL NOT NULL,
            shares REAL NOT NULL,
            potential_payout REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'won', 'lost', 'cancelled')),
            payout REAL NOT NULL DEFAULT 0.0,
            placed_at REAL NOT NULL,
            settled_at REAL
        );

        CREATE TABLE IF NOT EXISTS settlements (
            condition_id TEXT PRIMARY KEY,
            winning_side TEXT NOT NULL CHECK(winning_side IN ('yes', 'no')),
            resolution_source TEXT DEFAULT '',
            settled_at REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
        CREATE INDEX IF NOT EXISTS idx_bets_condition ON bets(condition_id);
        CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
    """)
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {DB_PATH}")


# --- User operations ---

def create_user(username: str, email: str, password_hash: str) -> dict:
    conn = get_db()
    user_id = str(uuid.uuid4())
    now = time.time()
    try:
        conn.execute(
            "INSERT INTO users (id, username, email, password_hash, balance, total_deposited, created_at) VALUES (?, ?, ?, ?, 1000.0, 1000.0, ?)",
            (user_id, username.lower().strip(), email.lower().strip(), password_hash, now)
        )
        conn.commit()
        return get_user_by_id(user_id)
    except sqlite3.IntegrityError:
        raise ValueError("Username or email already exists")
    finally:
        conn.close()

def get_user_by_id(user_id: str) -> dict:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_username(username: str) -> dict:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username.lower().strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email: str) -> dict:
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_users(limit: int = 100, offset: int = 0) -> list:
    conn = get_db()
    rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_platform_stats() -> dict:
    conn = get_db()
    stats = {}
    stats["total_users"] = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    stats["total_balance"] = conn.execute("SELECT SUM(balance) FROM users").fetchone()[0] or 0.0
    stats["total_open_bets"] = conn.execute("SELECT COUNT(*) FROM bets WHERE status = 'open'").fetchone()[0]
    stats["total_open_amount"] = conn.execute("SELECT SUM(amount) FROM bets WHERE status = 'open'").fetchone()[0] or 0.0
    conn.close()
    return stats


def update_balance(user_id: str, delta: float) -> float:
    """Add or subtract from user balance. Returns new balance."""
    conn = get_db()
    conn.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (delta, user_id))
    conn.commit()
    row = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row["balance"] if row else 0.0

def deposit_funds(user_id: str, amount: float) -> dict:
    if amount <= 0: raise ValueError("Deposit amount must be positive")
    conn = get_db()
    conn.execute("UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE id = ?", (amount, amount, user_id))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)

def withdraw_funds(user_id: str, amount: float) -> dict:
    if amount <= 0: raise ValueError("Withdraw amount must be positive")
    conn = get_db()
    current = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
    if not current or current["balance"] < amount:
        conn.close()
        raise ValueError("Insufficient balance")
        
    conn.execute("UPDATE users SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE id = ?", (amount, amount, user_id))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)

def get_balance(user_id: str) -> float:
    conn = get_db()
    row = conn.execute("SELECT balance FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row["balance"] if row else 0.0


# --- Bet operations ---

def place_bet(user_id: str, condition_id: str, market_question: str,
              side: str, price: float, amount: float) -> dict:
    """
    Place a bet. Returns the bet dict or raises ValueError.
    Shares = amount / price. Potential payout = shares * 1.0.
    """
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if price <= 0 or price >= 1:
        raise ValueError("Invalid price")
    if side not in ("yes", "no"):
        raise ValueError("Side must be 'yes' or 'no'")

    balance = get_balance(user_id)
    if balance < amount:
        raise ValueError(f"Insufficient balance: ${balance:.2f} < ${amount:.2f}")

    # Check if market already settled
    conn = get_db()
    settled = conn.execute("SELECT * FROM settlements WHERE condition_id = ?", (condition_id,)).fetchone()
    if settled:
        conn.close()
        raise ValueError("Market already settled")

    shares = amount / price
    potential_payout = shares * 1.0  # each share pays $1 if won
    bet_id = str(uuid.uuid4())
    now = time.time()

    conn.execute(
        """INSERT INTO bets (id, user_id, condition_id, market_question, side, price, amount, shares, potential_payout, status, placed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)""",
        (bet_id, user_id, condition_id, market_question, side, price, amount, shares, potential_payout, now)
    )
    conn.execute("UPDATE users SET balance = balance - ? WHERE id = ?", (amount, user_id))
    conn.commit()
    bet = dict(conn.execute("SELECT * FROM bets WHERE id = ?", (bet_id,)).fetchone())
    conn.close()

    logger.info(f"Bet placed: {user_id[:8]} bet ${amount:.2f} on {side} @ {price:.3f} → {shares:.2f} shares")
    return bet


def get_user_bets(user_id: str, status: str = None) -> list:
    conn = get_db()
    if status:
        rows = conn.execute(
            "SELECT * FROM bets WHERE user_id = ? AND status = ? ORDER BY placed_at DESC",
            (user_id, status)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM bets WHERE user_id = ? ORDER BY placed_at DESC",
            (user_id,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_user_positions(user_id: str) -> list:
    """Aggregate open bets per market into positions."""
    conn = get_db()
    rows = conn.execute("""
        SELECT condition_id, market_question, side,
               SUM(amount) as total_amount,
               SUM(shares) as total_shares,
               AVG(price) as avg_price,
               SUM(potential_payout) as total_potential_payout,
               COUNT(*) as num_bets
        FROM bets
        WHERE user_id = ? AND status = 'open'
        GROUP BY condition_id, side
        ORDER BY MAX(placed_at) DESC
    """, (user_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def sell_position(user_id: str, condition_id: str, side: str, amount_shares_to_sell: float, current_price: float) -> dict:
    """
    Sell a portion (or all) of an open position.
    Since we don't have an orderbook, users sell back to the AMM at current_price.
    We iterate through open bets for this condition+side, reducing shares until we've sold `amount_shares_to_sell`.
    Returns the payout amount added to balance.
    """
    if amount_shares_to_sell <= 0:
        raise ValueError("Must sell a positive amount of shares.")
    
    conn = get_db()
    
    # Get all open bets for this position, ordered oldest first
    bets = conn.execute(
        "SELECT id, amount, shares, potential_payout FROM bets WHERE user_id = ? AND condition_id = ? AND side = ? AND status = 'open' ORDER BY placed_at ASC",
        (user_id, condition_id, side)
    ).fetchall()
    
    total_owned_shares = sum(b["shares"] for b in bets)
    if total_owned_shares < amount_shares_to_sell - 1e-6: # Float arithmetic tolerance
        conn.close()
        raise ValueError(f"Not enough shares to sell. Own {total_owned_shares:.4f}, trying to sell {amount_shares_to_sell:.4f}")

    shares_remaining_to_sell = amount_shares_to_sell
    payout = float(amount_shares_to_sell) * current_price

    # Decrement shares from existing bets
    for bet in bets:
        if shares_remaining_to_sell <= 0:
            break
            
        bet_shares = float(bet["shares"])
        if bet_shares <= shares_remaining_to_sell:
            # Sell this entire bet
            shares_remaining_to_sell -= bet_shares
            # Mark bet as sold/closed
            conn.execute("UPDATE bets SET status = 'sold', shares = 0, amount = 0, potential_payout = 0 WHERE id = ?", (bet["id"],))
        else:
            # Sell partial bet
            new_shares = bet_shares - shares_remaining_to_sell
            # Recalculate original cost foundation proportionally
            ratio = new_shares / bet_shares
            new_amount = float(bet["amount"]) * ratio
            new_potential = new_shares * 1.0
            
            conn.execute(
                "UPDATE bets SET shares = ?, amount = ?, potential_payout = ? WHERE id = ?",
                (new_shares, new_amount, new_potential, bet["id"])
            )
            shares_remaining_to_sell = 0

    # Add payout to user balance
    conn.execute("UPDATE users SET balance = balance + ? WHERE id = ?", (payout, user_id))
    conn.commit()
    
    # Get updated position
    remaining_position = get_user_positions(user_id) # Getting all is fine for now
    conn.close()
    
    return {"payout_received": payout, "shares_sold": amount_shares_to_sell}

# --- Settlement operations ---

def settle_market(condition_id: str, winning_side: str, resolution_source: str = "") -> dict:
    """
    Settle a market: winning bets get shares * $1.0, losers get $0.
    Returns summary of settlement.
    """
    if winning_side not in ("yes", "no"):
        raise ValueError("winning_side must be 'yes' or 'no'")

    conn = get_db()

    # Check not already settled
    existing = conn.execute("SELECT * FROM settlements WHERE condition_id = ?", (condition_id,)).fetchone()
    if existing:
        conn.close()
        raise ValueError("Market already settled")

    now = time.time()

    # Record settlement
    conn.execute(
        "INSERT INTO settlements (condition_id, winning_side, resolution_source, settled_at) VALUES (?, ?, ?, ?)",
        (condition_id, winning_side, resolution_source, now)
    )

    # Get all open bets for this market
    bets = conn.execute(
        "SELECT * FROM bets WHERE condition_id = ? AND status = 'open'",
        (condition_id,)
    ).fetchall()

    winners = 0
    losers = 0
    total_payout = 0.0

    for bet in bets:
        if bet["side"] == winning_side:
            # Winner: payout = shares * $1.0
            payout = bet["shares"] * 1.0
            conn.execute(
                "UPDATE bets SET status = 'won', payout = ?, settled_at = ? WHERE id = ?",
                (payout, now, bet["id"])
            )
            conn.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (payout, bet["user_id"])
            )
            total_payout += payout
            winners += 1
        else:
            # Loser: $0
            conn.execute(
                "UPDATE bets SET status = 'lost', payout = 0, settled_at = ? WHERE id = ?",
                (now, bet["id"])
            )
            losers += 1

    conn.commit()
    conn.close()

    summary = {
        "condition_id": condition_id,
        "winning_side": winning_side,
        "total_bets": len(bets),
        "winners": winners,
        "losers": losers,
        "total_payout": round(total_payout, 2),
    }
    logger.info(f"Market settled: {condition_id[:16]}... → {winning_side} wins | {winners} winners, {losers} losers, ${total_payout:.2f} paid")
    return summary


def is_market_settled(condition_id: str) -> bool:
    conn = get_db()
    row = conn.execute("SELECT 1 FROM settlements WHERE condition_id = ?", (condition_id,)).fetchone()
    conn.close()
    return row is not None


def get_leaderboard(limit: int = 20) -> list:
    """Get top users by balance."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, balance, total_deposited, created_at FROM users ORDER BY balance DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
