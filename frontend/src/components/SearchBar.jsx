import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Flame, Clock, Calendar, ArrowDownUp, X } from 'lucide-react';
import { IconMap } from '../App';

export default function SearchBar({ onSearch, tags, activeTag, onTagChange, sort, onSortChange, pathname }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const handleInput = useCallback((e) => {
        const value = e.target.value;
        setQuery(value);
        onSearch(value);
    }, [onSearch]);

    const handleClear = useCallback(() => {
        setQuery('');
        onSearch('');
        inputRef.current?.focus();
    }, [onSearch]);

    // Main nav tags only — exclude slugs already handled by the hardcoded tabs
    const excludeSlugs = ['trending', '_trending', '_new', 'new', 'breaking'];
    const mainTags = (tags || []).filter(t => t.main && !excludeSlugs.includes(t.slug));

    return (
        <div className="search-section">
            <div className="category-bar">
                <nav className="category-nav">
                    {/* Hardcoded Polymarket Main Tabs */}
                    <button
                        className={`nav-tab ${pathname === '/' && !activeTag ? 'active' : ''}`}
                        onClick={() => { onTagChange(''); navigate('/'); }}
                    >
                        <span className="nav-tab-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></span>
                        Trending
                    </button>
                    <button
                        className={`nav-tab ${pathname === '/breaking' ? 'active' : ''}`}
                        onClick={() => { onTagChange(''); navigate('/breaking'); }}
                    >
                        Breaking
                    </button>
                    <button
                        className={`nav-tab ${activeTag === '_new' ? 'active' : ''}`}
                        onClick={() => { onTagChange('_new'); navigate('/'); }}
                    >
                        New
                    </button>

                    <span className="nav-tab-divider"></span>

                    {/* Dynamic Tags */}
                    {mainTags.map(tag => {
                        const IconComponent = IconMap[tag.icon];
                        return (
                            <button
                                key={tag.slug}
                                className={`nav-tab ${(pathname === '/' || pathname === '/markets') && activeTag === tag.slug ? 'active' : ''}`}
                                onClick={() => {
                                    onTagChange(tag.slug === activeTag ? '' : tag.slug);
                                    if (pathname !== '/' && pathname !== '/markets') navigate('/markets');
                                }}
                            >
                                {IconComponent && <span className="nav-tab-icon"><IconComponent size={14} /></span>}
                                {tag.label}
                                {tag.count > 0 && <span className="nav-tab-count">{tag.count}</span>}
                            </button>
                        );
                    })}
                </nav>
                <div className="sort-fixed">
                    <select className="sort-select" value={sort} onChange={(e) => onSortChange(e.target.value)}>
                        <option value="volume_24hr">Trending</option>
                        <option value="volume">Volume</option>
                        <option value="liquidity">Liquidity</option>
                        <option value="last_updated">Recent</option>
                        <option value="newest">Newest</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
