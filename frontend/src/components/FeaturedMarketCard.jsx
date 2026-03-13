import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import PriceChart from './PriceChart';
import LiveSurveillanceFeed from './LiveSurveillanceFeed';

export default function FeaturedMarketCard({ markets }) {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);

    if (!markets || markets.length === 0) return null;

    const market = markets[activeIndex];
    const yesPrice = market.outcome_prices?.[0] || 0;
    const chance = Math.round(yesPrice * 100);
    const total = Math.min(markets.length, 5);

    const formatVol = (v) => {
        if (!v) return '$0';
        if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
        return `$${v.toFixed(0)}`;
    };

    const goPrev = (e) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev - 1 + total) % total);
    };
    const goNext = (e) => {
        e.stopPropagation();
        setActiveIndex(prev => (prev + 1) % total);
    };

    return (
        <div className="featured-market-card" onClick={() => navigate(`/market/${market.condition_id}`)}>
            {/* Navigation Arrows */}
            {total > 1 && (
                <>
                    <button className="featured-arrow featured-arrow-left" onClick={goPrev}>
                        <ChevronLeft size={20} />
                    </button>
                    <button className="featured-arrow featured-arrow-right" onClick={goNext}>
                        <ChevronRight size={20} />
                    </button>
                </>
            )}

            {/* Main 2-column grid */}
            <div className="featured-inner">
                <div className="featured-left">
                    <div className="featured-top-bar">
                        <div className="featured-top-bar-left">
                            {market.image ? (
                                <img className="featured-img" src={market.image} alt="" />
                            ) : (
                                <div className="featured-img-placeholder">
                                    <ImageIcon size={18} />
                                </div>
                            )}
                            <span className="featured-category">{market.category || 'Trending'}</span>
                            <span className="featured-volume">{formatVol(market.volume)} Vol</span>
                        </div>
                    </div>

                    <h2 className="featured-title">{market.question}</h2>
                    <div className="featured-chance-val">{chance}% chance</div>

                    <div className="featured-buttons">
                        <button className="featured-btn yes" onClick={e => e.stopPropagation()}>
                            <span className="featured-btn-label">Yes</span>
                            <span className="featured-btn-price">{(yesPrice * 100).toFixed(1)}¢</span>
                        </button>
                        <button className="featured-btn no" onClick={e => e.stopPropagation()}>
                            <span className="featured-btn-label">No</span>
                            <span className="featured-btn-price">{((market.outcome_prices?.[1] || 0) * 100).toFixed(1)}¢</span>
                        </button>
                    </div>
                </div>

                <div className="featured-right">
                    {market.clob_token_ids?.[0] ? (
                        <PriceChart tokenId={market.clob_token_ids[0]} height={200} />
                    ) : (
                        <div className="featured-no-chart">Chart data unavailable</div>
                    )}
                </div>
            </div>

            {/* Surveillance feed + dots row */}
            <div className="featured-bottom-row">
                <LiveSurveillanceFeed marketId={market.condition_id} activeChance={chance} />
            </div>

            {/* Carousel Dots */}
            {total > 1 && (
                <div className="featured-dots">
                    {markets.slice(0, total).map((_, idx) => (
                        <button
                            key={idx}
                            className={`f-dot ${idx === activeIndex ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveIndex(idx);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
