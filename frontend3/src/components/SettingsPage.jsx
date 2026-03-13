import { useState, useEffect } from 'react';
import {
    X, User, Shield, Bell, Clock, HelpCircle,
    Camera, Eye, EyeOff, Check, ChevronRight,
    Smartphone, Mail, Globe, Lock, Trash2,
    Download, ExternalLink
} from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function SettingsPage({ user, token, initialTab = 'account', onClose, onLogout }) {
    const [tab, setTab] = useState(initialTab);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    // Account fields
    const [displayName, setDisplayName] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [bio, setBio] = useState(user?.bio || '');

    // Security fields
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState('');

    // Notification prefs
    const [notifPrefs, setNotifPrefs] = useState({
        emailBets: true,
        emailDeposits: true,
        emailWinnings: true,
        pushBets: false,
        pushMarkets: true,
        marketAlerts: true,
    });

    useEffect(() => { setTab(initialTab); }, [initialTab]);

    const handleSaveAccount = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 800));
        setSaved(true);
        setLoading(false);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwError('');
        setPwSuccess('');
        if (newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
        if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 800));
        setLoading(false);
        setPwSuccess('Password changed successfully!');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
    };

    const tabs = [
        { id: 'account', icon: User, label: 'Account' },
        { id: 'security', icon: Shield, label: 'Security' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'history', icon: Clock, label: 'History' },
        { id: 'help', icon: HelpCircle, label: 'Help' },
    ];

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="settings-header">
                    <div>
                        <h2 className="settings-title">Settings</h2>
                        <p className="settings-subtitle">Manage your account and preferences</p>
                    </div>
                    <button className="portfolio-x" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="settings-body">
                    {/* Sidebar tabs */}
                    <nav className="settings-nav">
                        {tabs.map(t => (
                            <button
                                key={t.id}
                                className={`settings-nav-item ${tab === t.id ? 'active' : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                <t.icon size={16} />
                                {t.label}
                            </button>
                        ))}
                    </nav>

                    {/* Main content */}
                    <div className="settings-content">

                        {/* ── ACCOUNT ── */}
                        {tab === 'account' && (
                            <div className="settings-section">
                                <h3 className="settings-section-title">Account Information</h3>

                                {/* Avatar block */}
                                <div className="settings-avatar-block">
                                    <div className="settings-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                                    <div>
                                        <p className="settings-avatar-name">{user?.username}</p>
                                        <p className="settings-avatar-sub">Member since {user?.created_at
                                            ? new Date(user.created_at * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                            : '—'}</p>
                                        <button className="settings-change-photo"><Camera size={12} /> Change Avatar</button>
                                    </div>
                                </div>

                                <div className="settings-fields">
                                    <div className="settings-field">
                                        <label className="settings-label">Display Name</label>
                                        <input className="settings-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
                                    </div>
                                    <div className="settings-field">
                                        <label className="settings-label">Email Address</label>
                                        <input className="settings-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                                    </div>
                                    <div className="settings-field">
                                        <label className="settings-label">Bio</label>
                                        <textarea className="settings-input settings-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community a bit about yourself..." rows={3} />
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button className="settings-save" onClick={handleSaveAccount} disabled={loading}>
                                        {loading ? 'Saving...' : saved ? <><Check size={14} /> Saved!</> : 'Save Changes'}
                                    </button>
                                </div>

                                {/* Danger zone */}
                                <div className="settings-danger-zone">
                                    <h4 className="danger-title">Danger Zone</h4>
                                    <div className="danger-row">
                                        <div>
                                            <p className="danger-label">Delete Account</p>
                                            <p className="danger-desc">Permanently remove your account and all data.</p>
                                        </div>
                                        <button className="danger-btn"><Trash2 size={14} /> Delete</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── SECURITY ── */}
                        {tab === 'security' && (
                            <div className="settings-section">
                                <h3 className="settings-section-title">Security</h3>

                                <div className="settings-card">
                                    <div className="settings-card-icon"><Lock size={18} /></div>
                                    <div>
                                        <p className="settings-card-title">Change Password</p>
                                        <p className="settings-card-desc">Use a strong password with at least 8 characters.</p>
                                    </div>
                                </div>

                                <form className="settings-fields" onSubmit={handleChangePassword}>
                                    <div className="settings-field">
                                        <label className="settings-label">Current Password</label>
                                        <div className="pw-wrap">
                                            <input className="settings-input" type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" required />
                                            <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                                                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="settings-field">
                                        <label className="settings-label">New Password</label>
                                        <div className="pw-wrap">
                                            <input className="settings-input" type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" required />
                                        </div>
                                    </div>
                                    <div className="settings-field">
                                        <label className="settings-label">Confirm New Password</label>
                                        <div className="pw-wrap">
                                            <input className="settings-input" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" required />
                                        </div>
                                    </div>
                                    {pwError && <div className="pm-error">{pwError}</div>}
                                    {pwSuccess && <div className="pm-success">{pwSuccess}</div>}
                                    <div className="settings-actions">
                                        <button className="settings-save" type="submit" disabled={loading}>
                                            {loading ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>

                                {/* 2FA */}
                                <div className="settings-divider" />
                                <div className="settings-twofa">
                                    <div className="settings-card">
                                        <div className="settings-card-icon"><Smartphone size={18} /></div>
                                        <div style={{ flex: 1 }}>
                                            <p className="settings-card-title">Two-Factor Authentication</p>
                                            <p className="settings-card-desc">Add an extra layer of security with an authenticator app.</p>
                                        </div>
                                        <button className="settings-enable-btn">Enable 2FA</button>
                                    </div>
                                </div>

                                {/* Active sessions */}
                                <div className="settings-divider" />
                                <h4 className="settings-sub-title">Active Sessions</h4>
                                <div className="session-list">
                                    <div className="session-row">
                                        <Globe size={16} className="session-icon" />
                                        <div>
                                            <p className="session-device">Chrome on macOS</p>
                                            <p className="session-meta">Current session · Mumbai, India</p>
                                        </div>
                                        <span className="session-badge current">Current</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── NOTIFICATIONS ── */}
                        {tab === 'notifications' && (
                            <div className="settings-section">
                                <h3 className="settings-section-title">Notification Preferences</h3>

                                <div className="notif-group">
                                    <p className="notif-group-title"><Mail size={14} /> Email Notifications</p>
                                    {[
                                        { key: 'emailBets', label: 'Bet confirmations', desc: 'When your bet is placed or resolved' },
                                        { key: 'emailDeposits', label: 'Deposits & Withdrawals', desc: 'Transaction confirmations' },
                                        { key: 'emailWinnings', label: 'Winning payouts', desc: 'When you win a market' },
                                    ].map(item => (
                                        <div key={item.key} className="notif-row">
                                            <div>
                                                <p className="notif-label">{item.label}</p>
                                                <p className="notif-desc">{item.desc}</p>
                                            </div>
                                            <button
                                                className={`toggle-btn ${notifPrefs[item.key] ? 'on' : ''}`}
                                                onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                                            >
                                                <span className="toggle-knob" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="settings-divider" />

                                <div className="notif-group">
                                    <p className="notif-group-title"><Bell size={14} /> In-App Alerts</p>
                                    {[
                                        { key: 'pushBets', label: 'Bet status changes', desc: 'Market resolution alerts' },
                                        { key: 'pushMarkets', label: 'New trending markets', desc: 'Hot topics in your interests' },
                                        { key: 'marketAlerts', label: 'Price movement alerts', desc: 'When prices shift by 10%+' },
                                    ].map(item => (
                                        <div key={item.key} className="notif-row">
                                            <div>
                                                <p className="notif-label">{item.label}</p>
                                                <p className="notif-desc">{item.desc}</p>
                                            </div>
                                            <button
                                                className={`toggle-btn ${notifPrefs[item.key] ? 'on' : ''}`}
                                                onClick={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                                            >
                                                <span className="toggle-knob" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="settings-actions">
                                    <button className="settings-save" onClick={handleSaveAccount} disabled={loading}>
                                        {loading ? 'Saving...' : saved ? <><Check size={14} /> Saved!</> : 'Save Preferences'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── HISTORY ── */}
                        {tab === 'history' && (
                            <div className="settings-section">
                                <h3 className="settings-section-title">Transaction History</h3>

                                <div className="history-legend">
                                    {[
                                        { emoji: '💳', label: 'Deposit', amount: '+$100.00', date: 'Mar 4, 2026', status: 'completed' },
                                        { emoji: '🏦', label: 'Withdrawal', amount: '-$50.00', date: 'Mar 3, 2026', status: 'completed' },
                                        { emoji: '🎯', label: 'Trade Win', amount: '+$24.50', date: 'Mar 2, 2026', status: 'won' },
                                        { emoji: '❌', label: 'Trade Loss', amount: '-$10.00', date: 'Mar 1, 2026', status: 'lost' },
                                        { emoji: '💳', label: 'Deposit', amount: '+$500.00', date: 'Feb 28, 2026', status: 'completed' },
                                    ].map((tx, i) => (
                                        <div key={i} className="tx-row">
                                            <span className="tx-emoji">{tx.emoji}</span>
                                            <div className="tx-info">
                                                <p className="tx-label">{tx.label}</p>
                                                <p className="tx-date">{tx.date}</p>
                                            </div>
                                            <div className={`tx-amount ${tx.amount.startsWith('+') ? 'positive' : 'negative'}`}>
                                                {tx.amount}
                                            </div>
                                            <span className={`tx-badge ${tx.status}`}>{tx.status}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="settings-actions">
                                    <button className="settings-export-btn"><Download size={14} /> Export CSV</button>
                                </div>
                            </div>
                        )}

                        {/* ── HELP ── */}
                        {tab === 'help' && (
                            <div className="settings-section">
                                <h3 className="settings-section-title">Help & Support</h3>

                                <div className="help-grid">
                                    {[
                                        { icon: '📖', title: 'Documentation', desc: 'Learn how prediction markets work', link: '#' },
                                        { icon: '💬', title: 'Live Chat', desc: 'Talk to our support team', link: '#' },
                                        { icon: '📧', title: 'Email Support', desc: 'support@orraplay.com', link: '#' },
                                        { icon: '🐦', title: 'Twitter / X', desc: '@OrraPlay', link: '#' },
                                    ].map((item, i) => (
                                        <a key={i} href={item.link} className="help-card" target="_blank" rel="noopener noreferrer">
                                            <span className="help-icon">{item.icon}</span>
                                            <div>
                                                <p className="help-title">{item.title} <ExternalLink size={11} /></p>
                                                <p className="help-desc">{item.desc}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>

                                <div className="settings-divider" />
                                <h4 className="settings-sub-title">FAQ</h4>
                                <div className="faq-list">
                                    {[
                                        'How do prediction markets work?',
                                        'When are winnings paid out?',
                                        'What are the trading fees?',
                                        'How do I verify my identity?',
                                        'Can I withdraw at any time?',
                                    ].map((q, i) => (
                                        <div key={i} className="faq-item">
                                            <span className="faq-q">{q}</span>
                                            <ChevronRight size={14} className="faq-chevron" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
