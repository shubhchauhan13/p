import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function Portfolio({ user, token, onClose }) {
    const [tab, setTab] = useState('positions');
    const [positions, setPositions] = useState([]);
    const [bets, setBets] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyFilter, setHistoryFilter] = useState('all'); // all, open, won, lost

    const fetchPositions = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/positions/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setPositions(data.positions || []);
        } catch (err) {
            console.error('Failed to fetch positions:', err);
        }
    }, [user.id, token]);

    const fetchBets = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/bets/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setBets(data.bets || []);
        } catch (err) {
            console.error('Failed to fetch bets:', err);
        }
    }, [user.id, token]);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/leaderboard`);
            const data = await res.json();
            setLeaderboard(data || []);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        Promise.all([fetchPositions(), fetchBets(), fetchLeaderboard()])
            .finally(() => {
                if (mounted) setLoading(false);
            });
        const interval = setInterval(() => {
            fetchPositions();
            fetchBets();
        }, 10000);
        return () => {
            clearInterval(interval);
            mounted = false;
        };
    }, [fetchPositions, fetchBets, fetchLeaderboard]);

    const totalInvested = positions.reduce((s, p) => s + p.total_amount, 0);
    const totalValue = positions.reduce((s, p) => s + (p.current_value || 0), 0);
    const openPnl = totalValue - totalInvested;

    const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
    const winners = bets.filter(b => b.status === 'won');
    const totalWon = winners.reduce((s, b) => s + b.payout, 0);
    const totalLost = settledBets.filter(b => b.status === 'lost').reduce((s, b) => s + b.amount, 0);

    // Performance Metrics
    const realizedPnl = totalWon - totalLost - winners.reduce((s, b) => s + b.amount, 0); // Profit = payout - original investment
    const winRate = settledBets.length > 0 ? (winners.length / settledBets.length) * 100 : 0;
    const maxProfit = winners.length > 0 ? Math.max(...winners.map(b => b.payout - b.amount)) : 0;

    const filteredBets = bets.filter(b => historyFilter === 'all' || b.status === historyFilter);

    return (
        <div className="portfolio-overlay" onClick={onClose}>
            <div className="portfolio-panel" onClick={e => e.stopPropagation()}>
                <div className="portfolio-header">
                    <h2>Portfolio</h2>
                    <button className="portfolio-x" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Summary cards — fixed 2x2 grid */}
                <div className="portfolio-summary">
                    <div className="summary-card">
                        <span className="summary-label">Balance</span>
                        <span className="summary-value">${Number(user?.balance || 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Open Interest</span>
                        <span className="summary-value">${totalInvested.toFixed(2)}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Unrealized P&L</span>
                        <span className={`summary-value ${openPnl >= 0 ? 'positive' : 'negative'}`}>
                            {openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}
                        </span>
                    </div>
                    <div className="summary-card summary-card-highlight">
                        <span className="summary-label">Realized Profit</span>
                        <span className={`summary-value ${realizedPnl >= 0 ? 'positive' : 'negative'}`}>
                            {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Sub-metrics */}
                <div className="portfolio-submetrics">
                    <span>Win Rate: <strong>{winRate.toFixed(1)}%</strong> ({winners.length}/{settledBets.length})</span>
                    <span>Biggest Win: <strong>+${maxProfit.toFixed(2)}</strong></span>
                </div>

                {/* Tabs */}
                <div className="portfolio-tabs">
                    <button className={`ptab ${tab === 'positions' ? 'active' : ''}`} onClick={() => setTab('positions')}>
                        Positions ({positions.length})
                    </button>
                    <button className={`ptab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                        History ({bets.length})
                    </button>
                    <button className={`ptab ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
                        Leaderboard
                    </button>
                </div>

                <div className="portfolio-content">
                    {loading ? (
                        <div className="portfolio-loading">Loading...</div>
                    ) : tab === 'positions' ? (
                        positions.length === 0 ? (
                            <div className="portfolio-empty">No open positions. Start trading!</div>
                        ) : (
                            <div className="positions-list">
                                {positions.map((pos, i) => (
                                    <div key={i} className="position-row">
                                        <div className="position-market">
                                            {(pos.market_question || '').substring(0, 60)}
                                        </div>
                                        <div className="position-details">
                                            <span className={`position-side ${pos.side}`}>{pos.side.toUpperCase()}</span>
                                            <span>{pos.total_shares.toFixed(1)} shares @ {(pos.avg_price * 100).toFixed(1)}¢</span>
                                            <span className="position-invested">${pos.total_amount.toFixed(2)}</span>
                                            <span className={`position-pnl ${(pos.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                                                {(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : tab === 'history' ? (
                        <div className="history-tab-content">
                            <div className="history-filters">
                                {['all', 'open', 'won', 'lost'].map(f => (
                                    <button
                                        key={f}
                                        className={`hfilt-btn ${historyFilter === f ? 'active' : ''}`}
                                        onClick={() => setHistoryFilter(f)}
                                    >{f.toUpperCase()}</button>
                                ))}
                            </div>
                            {filteredBets.length === 0 ? (
                                <div className="portfolio-empty">No bets matching filter.</div>
                            ) : (
                                <div className="bets-list">
                                    {filteredBets.map(bet => {
                                        const isWon = bet.status === 'won';
                                        const isLost = bet.status === 'lost';
                                        const resultText = isWon ? `+$${(bet.payout - bet.amount).toFixed(2)}` :
                                            isLost ? `-$${bet.amount.toFixed(2)}` :
                                                `Est. $${(bet.shares * 1.0).toFixed(2)}`;
                                        const resultClass = isWon ? 'positive' : isLost ? 'negative' : 'neutral';

                                        return (
                                            <div key={bet.id} className={`bet-row ${bet.status}`}>
                                                <div className="bet-market">
                                                    {(bet.market_question || '').substring(0, 50)}
                                                    <div className="bet-date">
                                                        {new Date(bet.placed_at * 1000).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="bet-details">
                                                    <span className={`position-side ${bet.side}`}>{bet.side.toUpperCase()}</span>
                                                    <span>${bet.amount.toFixed(2)} @ {(bet.price * 100).toFixed(1)}¢</span>
                                                    <span className={`bet-status-badge ${bet.status}`}>
                                                        {bet.status === 'open' ? '🔵 Open' :
                                                            bet.status === 'won' ? '🟢 Won' :
                                                                '🔴 Lost'}
                                                    </span>
                                                    <span className={`bet-result ${resultClass}`}>{resultText}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboard.map((u, i) => (
                                <div key={u.id} className={`leaderboard-row ${u.id === user.id ? 'me' : ''}`}>
                                    <span className="lb-rank">#{i + 1}</span>
                                    <span className="lb-name">{u.username}</span>
                                    <span className="lb-balance">${Number(u?.balance || 0).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
