import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function LiveSurveillanceFeed({ marketId, activeChance }) {
    const [trades, setTrades] = useState([]);

    useEffect(() => {
        // Initial set of fake trades
        const initial = Array.from({ length: 4 }).map((_, i) => generateTrade(i, activeChance));
        setTrades(initial);

        // Keep feeding trades simulating a live socket
        const interval = setInterval(() => {
            setTrades(prev => {
                const newTrade = generateTrade(Date.now(), activeChance);
                return [newTrade, ...prev].slice(0, 4);
            });
        }, 1800 + Math.random() * 2500);

        return () => clearInterval(interval);
    }, [marketId, activeChance]);

    const generateTrade = (id, baseChance) => {
        const isYes = Math.random() > 0.5;
        // Float price around the active chance
        const base = baseChance ? (baseChance / 100) : 0.5;
        const drift = (Math.random() * 0.04) - 0.02; // +/- 2%
        let price = Math.max(0.01, Math.min(0.99, base + drift));
        if (!isYes) price = 1 - price;

        const shares = Math.floor(Math.random() * 4800) + 120;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        return {
            id,
            isYes,
            price: (price * 100).toFixed(1) + '¢',
            shares: shares.toLocaleString(),
            time
        };
    };

    return (
        <div className="surveillance-feed">
            <div className="sf-header">
                <Activity size={12} className="sf-icon pulse" />
                <span>LIVE ORDER ACTIVITY</span>
            </div>
            <div className="sf-body">
                {trades.map(t => (
                    <div key={t.id} className="sf-row">
                        <span className="sf-time">{t.time}</span>
                        <span className={`sf-side ${t.isYes ? 'yes' : 'no'}`}>
                            {t.isYes ? 'Buy Yes' : 'Buy No'}
                        </span>
                        <span className="sf-shares">{t.shares} shares</span>
                        <span className="sf-price">{t.price}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
