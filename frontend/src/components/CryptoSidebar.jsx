import { useState, useEffect } from 'react';
import { Bitcoin, CircleDot, Hexagon, Coins, Clock, CalendarDays, CalendarRange, Calendar, Timer, Layers } from 'lucide-react';

const COIN_ICONS = {
    'bitcoin': Bitcoin,
    'ethereum': Hexagon,
    'solana': CircleDot,
    'xrp': Coins,
};

const TIMEFRAME_ICONS = {
    '5m': Timer,
    '15m': Timer,
    'hourly': Clock,
    '4-hour': Clock,
    'daily': CalendarDays,
    'weekly': CalendarRange,
    'monthly': Calendar,
    'yearly': Calendar,
};

export default function CryptoSidebar({ subTags, activeSubTag, onSubTagChange, totalCount }) {
    // Separate coin tags from timeframe tags
    const coinSlugs = ['bitcoin', 'ethereum', 'solana', 'xrp', 'dogecoin', 'cardano', 'bnb', 'avalanche', 'polkadot', 'chainlink'];
    const timeframeSlugs = ['5m', '15m', 'hourly', '4-hour', 'daily', 'weekly', 'monthly', 'yearly', 'pre-market', 'etf'];

    const coins = (subTags || []).filter(t => coinSlugs.includes(t.slug));
    const timeframes = (subTags || []).filter(t => timeframeSlugs.includes(t.slug));
    const other = (subTags || []).filter(t => !coinSlugs.includes(t.slug) && !timeframeSlugs.includes(t.slug));

    return (
        <aside className="crypto-sidebar">
            <button
                className={`crypto-sidebar-item ${!activeSubTag ? 'active' : ''}`}
                onClick={() => onSubTagChange('')}
            >
                <Layers size={15} />
                <span className="crypto-sidebar-label">All</span>
                <span className="crypto-sidebar-count">{totalCount}</span>
            </button>

            {timeframes.length > 0 && (
                <>
                    <div className="crypto-sidebar-section-title">TIMEFRAME</div>
                    {timeframes.map(tag => {
                        const Icon = TIMEFRAME_ICONS[tag.slug] || Clock;
                        return (
                            <button
                                key={tag.slug}
                                className={`crypto-sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                                onClick={() => onSubTagChange(tag.slug === activeSubTag ? '' : tag.slug)}
                            >
                                <Icon size={15} />
                                <span className="crypto-sidebar-label">{tag.label}</span>
                                <span className="crypto-sidebar-count">{tag.count}</span>
                            </button>
                        );
                    })}
                </>
            )}

            {coins.length > 0 && (
                <>
                    <div className="crypto-sidebar-section-title">COINS</div>
                    {coins.map(tag => {
                        const Icon = COIN_ICONS[tag.slug] || Coins;
                        return (
                            <button
                                key={tag.slug}
                                className={`crypto-sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                                onClick={() => onSubTagChange(tag.slug === activeSubTag ? '' : tag.slug)}
                            >
                                <Icon size={15} />
                                <span className="crypto-sidebar-label">{tag.label}</span>
                                <span className="crypto-sidebar-count">{tag.count}</span>
                            </button>
                        );
                    })}
                </>
            )}

            {other.length > 0 && (
                <>
                    <div className="crypto-sidebar-section-title">OTHER</div>
                    {other.map(tag => (
                        <button
                            key={tag.slug}
                            className={`crypto-sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                            onClick={() => onSubTagChange(tag.slug === activeSubTag ? '' : tag.slug)}
                        >
                            <Coins size={15} />
                            <span className="crypto-sidebar-label">{tag.label}</span>
                            <span className="crypto-sidebar-count">{tag.count}</span>
                        </button>
                    ))}
                </>
            )}
        </aside>
    );
}
