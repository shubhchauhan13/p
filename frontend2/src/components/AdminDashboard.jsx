import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function AdminDashboard({ token, onClose }) {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adjustUser, setAdjustUser] = useState(null); // { id, username, amount }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!statsRes.ok || !usersRes.ok) {
                throw new Error("Failed to load admin data. Are you an admin?");
            }

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();

            setStats(statsData);
            setUsers(usersData.users || []);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdjustBalance = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: adjustUser.id,
                    amount: parseFloat(adjustUser.amount)
                })
            });
            if (!res.ok) throw new Error("Failed to adjust balance");

            // Refresh data
            setAdjustUser(null);
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading && !stats) return (
        <div className="portfolio-overlay" onClick={onClose}>
            <div className="portfolio-panel" onClick={e => e.stopPropagation()}>
                <div className="portfolio-loading">Loading Admin Panel...</div>
            </div>
        </div>
    );

    return (
        <div className="portfolio-overlay" onClick={onClose}>
            <div className="portfolio-panel admin-panel" onClick={e => e.stopPropagation()}>
                <div className="portfolio-header">
                    <h2>Admin Dashboard</h2>
                    <button className="portfolio-x" onClick={onClose}><X size={18} /></button>
                </div>

                {error ? (
                    <div className="betslip-error">{error}</div>
                ) : (
                    <>
                        <div className="portfolio-summary">
                            <div className="summary-card">
                                <span className="summary-label">Users</span>
                                <span className="summary-value">{stats?.total_users}</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-label">Total Balances</span>
                                <span className="summary-value">${stats?.total_balance?.toFixed(2)}</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-label">Open Interest</span>
                                <span className="summary-value">${stats?.total_open_amount?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="portfolio-content">
                            <h3>User Management</h3>
                            <div className="leaderboard-list">
                                {users.map(u => (
                                    <div key={u.id} className="admin-user-row">
                                        <div className="admin-user-info">
                                            <strong>{u.username}</strong>
                                            <span className="admin-user-email">{u.email}</span>
                                            {u.is_admin === 1 && <span className="admin-badge">ADMIN</span>}
                                        </div>
                                        <div className="admin-user-stats">
                                            <span>Bal: ${Number(u?.balance || 0).toFixed(2)}</span>
                                            <button
                                                className="admin-btn"
                                                onClick={() => setAdjustUser({ id: u.id, username: u.username, amount: '' })}
                                            >
                                                +/-
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {adjustUser && (
                            <div className="admin-modal-overlay">
                                <div className="admin-modal-card">
                                    <h3>Adjust Balance: {adjustUser.username}</h3>
                                    <form onSubmit={handleAdjustBalance}>
                                        <input
                                            type="number"
                                            className="login-input"
                                            placeholder="Amount (e.g. 500 or -100)"
                                            step="0.01"
                                            value={adjustUser.amount}
                                            onChange={e => setAdjustUser({ ...adjustUser, amount: e.target.value })}
                                            required
                                            autoFocus
                                        />
                                        <div className="auth-tabs" style={{ marginTop: '15px' }}>
                                            <button type="button" className="auth-tab" onClick={() => setAdjustUser(null)}>Cancel</button>
                                            <button type="submit" className="login-btn" style={{ padding: '8px 16px', margin: 0 }}>Apply</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
