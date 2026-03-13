import { useState, useEffect, useRef, memo } from 'react';
import PriceChart from './PriceChart';
import NewsFeed from './NewsFeed';
import { ImageIcon, CircleDollarSign, Droplet } from 'lucide-react';

function MarketCard({ market, onSelect }) {
    const [flash, setFlash] = useState(false);
    const prevPriceRef = useRef(market.outcome_prices?.[0]);

    // Flash on price change
    useEffect(() => {
        const price = market.outcome_prices?.[0];
        if (prevPriceRef.current !== undefined && price !== prevPriceRef.current) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 600);
            return () => clearTimeout(t);
        }
        prevPriceRef.current = price;
    }, [market.outcome_prices]);

    const yesPrice = market.outcome_prices?.[0] || 0;
    const noPrice = market.outcome_prices?.[1] || 0;
    const yesPercent = (yesPrice * 100).toFixed(0);
    const noPercent = (noPrice * 100).toFixed(0);
    const tokenId = market.clob_token_ids?.[0];

    const formatVolume = (v) => {
        if (!v) return '$0';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
    };

    const change = market.one_day_price_change || 0;
    const changeStr = change > 0 ? `+${(change * 100).toFixed(1)}%` : `${(change * 100).toFixed(1)}%`;

    const handleSelect = (e) => {
        e.stopPropagation();
        if (onSelect) onSelect(market);
    };

    return (
        <div
            className={`market-card ${flash ? 'flash' : ''}`}
            onClick={handleSelect}
        >
            <div className="card-top-icon">
                {market.image ? (
                    <img className="card-image-large" src={market.image} alt="" />
                ) : (
                    <div className="card-image-placeholder-large"><ImageIcon size={24} strokeWidth={1.5} /></div>
                )}
            </div>

            <div className="card-body">
                {market.event_title && (
                    <div className="card-category">{market.event_title}</div>
                )}
                <div className="card-question">{market.question}</div>

                <div className="card-probability-row">
                    <div className="card-prob-left">
                        <span className="card-probability">{yesPercent}%</span>
                        <span className="card-probability-label">chance</span>
                    </div>
                    {change !== 0 && (
                        <span className={`price-change ${change > 0 ? 'up' : 'down'}`}>
                            {changeStr}
                        </span>
                    )}
                </div>

                <div className="card-bet-buttons">
                    <button className="bet-btn yes" onClick={handleSelect}>
                        <span className="btn-side">Yes</span>
                        <span className="btn-price">{yesPercent}¢</span>
                    </button>
                    <button className="bet-btn no" onClick={handleSelect}>
                        <span className="btn-side">No</span>
                        <span className="btn-price">{noPercent}¢</span>
                    </button>
                </div>

                <div className="card-footer">
                    <div className="card-meta">
                        <span className="meta-item"><CircleDollarSign size={13} color="rgba(250, 204, 21, 0.8)" /> {formatVolume(market.volume)} Vol</span>
                        <span className="meta-item"><Droplet size={13} color="rgba(56, 189, 248, 0.8)" /> {formatVolume(market.liquidity)} Liq</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(MarketCard);
