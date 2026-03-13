export default function Sidebar({ subTags, activeSubTag, onSubTagChange, activeTag, totalCount }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="sidebar-title">Filters</span>
            </div>

            <div className="sidebar-section">
                <button
                    className={`sidebar-item ${!activeSubTag ? 'active' : ''}`}
                    onClick={() => onSubTagChange('')}
                >
                    <span className="sidebar-label">All</span>
                    <span className="sidebar-count">{totalCount}</span>
                </button>

                {subTags.map(tag => (
                    <button
                        key={tag.slug}
                        className={`sidebar-item ${activeSubTag === tag.slug ? 'active' : ''}`}
                        onClick={() => onSubTagChange(tag.slug)}
                    >
                        <span className="sidebar-label">{tag.label}</span>
                        <span className="sidebar-count">{tag.count}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
