import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TrendingSidebar({ markets }) {
    const navigate = useNavigate();
    if (!markets || markets.length < 2) return null;

    const breakingMarkets = markets.slice(1, 4);

    // Derive hot topics dynamically from trending market event titles
    const topicMap = new Map();
    markets.forEach(m => {
        const topic = m.event_title || '';
        if (!topic || topic.length > 50) return;
        if (!topicMap.has(topic)) {
            const vol = m.volume || 0;
            const volStr = vol >= 1_000_000 ? `$${(vol / 1_000_000).toFixed(0)}M`
                : vol >= 1_000 ? `$${(vol / 1_000).toFixed(0)}K`
                    : `$${vol}`;
            topicMap.set(topic, { name: topic, vol: volStr, conditionId: m.condition_id });
        }
    });
    const hotTopics = Array.from(topicMap.values()).slice(0, 5);

    return (
        <div className="trending-sidebar">
            <div className="ts-section">
                <h3 className="ts-header" style={{ cursor: 'pointer' }} onClick={() => navigate('/breaking')}>Breaking news <ChevronRight size={16} /></h3>
                <div className="ts-list">
                    {breakingMarkets.map((m, i) => {
                        const chance = Math.round((m.outcome_prices?.[0] || 0) * 100);
                        const change = (m.one_day_price_change || 0) * 100;
                        return (
                            <div key={m.condition_id} className="ts-market-row" onClick={() => navigate(`/market/${m.condition_id}`)}>
                                <span className="ts-num">{i + 1}</span>
                                <span className="ts-title">{m.question}</span>
                                <div className="ts-chance-col">
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{chance}%</span>
                                    {change !== 0 && (
                                        <span className={`ts-change ${change > 0 ? 'up' : 'down'}`}>
                                            {change > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(change).toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="ts-section">
                <h3 className="ts-header" style={{ cursor: 'pointer' }} onClick={() => navigate('/markets')}>Hot topics <ChevronRight size={16} /></h3>
                <div className="ts-list">
                    {hotTopics.map((t, i) => (
                        <div key={t.name} className="ts-topic-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/market/${t.conditionId}`)}>
                            <span className="ts-num">{i + 1}</span>
                            <span className="ts-topic-name">{t.name}</span>
                            <div className="ts-topic-right">
                                <span className="ts-topic-vol">{t.vol} today</span>
                                <span className="ts-fire">🔥</span>
                                <ChevronRight size={14} className="ts-chevron" />
                            </div>
                        </div>
                    ))}
                </div>
                <button className="ts-explore-btn" onClick={() => navigate('/markets')}>Explore all</button>
            </div>
        </div>
    );
}
