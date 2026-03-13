import { useEffect, useRef } from 'react';
import {
    User, Settings, Shield, Bell, Clock, HelpCircle,
    LogOut, ChevronRight, TrendingUp, DollarSign, Percent,
    Star, Award
} from 'lucide-react';

export default function ProfileMenu({ user, onClose, onOpenSettings, onLogout }) {
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    const initial = user?.username?.[0]?.toUpperCase() || 'U';
    const joined = user?.created_at
        ? new Date(user.created_at * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Member';

    const menuItems = [
        { icon: User, label: 'Account Settings', tab: 'account', desc: 'Profile, display name' },
        { icon: Shield, label: 'Security', tab: 'security', desc: 'Password, sessions' },
        { icon: Bell, label: 'Notifications', tab: 'notifications', desc: 'Alerts, preferences' },
        { icon: Clock, label: 'Transaction History', tab: 'history', desc: 'Deposits, withdrawals' },
        { icon: HelpCircle, label: 'Help & Support', tab: 'help', desc: 'FAQ, contact us' },
    ];

    return (
        <div className="profile-menu-overlay">
            <div className="profile-menu" ref={ref}>
                {/* User identity block */}
                <div className="pm-identity">
                    <div className="pm-identity-avatar">{initial}</div>
                    <div className="pm-identity-info">
                        <span className="pm-identity-name">{user?.username || 'User'}</span>
                        <span className="pm-identity-since">Joined {joined}</span>
                    </div>
                    <div className="pm-identity-badge">
                        <Star size={10} /> Pro
                    </div>
                </div>

                {/* Quick stats */}
                <div className="pm-stats-row">
                    <div className="pm-stat">
                        <DollarSign size={13} className="pm-stat-icon green" />
                        <span className="pm-stat-val">${Number(user?.balance || 0).toFixed(0)}</span>
                        <span className="pm-stat-lbl">Balance</span>
                    </div>
                    <div className="pm-stat-divider" />
                    <div className="pm-stat">
                        <TrendingUp size={13} className="pm-stat-icon blue" />
                        <span className="pm-stat-val">{user?.total_bets || 0}</span>
                        <span className="pm-stat-lbl">Trades</span>
                    </div>
                    <div className="pm-stat-divider" />
                    <div className="pm-stat">
                        <Percent size={13} className="pm-stat-icon purple" />
                        <span className="pm-stat-val">{user?.win_rate ? `${user.win_rate.toFixed(0)}%` : '—'}</span>
                        <span className="pm-stat-lbl">Win Rate</span>
                    </div>
                </div>

                {/* Navigation links */}
                <div className="pm-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.tab}
                            className="pm-nav-item"
                            onClick={() => { onOpenSettings(item.tab); onClose(); }}
                        >
                            <div className="pm-nav-icon-wrap">
                                <item.icon size={15} />
                            </div>
                            <div className="pm-nav-text">
                                <span className="pm-nav-label">{item.label}</span>
                                <span className="pm-nav-desc">{item.desc}</span>
                            </div>
                            <ChevronRight size={14} className="pm-nav-chevron" />
                        </button>
                    ))}
                </div>

                {/* Divider + Sign out */}
                <div className="pm-footer">
                    <button className="pm-signout" onClick={() => { onLogout(); onClose(); }}>
                        <LogOut size={14} />
                        Sign Out
                    </button>
                    <span className="pm-version">v2.0.0</span>
                </div>
            </div>
        </div>
    );
}
