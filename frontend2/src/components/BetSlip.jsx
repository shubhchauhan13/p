import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function BetSlip({ market, side, onClose, user, token, onBalanceUpdate }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');

    const prices = market?.outcome_prices || [0, 0];
    const price = side === 'yes' ? prices[0] : prices[1];
    const amtNum = parseFloat(amount) || 0;
    const shares = price > 0 ? amtNum / price : 0;
    const potentialPayout = shares * 1.0;
    const potentialProfit = potentialPayout - amtNum;
    const percentReturn = amtNum > 0 ? (potentialProfit / amtNum * 100) : 0;

    const handleSubmit = async () => {
        if (amtNum <= 0) return setError('Enter a valid amount');
        if (amtNum > user.balance) return setError('Insufficient balance');

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/bets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: user.id,
                    condition_id: market.condition_id,
                    market_question: market.question,
                    side,
                    amount: amtNum,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Bet failed');
            setSuccess(data);
            onBalanceUpdate(data.new_balance);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = [10, 25, 50, 100, 250];

    if (success) {
        return (
            <div className="betslip-overlay" onClick={onClose}>
                <div className="betslip-card" onClick={e => e.stopPropagation()}>
                    <div className="betslip-success">
                        <div className="betslip-check">✅</div>
                        <h3>Bet Placed!</h3>
                        <p className="betslip-detail">
                            <strong>{side.toUpperCase()}</strong> @ {(price * 100).toFixed(1)}¢
                        </p>
                        <p className="betslip-detail">
                            Amount: <strong>${amtNum.toFixed(2)}</strong> → {shares.toFixed(2)} shares
                        </p>
                        <p className="betslip-detail">
                            Potential payout: <strong>${potentialPayout.toFixed(2)}</strong>
                        </p>
                        <button className="betslip-close-btn" onClick={onClose}>Done</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="betslip-overlay" onClick={onClose}>
            <div className="betslip-card" onClick={e => e.stopPropagation()}>
                <div className="betslip-header">
                    <h3 className="betslip-title">{market.question}</h3>
                    <button className="betslip-x" onClick={onClose}>✕</button>
                </div>

                <div className="betslip-side-badge" data-side={side}>
                    {side === 'yes' ? '✅ YES' : '❌ NO'} @ {(price * 100).toFixed(1)}¢
                </div>

                <div className="betslip-amount-section">
                    <label className="betslip-label">Amount ($)</label>
                    <input
                        type="number"
                        className="betslip-amount-input"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setError(''); }}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        autoFocus
                    />
                    <div className="betslip-quick-amounts">
                        {quickAmounts.map(a => (
                            <button
                                key={a}
                                className="betslip-quick"
                                onClick={() => { setAmount(String(a)); setError(''); }}
                            >
                                ${a}
                            </button>
                        ))}
                        <button
                            className="betslip-quick max"
                            onClick={() => { setAmount(String(Math.floor(user.balance * 100) / 100)); setError(''); }}
                        >
                            Max
                        </button>
                    </div>
                </div>

                <div className="betslip-summary">
                    <div className="betslip-row">
                        <span>Shares</span>
                        <span>{shares.toFixed(2)}</span>
                    </div>
                    <div className="betslip-row">
                        <span>Avg. Price</span>
                        <span>{(price * 100).toFixed(1)}¢</span>
                    </div>
                    <div className="betslip-row highlight">
                        <span>Potential Payout</span>
                        <span className="payout-green">${potentialPayout.toFixed(2)}</span>
                    </div>
                    <div className="betslip-row">
                        <span>Potential Return</span>
                        <span className="payout-green">+{percentReturn.toFixed(0)}%</span>
                    </div>
                </div>

                <div className="betslip-balance">
                    Balance: <strong>${Number(user?.balance || 0).toFixed(2)}</strong>
                </div>

                {error && <div className="betslip-error">{error}</div>}

                <button
                    className={`betslip-submit ${side}`}
                    onClick={handleSubmit}
                    disabled={loading || amtNum <= 0}
                >
                    {loading ? 'Placing...' : `Buy ${side.toUpperCase()} — $${amtNum.toFixed(2)}`}
                </button>
            </div>
        </div>
    );
}
