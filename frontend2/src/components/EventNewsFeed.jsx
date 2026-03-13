import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export default function EventNewsFeed({ query }) {
    const [news, setNews] = useState([]);

    useEffect(() => {
        if (!query) return;

        // Extract key terms for mock headlines
        const words = query.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
        const subject = words.length > 0 ? words[0] : 'Event';
        const context = words.length > 1 ? words[1] : 'Market';

        // Fake news that looks like real headlines based on the event title
        const mockNews = [
            { id: 1, source: 'Reuters', text: `Breaking: New developments regarding ${subject} and ${context}...`, time: '12m ago' },
            { id: 2, source: 'Bloomberg', text: `Analysts weigh in on the latest ${subject} metrics as deadline approaches.`, time: '1h ago' },
            { id: 3, source: 'WSJ', text: `Global markets react to ongoing ${subject} speculation.`, time: '3h ago' },
            { id: 4, source: 'Financial Times', text: `Inside the negotiations: What ${context} means for the future of ${subject}.`, time: '5h ago' }
        ];

        setNews(mockNews);
    }, [query]);

    if (!news.length) return null;

    return (
        <div className="ts-section" style={{ marginTop: '24px' }}>
            <h3 className="ts-header">Latest news <ChevronRight size={16} /></h3>
            <div className="ts-list" style={{ marginTop: '12px' }}>
                {news.map((item) => (
                    <div key={item.id} className="news-item" style={{
                        display: 'flex', flexDirection: 'column', gap: '6px',
                        padding: '12px 0', borderBottom: '1px solid var(--border-primary)',
                        cursor: 'pointer'
                    }}>
                        <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: '700', textTransform: 'uppercase' }}>
                            {item.source} • {item.time}
                        </span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {item.text}
                        </span>
                    </div>
                ))}
            </div>
            <button className="ts-explore-btn" style={{ marginTop: '16px' }}>View all coverage</button>
        </div>
    );
}
