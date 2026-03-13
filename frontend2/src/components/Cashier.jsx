import { useState } from 'react';
import { showToast } from './Toast';
import { X, CreditCard, Building2, Bitcoin } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function Cashier({ token, user, onBalanceUpdate, onClose }) {
    const [action, setAction] = useState('deposit'); // 'deposit' or 'withdraw'
    const [payMethod, setPayMethod] = useState('card'); // 'card', 'bank', 'crypto'
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Mock form fields
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setName] = useState('');

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return value;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        if (action === 'withdraw' && amt > user.balance) {
            setError(`Cannot withdraw more than your balance of $${Number(user?.balance || 0).toFixed(2)}`);
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        // Mock payment processing delay
        await new Promise(r => setTimeout(r, 1200));

        try {
            const endpoint = action === 'deposit' ? '/api/banking/deposit' : '/api/banking/withdraw';
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: amt })
            });
            const data = await res.json();

            if (!res.ok) {
                // Handle token expiration specifically
                if (res.status === 401) {
                    throw new Error("Your session has expired. Please refresh the page and log in again.");
                }
                throw new Error(data.detail || `${action} failed`);
            }

            setSuccess(`Successfully ${action === 'deposit' ? 'deposited' : 'withdrawn'} $${amt.toFixed(2)} via ${payMethod.toUpperCase()}`);
            setAmount('');
            setCardNumber('');
            setExpiry('');
            setCvc('');
            setName('');
            onBalanceUpdate(data.balance);
            showToast(`$${amt.toFixed(2)} ${action === 'deposit' ? 'deposited' : 'withdrawn'} successfully`, 'success');
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="portfolio-overlay" onClick={onClose}>
            <div className="portfolio-panel cashier-panel" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="portfolio-header">
                    <div>
                        <h2>Cashier</h2>
                        <p className="pm-subtitle">Manage your funds securely</p>
                    </div>
                    <button className="portfolio-x" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Balance Card */}
                <div className="pm-balance-card">
                    <span className="pm-balance-label">Available Balance</span>
                    <span className="pm-balance-amount">${Number(user?.balance || 0).toFixed(2)}</span>
                </div>

                {/* Deposit / Withdraw Tabs */}
                <div className="pm-tabs">
                    <button
                        className={`pm-tab ${action === 'deposit' ? 'active' : ''}`}
                        onClick={() => { setAction('deposit'); setError(''); setSuccess(''); }}
                    >💳 Deposit</button>
                    <button
                        className={`pm-tab ${action === 'withdraw' ? 'active' : ''}`}
                        onClick={() => { setAction('withdraw'); setError(''); setSuccess(''); }}
                    >🏦 Withdraw</button>
                </div>

                {/* Payment Method Selector */}
                <div className="pm-method-row">
                    {[
                        { id: 'card', icon: <CreditCard size={14} />, label: 'Card' },
                        { id: 'bank', icon: <Building2 size={14} />, label: 'Bank' },
                        { id: 'crypto', icon: <Bitcoin size={14} />, label: 'Crypto' },
                    ].map(m => (
                        <button
                            key={m.id}
                            type="button"
                            className={`pm-method-btn ${payMethod === m.id ? 'active' : ''}`}
                            onClick={() => setPayMethod(m.id)}
                        >
                            {m.icon} {m.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="pm-form">

                    {payMethod === 'card' && (
                        <div className="pm-fields">
                            <div className="pm-field">
                                <label className="pm-label">Cardholder Name</label>
                                <input type="text" className="pm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                            </div>
                            <div className="pm-field">
                                <label className="pm-label">Card Number</label>
                                <input type="text" className="pm-input" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength="19" required />
                            </div>
                            <div className="pm-field-row">
                                <div className="pm-field">
                                    <label className="pm-label">Expiry</label>
                                    <input type="text" className="pm-input" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" maxLength="5" required />
                                </div>
                                <div className="pm-field">
                                    <label className="pm-label">CVC</label>
                                    <input type="text" className="pm-input" value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" maxLength="4" required />
                                </div>
                            </div>
                        </div>
                    )}

                    {payMethod === 'bank' && (
                        <div className="pm-fields">
                            <div className="pm-field">
                                <label className="pm-label">Account Name</label>
                                <input type="text" className="pm-input" placeholder="John Doe" required />
                            </div>
                            <div className="pm-field-row">
                                <div className="pm-field">
                                    <label className="pm-label">Routing Number</label>
                                    <input type="text" className="pm-input" placeholder="000000000" required />
                                </div>
                                <div className="pm-field">
                                    <label className="pm-label">Account Number</label>
                                    <input type="password" className="pm-input" placeholder="••••••••" required />
                                </div>
                            </div>
                        </div>
                    )}

                    {payMethod === 'crypto' && (
                        <div className="pm-crypto-card">
                            <div className="pm-crypto-icon">₿</div>
                            <div className="pm-field">
                                <label className="pm-label">USDC (Polygon) Address</label>
                                <input type="text" className="pm-input" value="0x71C...976F" readOnly />
                            </div>
                        </div>
                    )}

                    <div className="pm-field">
                        <label className="pm-label">Amount (USD)</label>
                        <div className="pm-amount-wrap">
                            <span className="pm-currency">$</span>
                            <input
                                type="number"
                                className="pm-input pm-amount-input"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setError(''); setSuccess(''); }}
                                placeholder="0.00"
                                min="10"
                                step="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="pm-quick-amounts">
                        {[50, 100, 500, 1000].map(a => (
                            <button
                                type="button"
                                key={a}
                                className="pm-quick-btn"
                                onClick={() => { setAmount(String(a)); setError(''); setSuccess(''); }}
                            >${a}</button>
                        ))}
                    </div>

                    {error && <div className="pm-error">{error}</div>}
                    {success && <div className="pm-success">{success}</div>}

                    <button type="submit" className={`pm-submit ${action}`} disabled={loading || !amount}>
                        {loading ? '⏳ Processing...' : (action === 'deposit' ? `Deposit $${amount || '0.00'}` : `Withdraw $${amount || '0.00'}`)}
                    </button>

                    <p className="pm-hint">🔒 256-bit encryption. {action === 'deposit' ? 'Funds available instantly.' : 'Withdrawals process in 1-3 days.'}</p>
                </form>
            </div>
        </div>
    );
}
