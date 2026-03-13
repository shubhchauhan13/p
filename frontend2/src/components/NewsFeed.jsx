import { useEffect, useState } from 'react';
import { Newspaper, BarChart3, CircleDot, Link2, Briefcase, Tv, Globe, DollarSign, Radio, ExternalLink } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

function timeAgo(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

const SOURCE_ICONS = {
    'Axios': Newspaper,
    'Bloomberg': BarChart3,
    'Reuters': CircleDot,
    'The Block': Link2,
    'New York Post': Newspaper,
    'Business Insider': Briefcase,
    'CNBC': Tv,
    'CNN': Tv,
    'BBC': Globe,
    'The New York Times': Newspaper,
    'The Washington Post': Newspaper,
    'Forbes': DollarSign,
    'AP News': Radio,
};

export default function NewsFeed({ slug }) {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        fetch(`${API_BASE}/api/news/${slug}?limit=3`)
            .then(r => r.json())
            .then(d => {
                setArticles(d.articles || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="news-feed-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: '90px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', animation: 'pulse-op 1.5s ease-in-out infinite' }} />
                ))}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                No recent news found for this topic.
            </div>
        );
    }

    return (
        <div className="news-feed-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {articles.map((article, i) => {
                const IconComp = SOURCE_ICONS[article.source] || Newspaper;
                return (
                    <a
                        key={i}
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card"
                        onClick={e => e.stopPropagation()}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <IconComp size={14} color="var(--text-accent)" />
                                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{article.source}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{timeAgo(article.pubDate)}</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {article.title}
                        </div>
                        <ExternalLink size={14} color="var(--text-tertiary)" style={{ position: 'absolute', bottom: '16px', right: '16px', opacity: 0.5 }} />
                    </a>
                );
            })}
        </div>
    );
}
