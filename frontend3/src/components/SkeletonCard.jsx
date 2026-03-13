import { memo } from 'react';

function SkeletonCard() {
    return (
        <div className="market-card skeleton-card">
            <div className="card-header">
                <div className="skeleton-pulse skeleton-image" />
                <div className="card-title-area">
                    <div className="skeleton-pulse skeleton-tag" />
                    <div className="skeleton-pulse skeleton-title" />
                    <div className="skeleton-pulse skeleton-title-short" />
                </div>
            </div>
            <div className="card-probability-row">
                <div className="skeleton-pulse skeleton-percent" />
                <div className="skeleton-pulse skeleton-label" />
            </div>
            <div className="card-bet-buttons">
                <div className="skeleton-pulse skeleton-btn" />
                <div className="skeleton-pulse skeleton-btn" />
            </div>
            <div className="card-footer">
                <div className="skeleton-pulse skeleton-meta" />
                <div className="skeleton-pulse skeleton-meta-sm" />
            </div>
        </div>
    );
}

export default memo(SkeletonCard);

export function SkeletonGrid({ count = 12 }) {
    return (
        <div className="market-grid">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
