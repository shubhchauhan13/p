import React from 'react';
import { SkeletonGrid } from './SkeletonCard';
import CryptoView from './CryptoView';
import SportsView from './SportsView';
import FeaturedMarketCard from './FeaturedMarketCard';
import TrendingSidebar from './TrendingSidebar';
import HeroFeed from './HeroFeed';
import MarketCard from './MarketCard';
import CryptoSidebar from './CryptoSidebar';
import SportsSidebar from './SportsSidebar';
import Sidebar from './Sidebar';

export default function Home({
    activeTag,
    subTags,
    activeSubTag,
    handleSubTagChange,
    filteredMarkets,
    search,
    loading,
    trendingMarkets,
    newMarkets,
    handleSelectMarket,
    handleSearch,
    activeLabel
}) {
    return (
        <div className="main-content">
            {activeTag === 'crypto' ? (
                <CryptoSidebar
                    subTags={subTags}
                    activeSubTag={activeSubTag}
                    onSubTagChange={handleSubTagChange}
                    totalCount={filteredMarkets.length}
                />
            ) : activeTag === 'sports' ? (
                <SportsSidebar
                    subTags={subTags}
                    activeSubTag={activeSubTag}
                    onSubTagChange={handleSubTagChange}
                    totalCount={filteredMarkets.length}
                />
            ) : activeTag ? (
                <Sidebar
                    subTags={subTags}
                    activeSubTag={activeSubTag}
                    onSubTagChange={handleSubTagChange}
                    activeTag={activeTag}
                    totalCount={filteredMarkets.length}
                />
            ) : null}

            <div className="content-area">
                {!activeTag && !search && !loading && (
                    <>
                        <div className="top-trending-container">
                            {trendingMarkets.length > 0 && (
                                <FeaturedMarketCard markets={trendingMarkets.slice(0, 5)} onSelect={handleSelectMarket} />
                            )}
                            {trendingMarkets.length > 1 && (
                                <TrendingSidebar markets={trendingMarkets} onSelect={handleSelectMarket} />
                            )}
                        </div>
                        <HeroFeed
                            title="Trending"
                            icon="Flame"
                            markets={trendingMarkets}
                            onSelect={handleSelectMarket}
                        />
                        <HeroFeed
                            title="New Markets"
                            icon="Sparkles"
                            markets={newMarkets}
                            onSelect={handleSelectMarket}
                        />
                    </>
                )}

                {loading ? (
                    <SkeletonGrid count={12} />
                ) : activeTag === 'crypto' ? (
                    <CryptoView markets={filteredMarkets} onSelect={handleSelectMarket} />
                ) : activeTag === 'sports' ? (
                    <SportsView markets={filteredMarkets} onSelect={handleSelectMarket} />
                ) : (
                    <>
                        {search && (
                            <button className="back-to-home-btn" onClick={() => handleSearch('')}>
                                <span style={{ fontSize: '18px' }}>←</span> Back to Home
                            </button>
                        )}
                        <div className="results-count">
                            {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''}
                            {search && ` matching "${search}"`}
                            {activeLabel && ` in ${activeLabel}`}
                        </div>
                        {filteredMarkets.length > 0 ? (
                            <div className="market-grid">
                                {filteredMarkets.map(market => (
                                    <MarketCard
                                        key={market.condition_id}
                                        market={market}
                                        onSelect={handleSelectMarket}
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
                    </>
                )}
            </div>
        </div>
    );
}
