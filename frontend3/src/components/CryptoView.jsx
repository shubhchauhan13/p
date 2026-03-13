import { useState } from 'react';
import { CircleDollarSign, Bookmark, TrendingUp, TrendingDown } from 'lucide-react';

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'up-or-down', label: 'Up / Down' },
    { key: 'crypto-prices', label: 'Price Range' },
    { key: 'multi-strikes', label: 'Hit Price' },
];

export default function CryptoView({ markets, onSelect }) {
    const [activeFilter, setActiveFilter] = useState('all');

    const formatVol = (v) => {
        if (!v) return '';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M Vol.`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K Vol.`;
        return `$${v.toFixed(0)} Vol.`;
    };

    // Filter markets based on the active sub-filter tab
    const filtered = activeFilter === 'all'
        ? markets
        : markets.filter(m => (m.tags || []).some(t => t.slug === activeFilter));

    // Group markets by event_slug so multi-strike markets are shown together
    const groupByEvent = (mkts) => {
        const groups = {};
        const order = [];
        for (const m of mkts) {
            const key = m.event_slug || m.condition_id;
            if (!groups[key]) {
                groups[key] = { title: m.event_title || m.question, image: m.image, markets: [], volume: 0 };
                order.push(key);
            }
            groups[key].markets.push(m);
            groups[key].volume += m.volume || 0;
        }
        return order.map(k => ({ key: k, ...groups[k] }));
    };

    const groups = groupByEvent(filtered);

    return (
        <div className="crypto-view">
            <div className="crypto-view-header">
                <h1 className="crypto-view-title">Crypto</h1>
            </div>

            <div className="crypto-filter-tabs">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`crypto-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveFilter(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="crypto-card-grid">
                {groups.map(group => (
                    <CryptoCard
                        key={group.key}
                        group={group}
                        onSelect={onSelect}
                        formatVol={formatVol}
                    />
                ))}
            </div>
        </div>
    );
}

function CryptoCard({ group, onSelect, formatVol }) {
    const { title, image, markets, volume } = group;
    const isLive = markets.some(m => m.active && !m.closed);

    // Show up to 2 price strike rows
    const displayMarkets = markets.slice(0, 2);

    // Check if it's an "Up or Down" style (non Yes/No outcomes)
    const isUpDown = markets.length === 1 && markets[0].outcomes &&
        !['Yes', 'No'].includes(markets[0].outcomes[0]);

    return (
        <div className="crypto-card" onClick={() => onSelect(markets[0])}>
            <div className="crypto-card-header">
                {image && <img className="crypto-card-icon" src={image} alt="" />}
                <span className="crypto-card-title">{title}</span>
            </div>

            {isUpDown ? (
                <div className="crypto-card-updown">
                    {markets[0].outcomes.map((outcome, i) => {
                        const price = markets[0].outcome_prices?.[i] || 0;
                        const pct = Math.round(price * 100);
                        return (
                            <button
                                key={outcome}
                                className={`crypto-updown-btn ${outcome.toLowerCase() === 'up' ? 'up' : 'down'}`}
                                onClick={(e) => { e.stopPropagation(); onSelect(markets[0]); }}
                            >
                                {outcome.toLowerCase() === 'up'
                                    ? <TrendingUp size={14} />
                                    : <TrendingDown size={14} />
                                }
                                {outcome}
                            </button>
                        );
                    })}
                    {markets[0].outcome_prices?.[0] > 0 && (
                        <div className="crypto-updown-pct">
                            {Math.round((markets[0].outcome_prices[0]) * 100)}%
                            <span className="crypto-updown-label">
                                {markets[0].outcomes[0]}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="crypto-card-strikes">
                    {displayMarkets.map(m => {
                        const yesPrice = m.outcome_prices?.[0] || 0;
                        const noPrice = m.outcome_prices?.[1] || 0;
                        const yesPct = Math.round(yesPrice * 100);
                        const noPct = Math.round(noPrice * 100);

                        // Extract numeric strike from question
                        const strikeMatch = m.question.match(/\$?([\d,]+\.?\d*)/);
                        const strike = strikeMatch ? strikeMatch[1].replace(/,/g, '') : m.question;
                        const formattedStrike = Number(strike) >= 1000
                            ? Number(strike).toLocaleString()
                            : strike;

                        return (
                            <div className="crypto-strike-row" key={m.condition_id}>
                                <span className="crypto-strike-price">{formattedStrike}</span>
                                <span className="crypto-strike-pct">{yesPct > 0 ? `${yesPct}%` : '<1%'}</span>
                                <button
                                    className="crypto-yn-btn yes"
                                    onClick={(e) => { e.stopPropagation(); onSelect(m); }}
                                >Yes</button>
                                <button
                                    className="crypto-yn-btn no"
                                    onClick={(e) => { e.stopPropagation(); onSelect(m); }}
                                >No</button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="crypto-card-footer">
                {isLive && (
                    <span className="crypto-live-badge">
                        <span className="crypto-live-dot" />
                        LIVE
                    </span>
                )}
                {volume > 0 && <span className="crypto-card-vol">{formatVol(volume)}</span>}
                <Bookmark size={14} className="crypto-card-bookmark" />
            </div>
        </div>
    );
}
