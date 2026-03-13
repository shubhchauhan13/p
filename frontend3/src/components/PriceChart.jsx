import { useEffect, useRef, useState, useCallback } from 'react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export default function PriceChart({ tokenId, height = 220 }) {
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const containerRef = useRef(null);
    const [data, setData] = useState(null);
    const [interval, setInterval_] = useState('max');
    const [loading, setLoading] = useState(true);
    const [hover, setHover] = useState(null); // { x, y, price, time, index }

    useEffect(() => {
        if (!tokenId) return;
        setLoading(true);
        fetch(`${API_BASE}/api/prices-history/${tokenId}?interval=${interval}&fidelity=60`)
            .then(r => r.json())
            .then(d => {
                setData(d.history || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [tokenId, interval]);

    // Main chart drawing
    useEffect(() => {
        if (!data || data.length < 2 || !canvasRef.current) return;
        drawChart(canvasRef.current, data, height);
    }, [data, height]);

    // Overlay drawing for crosshair/tooltip
    useEffect(() => {
        if (!overlayRef.current) return;
        drawOverlay(overlayRef.current, data, height, hover);
    }, [hover, data, height]);

    const handleMouseMove = useCallback((e) => {
        if (!data || data.length < 2 || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const idx = Math.round((x / rect.width) * (data.length - 1));
        const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
        const point = data[clampedIdx];
        if (point) {
            setHover({ x, y, price: point.p, time: point.t, index: clampedIdx });
        }
    }, [data]);

    const handleMouseLeave = useCallback(() => {
        setHover(null);
    }, []);

    if (loading) {
        return (
            <div className="chart-placeholder" style={{ height }}>
                <div className="chart-loading-anim">
                    <div className="chart-skeleton-line" />
                    <div className="chart-skeleton-line short" />
                </div>
            </div>
        );
    }

    if (!data || data.length < 2) {
        return <div className="chart-placeholder" style={{ height }}><span className="chart-loading">No price data</span></div>;
    }

    const currentPrice = data[data.length - 1]?.p || 0;
    const startPrice = data[0]?.p || 0;
    const changePercent = startPrice > 0 ? ((currentPrice - startPrice) / startPrice * 100).toFixed(1) : 0;
    const isUp = currentPrice >= startPrice;

    // If hovering, show hovered price instead
    const displayPrice = hover ? hover.price : currentPrice;
    const displayChange = hover
        ? (startPrice > 0 ? ((hover.price - startPrice) / startPrice * 100).toFixed(1) : 0)
        : changePercent;
    const displayIsUp = hover ? hover.price >= startPrice : isUp;

    const formatTime = (t) => {
        if (!t) return '';
        const d = new Date(t * 1000);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="price-chart-container">
            <div className="chart-header-row">
                <span className={`chart-price ${displayIsUp ? 'up' : 'down'}`}>
                    {(displayPrice * 100).toFixed(1)}%
                    <span className="chart-change">{displayIsUp ? '▲' : '▼'} {Math.abs(displayChange)}%</span>
                </span>
                {hover && (
                    <span className="chart-hover-time">{formatTime(hover.time)}</span>
                )}
                <div className="chart-intervals">
                    {['5m', '15m', '1h', '1d', 'all'].map(iv => (
                        <button
                            key={iv}
                            className={`chart-interval-btn ${interval === iv ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setInterval_(iv); }}
                        >
                            {iv.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
            <div
                ref={containerRef}
                className="chart-canvas-wrap"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ position: 'relative', cursor: hover ? 'crosshair' : 'default' }}
            >
                <canvas ref={canvasRef} className="price-chart-canvas" height={height} />
                <canvas ref={overlayRef} className="price-chart-overlay" height={height} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

                {/* Floating tooltip */}
                {hover && (
                    <div
                        className="chart-tooltip"
                        style={{
                            left: `${Math.min(Math.max(hover.x, 60), containerRef.current ? containerRef.current.getBoundingClientRect().width - 60 : hover.x)}px`,
                        }}
                    >
                        <div className="chart-tooltip-price">{(hover.price * 100).toFixed(1)}¢</div>
                        <div className="chart-tooltip-time">{formatTime(hover.time)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function drawChart(canvas, data, height) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const prices = data.map(d => d.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 0.01;

    const padTop = 12;
    const padBot = 12;
    const chartH = height - padTop - padBot;

    const isUp = prices[prices.length - 1] >= prices[0];
    const lineColor = isUp ? '#10b981' : '#ef4444';

    ctx.clearRect(0, 0, width, height);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padTop, 0, height);
    if (isUp) {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
        gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.08)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    // Draw fill area
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * width;
        const y = padTop + chartH - ((prices[i] - minP) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main line with glow
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = lineColor;
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
        const x = (i / (prices.length - 1)) * width;
        const y = padTop + chartH - ((prices[i] - minP) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Pulsing end dot
    const lastX = width;
    const lastY = padTop + chartH - ((prices[prices.length - 1] - minP) / range) * chartH;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(lastX - 1, lastY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(lastX - 1, lastY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
}

function drawOverlay(canvas, data, height, hover) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!hover || !data || data.length < 2) return;

    const prices = data.map(d => d.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 0.01;
    const padTop = 12;
    const padBot = 12;
    const chartH = height - padTop - padBot;

    const idx = hover.index;
    const x = (idx / (prices.length - 1)) * width;
    const y = padTop + chartH - ((prices[idx] - minP) / range) * chartH;

    const isUp = prices[idx] >= prices[0];
    const color = isUp ? '#10b981' : '#ef4444';

    // Vertical crosshair line
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal crosshair line
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Dot at intersection
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(')', ', 0.3)').replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, (_, r, g, b) => `${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}`);
    ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // White border ring
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
