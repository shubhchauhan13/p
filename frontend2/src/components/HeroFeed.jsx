import { useRef } from 'react';
import MarketCard from './MarketCard';
import { IconMap } from '../App';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HeroFeed({ title, icon, markets, onSelect }) {
    const scrollRef = useRef(null);

    const scroll = (offset) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    if (!markets || markets.length === 0) return null;

    const IconComponent = typeof icon === 'string' ? IconMap[icon] : null;

    return (
        <section className="hero-feed">
            <div className="hero-feed-header">
                <span className="live-indicator" />
                {IconComponent && (
                    <span className="hero-feed-icon"><IconComponent size={20} /></span>
                )}
                <h2 className="hero-feed-title">{title}</h2>
                <div className="hero-feed-controls">
                    <button className="scroll-btn prev-btn" onClick={() => scroll(-400)}><ChevronLeft size={16} /></button>
                    <button className="scroll-btn next-btn" onClick={() => scroll(400)}><ChevronRight size={16} /></button>
                </div>
            </div>

            <div className="hero-feed-scroll" ref={scrollRef}>
                {markets.map(market => (
                    <div className="hero-feed-item" key={market.condition_id}>
                        <MarketCard market={market} onSelect={onSelect} />
                    </div>
                ))}
            </div>
        </section>
    );
}
