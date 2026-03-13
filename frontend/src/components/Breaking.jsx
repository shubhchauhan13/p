import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketRow from './MarketRow';
import { SkeletonGrid } from './SkeletonCard';
import { ArrowLeft } from 'lucide-react';
import LiveNewsSidebar from './LiveNewsSidebar';

export default function Breaking({ markets, onSelect, loading }) {
    const navigate = useNavigate();
    const breakingMarkets = markets ? markets.slice(0, 15) : [];

    return (
        <div className="breaking-page">
            <div className="breaking-main">
                <div className="breaking-header-row">
                    <button onClick={() => navigate(-1)} className="md-back-btn" style={{ margin: 0 }}>
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div>
                        <h1 className="breaking-title">Breaking</h1>
                        <p className="breaking-subtitle">See the polymarkets that moved the most in the last 24 hours</p>
                    </div>
                </div>

                {loading ? (
                    <SkeletonGrid count={8} />
                ) : breakingMarkets.length > 0 ? (
                    <div className="market-row-list">
                        {breakingMarkets.map((market, i) => (
                            <MarketRow
                                key={market.condition_id}
                                market={market}
                                index={i + 1}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">📰</div>
                        <h3>No breaking news</h3>
                        <p>Check back later for urgent updates.</p>
                    </div>
                )}
            </div>

            <LiveNewsSidebar />
        </div>
    );
}
