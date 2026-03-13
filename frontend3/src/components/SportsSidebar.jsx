import { Dribbble, Activity, Swords, Volleyball, Timer, Medal, Layers } from 'lucide-react';

const SPORT_ICONS = {
    'nba': Dribbble,
    'basketball': Dribbble,
    'ncaab': Dribbble,
    'soccer': Activity,
    'nhl': Swords,
    'hockey': Swords,
    'tennis': Volleyball,
    'cricket': Medal,
    'esports': Timer,
    'games': Layers,
};

export default function SportsSidebar({ subTags, activeSubTag, onSubTagChange, totalCount }) {
    const mainSports = ['nba', 'ncaab', 'soccer', 'nhl', 'tennis', 'cricket', 'esports', 'hockey', 'basketball'];
    const sportTags = (subTags || []).filter(t => mainSports.includes(t.slug));
    const otherTags = (subTags || []).filter(t => !mainSports.includes(t.slug));

    return (
        <aside className="sports-sidebar">
            <button
                className={`sports-sidebar-item ${!activeSubTag ? 'active' : ''}`}
                onClick={() => onSubTagChange('')}
            >
                <Layers size={15} />
                <span className="sports-sidebar-label">All Sports</span>
                <span className="sports-sidebar-count">{totalCount}</span>
            </button>

            <div className="sports-sidebar-section-title">LEAGUES</div>
            {sportTags.map(tag => {
                const Icon = SPORT_ICONS[tag.slug] || Activity;
                return (
                    <button
                        key={tag.slug}
                        className={`sports-sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                        onClick={() => onSubTagChange(tag.slug === activeSubTag ? '' : tag.slug)}
                    >
                        <Icon size={15} />
                        <span className="sports-sidebar-label">{tag.label}</span>
                        <span className="sports-sidebar-count">{tag.count}</span>
                    </button>
                );
            })}

            {otherTags.length > 0 && (
                <>
                    <div className="sports-sidebar-section-title">OTHER</div>
                    {otherTags.map(tag => (
                        <button
                            key={tag.slug}
                            className={`sports-sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                            onClick={() => onSubTagChange(tag.slug === activeSubTag ? '' : tag.slug)}
                        >
                            <Activity size={15} />
                            <span className="sports-sidebar-label">{tag.label}</span>
                            <span className="sports-sidebar-count">{tag.count}</span>
                        </button>
                    ))}
                </>
            )}
        </aside>
    );
}
