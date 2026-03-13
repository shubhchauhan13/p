import { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { usePolymarket } from './hooks/usePolymarket';
import SearchBar from './components/SearchBar';
import LoginScreen from './components/LoginScreen';
import Portfolio from './components/Portfolio';
import AdminDashboard from './components/AdminDashboard';
import DepositModal from './components/DepositModal';
import MarketDetail from './components/MarketDetail';
import ToastContainer, { showToast } from './components/Toast';
import ProfileMenu from './components/ProfileMenu';
import SettingsPage from './components/SettingsPage';
import Home from './components/Home';
import Breaking from './components/Breaking';
import Explore from './components/Explore';
import { Shield, BarChart3, Bell, Wallet, Search, Flame, Sparkles, Trophy, Bitcoin, TrendingUp, Globe, Monitor, Theater, Earth, Microscope } from 'lucide-react';
import './App.css';

// Map string icon names from API to Lucide components
export const IconMap = {
  Flame, Sparkles, Trophy, Bitcoin, TrendingUp,
  Globe, Monitor, Theater, Earth, Microscope
};

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

function App() {
  const { markets, stats, tags, subTags, connected, loading, updateCount,
    fetchMarkets, fetchSubTags } = usePolymarket();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeSubTag, setActiveSubTag] = useState('');
  const [sort, setSort] = useState('volume_24hr');
  const debounceRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Hero Feeds
  const [trendingMarkets, setTrendingMarkets] = useState([]);
  const [newMarkets, setNewMarkets] = useState([]);

  useEffect(() => {
    if (!activeTag && !search) {
      Promise.all([
        fetch(`${API_BASE}/api/markets?tag=_trending&limit=12`).then(r => r.json()),
        fetch(`${API_BASE}/api/markets?tag=_new&limit=12`).then(r => r.json())
      ]).then(([trendData, newData]) => {
        const filterResolved = (markets) => (markets || []).filter(m => {
          const yesPrice = m.outcome_prices?.[0];
          return yesPrice !== undefined && yesPrice > 0 && yesPrice < 1;
        });

        setTrendingMarkets(filterResolved(trendData.markets));
        setNewMarkets(filterResolved(newData.markets));
      }).catch(err => console.error("Failed fetching feeds:", err));
    }
  }, [activeTag, search]);

  // Auth
  const [token, setToken] = useState(() => localStorage.getItem('pm_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modals only — NO market selection state
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCashier, setShowCashier] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('account');

  const [balanceAnim, setBalanceAnim] = useState('');

  const handleLogin = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('pm_user', JSON.stringify(userData));
    localStorage.setItem('pm_token', authToken);
    showToast(`Welcome back, ${userData.username}!`, 'success');
  }, []);

  const addNotification = useCallback((msg) => {
    setNotifications(prev => [{ id: Date.now(), msg, time: new Date() }, ...prev].slice(0, 20));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pm_user');
    localStorage.removeItem('pm_token');
  }, []);

  const handleBalanceUpdate = useCallback((newBalance) => {
    setUser(prev => {
      const direction = newBalance > (prev?.balance || 0) ? 'up' : 'down';
      setBalanceAnim(`balance-updated balance-${direction}`);
      setTimeout(() => setBalanceAnim(''), 500);
      const updated = { ...prev, balance: newBalance };
      localStorage.setItem('pm_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Refresh user balance periodically
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        const data = await res.json();
        if (data.balance !== user?.balance) {
          handleBalanceUpdate(data.balance);
        }
      } catch { }
    }, 15000);
    return () => clearInterval(interval);
  }, [token, user?.balance, handleBalanceUpdate, handleLogout]);

  // Tag-based fetching
  useEffect(() => {
    const tagToFetch = activeSubTag || activeTag;
    fetchMarkets(search, tagToFetch, sort);
    if (activeTag) {
      fetchSubTags(activeTag);
    } else {
      fetchSubTags('');
    }
  }, [activeTag, activeSubTag, sort]);

  const handleSearch = useCallback((value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const tagToFetch = activeSubTag || activeTag;
      fetchMarkets(value, tagToFetch, sort);
      if (value && location.pathname !== '/markets') {
        navigate('/markets');
      }
    }, 300);
  }, [fetchMarkets, sort, activeTag, activeSubTag]);

  const handleTagChange = useCallback((slug) => {
    setActiveTag(slug);
    setActiveSubTag('');
    setSearch('');
  }, []);

  const handleSubTagChange = useCallback((slug) => {
    setActiveSubTag(prev => prev === slug ? '' : slug);
  }, []);

  const handleSortChange = useCallback((s) => {
    setSort(s);
  }, []);

  const activeTagObj = tags.find(t => t.slug === activeTag);
  const activeLabel = activeTagObj?.label || '';

  console.log("Total Markets:", markets.length, "tag:", activeTag, "filtered length:", search ? "filtered" : markets.length);
  const filteredMarkets = search
    ? markets.filter(m => {
      const q = (m.question || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      const evt = (m.event_title || '').toLowerCase();
      return (q + ' ' + desc + ' ' + evt).includes(search.toLowerCase());
    })
    : markets;

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')}>
            <span className="logo-icon">■</span> Polymarket<span className="logo-dot">.</span>live
          </div>
          {connected ? (
            <div className="premium-live-text">LIVE</div>
          ) : (
            <div className="premium-live-text disconnected" style={{ filter: 'none', background: '#666', color: 'transparent', WebkitBackgroundClip: 'text', animation: 'none' }}>RECON...</div>
          )}
        </div>

        <div className="header-center">
          <div className="header-search">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Search markets..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          {user.is_admin === 1 && (
            <button className="hdr-btn" onClick={() => setShowAdmin(true)}>
              <Shield size={16} />
              <span className="hdr-btn-label">Admin</span>
            </button>
          )}

          <button className="hdr-btn deposit-trigger-btn" onClick={() => setShowCashier(true)}>
            <span className="hdr-btn-label">Deposit</span>
          </button>

          <div className="hdr-balance">
            <Wallet size={16} />
            <span>${Number(user?.balance || 0).toFixed(2)}</span>
          </div>

          <div className="hdr-divider" />

          <button className="hdr-btn" onClick={() => setShowPortfolio(true)}>
            <BarChart3 size={16} />
            <span className="hdr-btn-label">Portfolio</span>
          </button>

          <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button className="hdr-btn-icon-soft" onClick={() => setShowNotifs(!showNotifs)}>
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="notif-badge">{notifications.length}</span>
              )}
            </button>
            {showNotifs && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <strong>Notifications</strong>
                  {notifications.length > 0 && (
                    <button className="notif-clear" onClick={() => { setNotifications([]); setShowNotifs(false); }}>Clear</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div className="notif-item" key={n.id}>{n.msg}</div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="hdr-user" style={{ position: 'relative' }}>
            <button
              className="hdr-avatar-btn"
              onClick={() => { setShowProfileMenu(v => !v); setShowNotifs(false); }}
            >
              <span className="hdr-avatar">{user.username?.[0]?.toUpperCase() || 'U'}</span>
              <span className="hdr-username">{user.username}</span>
            </button>
            {showProfileMenu && (
              <ProfileMenu
                user={user}
                onClose={() => setShowProfileMenu(false)}
                onOpenSettings={(tab) => { setSettingsTab(tab); setShowSettings(true); }}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </header>

      {showSettings && (
        <SettingsPage
          user={user}
          token={token}
          initialTab={settingsTab}
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
        />
      )}

      <SearchBar
        onSearch={handleSearch}
        tags={tags}
        activeTag={activeTag}
        onTagChange={handleTagChange}
        sort={sort}
        onSortChange={handleSortChange}
        pathname={location.pathname}
      />

      <Routes>
        <Route path="/" element={
          <Home
            activeTag={activeTag}
            subTags={subTags}
            activeSubTag={activeSubTag}
            handleSubTagChange={handleSubTagChange}
            filteredMarkets={filteredMarkets}
            search={search}
            loading={loading}
            trendingMarkets={trendingMarkets}
            newMarkets={newMarkets}
            handleSearch={handleSearch}
            activeLabel={activeLabel}
          />
        } />

        <Route path="/breaking" element={
          <Breaking
            markets={trendingMarkets}
            loading={loading}
          />
        } />

        <Route path="/markets" element={
          <Explore
            markets={filteredMarkets}
            loading={loading}
          />
        } />

        <Route path="/market/:id" element={
          <MarketRoute
            user={user}
            token={token}
            onBalanceUpdate={handleBalanceUpdate}
            onNotification={addNotification}
          />
        } />
      </Routes>

      {/* Portfolio Panel */}
      {showPortfolio && (
        <Portfolio
          user={user}
          token={token}
          onClose={() => setShowPortfolio(false)}
        />
      )}

      {/* Admin Panel */}
      {showAdmin && (
        <AdminDashboard
          token={token}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* Deposit Modal */}
      {showCashier && (
        <DepositModal
          user={user}
          onClose={() => setShowCashier(false)}
        />
      )}

      <ToastContainer />
    </div>
  );
}

// Fully self-sufficient route component — uses useParams, fetches its own data
function MarketRoute({ user, token, onBalanceUpdate, onNotification }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMarket(null);

    fetch(`${API_BASE}/api/markets/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && (data.condition_id || data.question)) {
          setMarket(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'var(--text-tertiary)', fontSize: '16px' }}>
        Loading market...
      </div>
    );
  }

  if (!market) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>🔍</div>
        <h3 style={{ color: '#fff' }}>Market not found</h3>
        <button className="md-back-btn" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    );
  }

  return (
    <MarketDetail
      market={market}
      onClose={() => navigate(-1)}
      user={user}
      token={token}
      onBalanceUpdate={onBalanceUpdate}
      onNotification={onNotification}
    />
  );
}

export default App;
