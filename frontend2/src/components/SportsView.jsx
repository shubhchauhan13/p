import { useState } from 'react';
import { Clock, ChevronRight, CircleDollarSign } from 'lucide-react';

const FILTER_TABS = [
    { key: 'all', label: 'Games' },
    { key: 'props', label: 'Props' },
];

export default function SportsView({ markets, onSelect }) {
    const [activeFilter, setActiveFilter] = useState('all');

    const formatVol = (v) => {
        if (!v) return '';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
        return `$${v.toFixed(0)}`;
    };

    // Filter: "Games" = markets with non-Yes/No outcomes (team vs team)
    // "Props" = markets with Yes/No outcomes
    const filtered = activeFilter === 'props'
        ? markets.filter(m => m.outcomes?.[0] === 'Yes')
        : activeFilter === 'all'
            ? markets.filter(m => m.outcomes?.[0] !== 'Yes')
            : markets;

    // Group by event_slug for matchup grouping
    const groupByEvent = (mkts) => {
        const groups = {};
        const order = [];
        for (const m of mkts) {
            const key = m.event_slug || m.condition_id;
            if (!groups[key]) {
                groups[key] = {
                    title: m.event_title || m.question,
                    image: m.image,
                    markets: [],
                    totalVolume: 0,
                    endDate: m.end_date,
                };
                order.push(key);
            }
            groups[key].markets.push(m);
            groups[key].totalVolume += m.volume || 0;
        }
        return order.map(k => ({ key: k, ...groups[k] }));
    };

    const groups = groupByEvent(filtered);

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    // Group events by date
    const groupByDate = (evts) => {
        const dateGroups = {};
        const dateOrder = [];
        for (const evt of evts) {
            const dateKey = evt.endDate ? formatDate(evt.endDate) : 'Other';
            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = [];
                dateOrder.push(dateKey);
            }
            dateGroups[dateKey].push(evt);
        }
        return dateOrder.map(d => ({ date: d, events: dateGroups[d] }));
    };

    const dateGroups = groupByDate(groups);

    return (
        <div className="sports-view">
            <div className="sports-view-header">
                <h1 className="sports-view-title">Sports</h1>
            </div>

            <div className="sports-filter-tabs">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`sports-filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveFilter(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {dateGroups.map(dg => (
                <div key={dg.date} className="sports-date-group">
                    <div className="sports-date-header">
                        <span>{dg.date}</span>
                        <div className="sports-col-headers">
                            <span className="sports-col-label">MONEYLINE</span>
                        </div>
                    </div>

                    {dg.events.map(evt => (
                        <GameRow
                            key={evt.key}
                            event={evt}
                            onSelect={onSelect}
                            formatVol={formatVol}
                            formatTime={formatTime}
                        />
                    ))}
                </div>
            ))}

            {groups.length === 0 && (
                <div className="sports-empty">No games found for this filter.</div>
            )}
        </div>
    );
}

function GameRow({ event, onSelect, formatVol, formatTime }) {
    const market = event.markets[0];
    const outcomes = market.outcomes || [];
    const prices = market.outcome_prices || [];

    return (
        <div className="sports-game-row" onClick={() => onSelect(market)}>
            <div className="sports-game-info">
                <div className="sports-game-time">
                    <Clock size={12} />
                    <span>{formatTime(event.endDate)}</span>
                    <span className="sports-game-vol">{formatVol(event.totalVolume)} Vol.</span>
                </div>
                <span className="sports-game-count">
                    {event.markets.length} <span>Game View</span> <ChevronRight size={12} />
                </span>
            </div>

            <div className="sports-matchup">
                {outcomes.map((team, i) => {
                    const price = prices[i] || 0;
                    const pct = Math.round(price * 100);
                    const isWinning = price > 0.5;

                    return (
                        <div className="sports-team-row" key={team}>
                            <div className="sports-team-info">
                                {market.image && (
                                    <img className="sports-team-logo" src={market.image} alt="" />
                                )}
                                <span className={`sports-team-name ${isWinning ? 'winning' : ''}`}>{team}</span>
                            </div>

                            <button
                                className={`sports-moneyline-btn ${isWinning ? 'favored' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onSelect(market); }}
                            >
                                {team.substring(0, 3).toUpperCase()} {pct}¢
                            </button>

                            <div className="sports-odds-cell">
                                <span className="sports-odds-val">{pct}¢</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
