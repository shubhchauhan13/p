import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketRow from './MarketRow';
import { SkeletonGrid } from './SkeletonCard';
import { ArrowLeft } from 'lucide-react';

export default function Explore({ markets, onSelect, loading }) {
    const navigate = useNavigate();

    return (
        <div className="explore-page">
            <div className="explore-main">
                <div className="breaking-header-row">
                    <button onClick={() => navigate(-1)} className="md-back-btn" style={{ margin: 0 }}>
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div>
                        <h1 className="breaking-title">Explore Popular Polymarkets</h1>
                    </div>
                </div>

                {loading ? (
                    <SkeletonGrid count={12} />
                ) : markets.length > 0 ? (
                    <div className="market-row-list">
                        {markets.map((market, i) => (
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
                        <div className="empty-state-icon">🔍</div>
                        <h3>No markets found</h3>
                        <p>Try adjusting your search terms or browse a different category</p>
                    </div>
                )}
            </div>
        </div>
    );
}
