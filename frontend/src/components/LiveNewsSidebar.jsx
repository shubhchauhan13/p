import React from 'react';
import { Flame } from 'lucide-react';

export default function LiveNewsSidebar() {
    const newsItems = [
        {
            id: 1,
            tag: "Breaking news",
            time: "Mar 6, 8:39 AM",
            content: "More billionaires are fleeing California, as Sergey Brin buys waterfront mansion in Miami this week.",
            subtext: "59% chance California's billionaire wealth tax makes it to ballot.",
            isHot: true
        },
        {
            id: 2,
            tag: "Breaking news",
            time: "Mar 6, 7:27 AM",
            content: "UFC to announce who will fight on the White House lawn this Saturday.",
            subtext: "",
            isHot: false
        },
        {
            id: 3,
            tag: "Breaking news",
            time: "Mar 6, 6:44 AM",
            content: "Multiple Gulf nations are considering cancelling US investments over the special military operation in Iran.",
            subtext: "",
            isHot: false
        },
        {
            id: 4,
            tag: "Breaking news",
            time: "Mar 6, 5:59 AM",
            content: "US issues license allowing some Russian oil exports to continue past April deadline.",
            subtext: "",
            isHot: false
        },
        {
            id: 5,
            tag: "Breaking news",
            time: "Mar 6, 5:12 AM",
            content: "India confirms hosting the 2026 ICC Champions Trophy amid diplomatic tensions with Pakistan.",
            subtext: "69% chance India wins the 2026 ICC Men's T20 World Cup.",
            isHot: true
        },
        {
            id: 6,
            tag: "Market update",
            time: "Mar 6, 4:30 AM",
            content: "Bitcoin drops below $82K as trade war fears rattle crypto markets. Analysts predict further volatility.",
            subtext: "",
            isHot: false
        },
        {
            id: 7,
            tag: "Breaking news",
            time: "Mar 6, 3:45 AM",
            content: "European Central Bank signals potential rate cut in April meeting amid slowing growth indicators.",
            subtext: "",
            isHot: false
        },
        {
            id: 8,
            tag: "Breaking news",
            time: "Mar 6, 2:58 AM",
            content: "MrBeast's million-dollar puzzle competition enters final 48 hours with no winner yet.",
            subtext: "68% chance it will be solved by March 15.",
            isHot: false
        },
        {
            id: 9,
            tag: "Market update",
            time: "Mar 6, 1:20 AM",
            content: "Arsenal extends Premier League lead to 8 points after dominant 3-0 win over Manchester City.",
            subtext: "82% chance Arsenal wins the English Premier League.",
            isHot: false
        },
        {
            id: 10,
            tag: "Breaking news",
            time: "Mar 5, 11:45 PM",
            content: "Senate committee approves new AI regulation framework bill, heads to full vote next week.",
            subtext: "",
            isHot: false
        }
    ];

    return (
        <div className="live-news-sidebar">
            <div className="lns-header">
                <h3>Live from @Polymarket</h3>
                <a href="https://x.com/Polymarket" target="_blank" rel="noopener noreferrer" className="lns-follow-btn">
                    Follow on X
                </a>
            </div>

            <div className="lns-feed">
                {newsItems.map(item => (
                    <div key={item.id} className="lns-item">
                        <div className="lns-meta">
                            <span className="lns-tag">
                                {item.isHot && <Flame size={12} style={{ marginRight: '4px', color: '#ff3b3b' }} />}
                                {item.tag}
                            </span>
                            <span className="lns-time">{item.time}</span>
                        </div>
                        <p className="lns-content">{item.content}</p>
                        {item.subtext && <p className="lns-subtext">{item.subtext}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
