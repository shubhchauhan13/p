import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Generate a simple sparkline SVG from outcome_prices
function Sparkline({ value, trend }) {
    const points = [];
    const width = 80;
    const height = 32;
    const steps = 12;
    let y = height * (1 - (value || 0.5));

    for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * width;
        const noise = Math.sin(i * 1.5 + (value || 0.5) * 10) * 6 + Math.cos(i * 0.8) * 4;
        y = Math.max(4, Math.min(height - 4, height * (1 - (value || 0.5)) + noise));
        points.push(`${x},${y}`);
    }

    const isUp = trend >= 0;
    const color = isUp ? '#10b981' : '#ef4444';

    return (
        <svg width={width} height={height} className="market-row-sparkline">
            <polyline
                points={points.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function MarketRow({ market, index }) {
    const navigate = useNavigate();
    if (!market) return null;

    const yesPrice = market.outcome_prices?.[0];
    const chance = yesPrice !== undefined ? Math.round(yesPrice * 100) : null;
    const change24h = market.price_change_24hr;
    const isUp = change24h >= 0;
    const changeStr = change24h !== undefined && change24h !== null
        ? `${isUp ? '↑' : '↓'} ${Math.abs(Math.round(change24h * 100))}%`
        : null;

    const vol = market.volume_24hr || market.volume;
    const volStr = vol ? (vol >= 1e6 ? `$${(vol / 1e6).toFixed(0)}M` : `$${(vol / 1e3).toFixed(0)}K`) + ' Vol.' : '';
    const liq = market.liquidity;
    const liqStr = liq ? (liq >= 1e6 ? `$${(liq / 1e6).toFixed(0)}M` : `$${(liq / 1e3).toFixed(0)}K`) + ' Liq.' : '';

    return (
        <div className="market-row" onClick={() => navigate(`/market/${market.condition_id}`)}>
            {index != null && <span className="market-row-index">{index}</span>}

            <div className="market-row-icon">
                {market.image ? (
                    <img src={market.image} alt="" />
                ) : (
                    <div className="market-row-icon-placeholder">
                        {market.question?.[0] || '?'}
                    </div>
                )}
            </div>

            <div className="market-row-info">
                <span className="market-row-title">{market.question}</span>
                <span className="market-row-meta">
                    {volStr && <span>{volStr}</span>}
                    {liqStr && <span> · {liqStr}</span>}
                </span>
            </div>

            <div className="market-row-right">
                <div className="market-row-chance">
                    <span className="market-row-pct">{chance !== null ? `${chance}%` : '—'}</span>
                    {changeStr && (
                        <span className={`market-row-change ${isUp ? 'up' : 'down'}`}>{changeStr}</span>
                    )}
                </div>
                <Sparkline value={yesPrice} trend={change24h || 0} />
                <ChevronRight size={16} className="market-row-chevron" />
            </div>
        </div>
    );
}
