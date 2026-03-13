export default function StatsBar({ stats }) {
    const formatNumber = (n) => {
        if (!n && n !== 0) return '—';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toLocaleString();
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="stats-bar">
            <div className="stat-card">
                <div className="stat-label">Active Markets</div>
                <div className="stat-value">{formatNumber(stats.total_markets)}</div>
            </div>
            <div className="stat-card">
                <div className="stat-label">Assets Tracked</div>
                <div className="stat-value accent">{formatNumber(stats.total_assets)}</div>
            </div>
            <div className="stat-card">
                <div className="stat-label">WS Shards</div>
                <div className="stat-value">{stats.ws_shards || '—'}</div>
            </div>
            <div className="stat-card">
                <div className="stat-label">Price Updates</div>
                <div className="stat-value">{formatNumber(stats.updates_received)}</div>
            </div>
        </div>
    );
}
