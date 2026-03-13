import { useState } from 'react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function LoginScreen({ onLogin }) {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [emailOrUser, setEmailOrUser] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const body = mode === 'login'
            ? { email_or_username: emailOrUser.trim(), password }
            : { email: email.trim(), username: username.trim(), password };

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || `${mode} failed`);

            // data contains { token, user }
            onLogin(data.user, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-card">
                <div className="login-logo">
                    Polymarket<span className="logo-dot">.</span>live
                </div>
                <p className="login-subtitle">Prediction Market Trading Platform</p>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => { setMode('login'); setError(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => { setMode('register'); setError(''); }}
                    >
                        Create Account
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {mode === 'login' ? (
                        <input
                            type="text"
                            className="login-input"
                            placeholder="Email or Username"
                            value={emailOrUser}
                            onChange={(e) => setEmailOrUser(e.target.value)}
                            required
                        />
                    ) : (
                        <>
                            <input
                                type="email"
                                className="login-input"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                className="login-input"
                                placeholder="Username (min 3 chars)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                minLength={3}
                                required
                            />
                        </>
                    )}

                    <input
                        type="password"
                        className="login-input"
                        placeholder="Password (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                    />

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? (<><span className="btn-spinner" /> Authenticating...</>) : (mode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>
                {mode === 'register' && (
                    <p className="login-hint">New accounts receive $1,000 to start trading!</p>
                )}
            </div>
        </div>
    );
}
