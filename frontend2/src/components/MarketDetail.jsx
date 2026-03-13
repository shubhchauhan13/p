import { useState, useRef, useEffect } from 'react';
import PriceChart from './PriceChart';
import { showToast } from './Toast';
import { ArrowLeft, ImageIcon, X } from 'lucide-react';
import NewsFeed from './NewsFeed';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function MarketDetail({ market, onClose, user, token, onBalanceUpdate, onNotification }) {
    const [tradeMode, setTradeMode] = useState('buy'); // 'buy' or 'sell'
    const [amount, setAmount] = useState('');
    const [side, setSide] = useState('yes');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [btnAnim, setBtnAnim] = useState('');
    const [userPosition, setUserPosition] = useState(null);
    const submitRef = useRef(null);

    const yesPrice = market.outcome_prices?.[0] || 0;
    const noPrice = market.outcome_prices?.[1] || 0;
    const price = side === 'yes' ? yesPrice : noPrice;

    const [priceDir, setPriceDir] = useState('');
    const prevPriceRef = useRef({ yes: yesPrice, no: noPrice });

    // Trigger sweet gradient sweep on live price changes
    useEffect(() => {
        let dir = '';
        if (yesPrice > prevPriceRef.current.yes || noPrice > prevPriceRef.current.no) dir = 'md-price-flash-up';
        else if (yesPrice < prevPriceRef.current.yes || noPrice < prevPriceRef.current.no) dir = 'md-price-flash-down';

        if (dir) {
            setPriceDir(dir);
            const t = setTimeout(() => setPriceDir(''), 600);
            prevPriceRef.current = { yes: yesPrice, no: noPrice };
            return () => clearTimeout(t);
        }
    }, [yesPrice, noPrice]);

    // Fetch user position for this specific market to know how much they CAN sell
    useEffect(() => {
        if (user && token && tradeMode === 'sell') {
            fetch(`${API_BASE}/api/positions/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Position fetch failed');
                    return res.json();
                })
                .then(data => {
                    if (data.positions) {
                        const pos = data.positions.find(p => p.condition_id === market.condition_id && p.side === side);
                        setUserPosition(pos || { total_shares: 0, total_amount: 0 });
                    }
                })
                .catch(err => {
                    console.error('Position fetch error:', err);
                    setUserPosition({ total_shares: 0, total_amount: 0 });
                });
        }
    }, [user, token, tradeMode, side, market.condition_id]);

    const amtNum = parseFloat(amount) || 0;
    // If buying: amount is $, shares = amount / price
    // If selling: amount is shares, payout = shares * price
    const shares = tradeMode === 'buy' ? (price > 0 ? amtNum / price : 0) : amtNum;
    const potentialPayout = tradeMode === 'buy' ? shares * 1.0 : shares * price;
    const costOrValue = tradeMode === 'buy' ? amtNum : shares * price;
    const potentialProfit = tradeMode === 'buy' ? potentialPayout - amtNum : 0; // Simplified for sell view

    const handleSubmit = async () => {
        if (!user) return setError('Please log in to trade');
        if (amtNum <= 0) return setError('Enter a valid amount');

        if (tradeMode === 'buy' && amtNum > (user.balance || 0)) {
            setError('Insufficient balance. Deposit funds via Cashier first.');
            setBtnAnim('btn-shake-anim');
            setTimeout(() => setBtnAnim(''), 500);
            return;
        }

        if (tradeMode === 'sell' && (!userPosition || amtNum > userPosition.total_shares)) {
            setError(`Insufficient shares. You only own ${(userPosition?.total_shares || 0).toFixed(2)} ${side.toUpperCase()} shares.`);
            setBtnAnim('btn-shake-anim');
            setTimeout(() => setBtnAnim(''), 500);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const endpoint = tradeMode === 'buy' ? '/api/bets' : '/api/sell';
            const bodyPayload = tradeMode === 'buy' ? {
                user_id: user.id,
                condition_id: market.condition_id,
                market_question: market.question,
                side,
                amount: amtNum,
            } : {
                user_id: user.id,
                condition_id: market.condition_id,
                side,
                shares: amtNum,
            };

            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyPayload),
            });
            if (res.status === 401) {
                setError('Session expired. Please log out and log back in.');
                showToast('Session expired — please re-login', 'error');
                return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Trade failed');

            // Success!
            setBtnAnim('btn-success-anim');
            setTimeout(() => setBtnAnim(''), 700);
            setAmount('');
            if (onBalanceUpdate) onBalanceUpdate(data.new_balance);

            const actionVerb = tradeMode === 'buy' ? 'BOUGHT' : 'SOLD';
            if (onNotification) onNotification(`${actionVerb} ${side.toUpperCase()}: ${shares.toFixed(1)} shares @ ${(price * 100).toFixed(1)}¢ on "${market.question.slice(0, 40)}…"`);
            showToast(`${actionVerb} ${shares.toFixed(1)} ${side.toUpperCase()} shares @ ${(price * 100).toFixed(1)}¢`, 'success');

            // Refresh position if we just sold
            if (tradeMode === 'sell' && userPosition) {
                setUserPosition(prev => ({ ...prev, total_shares: prev.total_shares - shares }));
            }
        } catch (err) {
            console.error('[SELL ERROR]', err);
            setError(err.message);
            setBtnAnim('btn-shake-anim');
            setTimeout(() => setBtnAnim(''), 500);
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [10, 50, 100, 250];

    const formatVol = (v) => {
        if (!v) return '$0';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
    };

    return (
        <div className="market-detail-overlay" onClick={onClose}>
            <div className={`market-detail-container ${priceDir}`} onClick={(e) => e.stopPropagation()}>
                <div className="md-nav-bar">
                    <button className="md-back-btn" onClick={onClose}>
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <button className="market-detail-close" onClick={onClose} aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                <div className="market-detail-header">
                    <div className="md-title-row">
                        {market.image ? (
                            <img className="md-image" src={market.image} alt="" />
                        ) : (
                            <div className="md-image-placeholder"><ImageIcon size={24} strokeWidth={1.5} /></div>
                        )}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h1 className="md-title">{market.question}</h1>
                                <div className="live-indicator-wrap">
                                    <div className="live-dot"></div>
                                    <span className="live-indicator-text">Live</span>
                                </div>
                            </div>
                            {market.event_title && (
                                <div className="md-subtitle">{market.event_title}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="market-detail-content">
                    {/* LEFT COLUMN: Chart */}
                    <div className="md-left-col">
                        <div className="md-price-bar">
                            <div className="md-price-stat">
                                <span className="md-stat-label">Yes Price</span>
                                <span className="md-stat-val">{(yesPrice * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="md-price-stat">
                                <span className="md-stat-label">Chance</span>
                                <span className="md-stat-val highlight">{(yesPrice * 100).toFixed(1)}%</span>
                            </div>
                            <div className="md-price-stat">
                                <span className="md-stat-label">Volume</span>
                                <span className="md-stat-val">{formatVol(market.volume)}</span>
                            </div>
                        </div>

                        <div className="md-chart-wrapper">
                            {market.clob_token_ids?.[0] ? (
                                <PriceChart tokenId={market.clob_token_ids[0]} height={350} />
                            ) : (
                                <div className="md-no-chart">Chart data unavailable</div>
                            )}
                        </div>

                        {/* Order Book */}
                        <div className="md-orderbook">
                            <h3>Order Book</h3>
                            <div className="md-ob-row">
                                <span className="ob-label">24h Volume</span>
                                <span>{formatVol(market.volume_24hr)}</span>
                            </div>
                            <div className="md-ob-row">
                                <span className="ob-label">Total Volume</span>
                                <span>{formatVol(market.volume)}</span>
                            </div>
                            <div className="md-ob-row">
                                <span className="ob-label">Liquidity</span>
                                <span>{formatVol(market.liquidity)}</span>
                            </div>
                            <div className="md-ob-row">
                                <span className="ob-label">Spread</span>
                                <span>{((market.spread || 0) * 100).toFixed(1)}¢</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Bet Panel */}
                    <div className="md-right-col">
                        <div className="md-trade-panel">
                            <div className="md-trade-tabs">
                                <button className={`md-trade-tab ${tradeMode === 'buy' ? 'active' : ''}`} onClick={() => setTradeMode('buy')}>Buy</button>
                                <button className={`md-trade-tab ${tradeMode === 'sell' ? 'active' : ''}`} onClick={() => setTradeMode('sell')}>Sell</button>
                                <select className="md-order-type" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', color: 'var(--text-secondary)', padding: '6px 12px', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none' }}><option>Market</option><option>Limit</option></select>
                            </div>

                            <div className="md-side-buttons">
                                <button
                                    className={`md-side-btn yes ${side === 'yes' ? 'active' : ''}`}
                                    onClick={() => setSide('yes')}
                                >
                                    <span className="side-label">Yes</span>
                                    <span className="side-price">{(yesPrice * 100).toFixed(1)}¢</span>
                                </button>
                                <button
                                    className={`md-side-btn no ${side === 'no' ? 'active' : ''}`}
                                    onClick={() => setSide('no')}
                                >
                                    <span className="side-label">No</span>
                                    <span className="side-price">{(noPrice * 100).toFixed(1)}¢</span>
                                </button>
                            </div>

                            <div className="md-amount-box">
                                <label>{tradeMode === 'buy' ? 'Amount ($)' : 'Shares to Sell'}</label>
                                <div className="md-amount-input-wrap">
                                    {tradeMode === 'buy' && <span className="md-currency">$</span>}
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => { setAmount(e.target.value); setError(''); }}
                                        placeholder="0"
                                        style={tradeMode === 'sell' ? { paddingLeft: '16px' } : {}}
                                    />
                                </div>
                                <div className="md-quick-amounts">
                                    {tradeMode === 'buy' ? quickAmounts.map(a => (
                                        <button key={a} onClick={() => setAmount(a.toString())}>+${a}</button>
                                    )) : (
                                        <span style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0' }}>
                                            Available to sell: {(userPosition?.total_shares || 0).toFixed(2)}
                                        </span>
                                    )}
                                    <button onClick={() => {
                                        if (tradeMode === 'buy') {
                                            setAmount(user?.balance ? String(Math.floor(user.balance * 100) / 100) : '0');
                                        } else {
                                            setAmount(userPosition?.total_shares ? String(Math.round(userPosition.total_shares * 100) / 100) : '0');
                                        }
                                    }}>Max</button>
                                </div>
                            </div>

                            <div className="md-summary">
                                <div className="md-summary-row">
                                    <span>Avg Price</span>
                                    <span>{(price * 100).toFixed(1)}¢</span>
                                </div>
                                <div className="md-summary-row">
                                    <span>Shares</span>
                                    <span>{shares.toFixed(2)}</span>
                                </div>
                                <div className="md-summary-row highlight">
                                    <span>{tradeMode === 'buy' ? 'Potential Payout' : 'Estimated Return'}</span>
                                    <span className="green">${potentialPayout.toFixed(2)}</span>
                                </div>
                                {tradeMode === 'buy' && potentialProfit > 0 && (
                                    <div className="md-summary-row">
                                        <span>Profit</span>
                                        <span className="green">+${potentialProfit.toFixed(2)} ({amtNum > 0 ? ((potentialProfit / amtNum) * 100).toFixed(0) : 0}%)</span>
                                    </div>
                                )}
                            </div>

                            {error && <div className="md-error">{error}</div>}

                            <button
                                ref={submitRef}
                                className={`md-submit-btn ${side === 'yes' ? 'yes-btn' : 'no-btn'} ${btnAnim}`}
                                onClick={handleSubmit}
                                disabled={loading || !amount || parseFloat(amount) <= 0 || (tradeMode === 'sell' && (!userPosition || userPosition.total_shares <= 0))}
                            >
                                {loading ? (
                                    <><span className="btn-spinner" /> Processing...</>
                                ) : (
                                    user ? `${tradeMode === 'buy' ? 'Buy' : 'Sell'} ${side.toUpperCase()} — ${tradeMode === 'buy' ? '$' + costOrValue.toFixed(2) : shares.toFixed(2) + ' Shares'}` : 'Log In to Trade'
                                )}
                            </button>

                            {user && (
                                <div className="md-balance-hint">
                                    Available: ${Number(user.balance || 0).toFixed(2)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* News Feed Section */}
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Live News Feed</h3>
                    <NewsFeed slug={market.event_title || market.question} />
                </div>
            </div>
        </div>
    );
}
