import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';
const WS_URL = import.meta.env.PROD
    ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws/prices'
    : 'ws://localhost:8000/ws/prices';

export function usePolymarket() {
    const [markets, setMarkets] = useState([]);
    const [stats, setStats] = useState({});
    const [tags, setTags] = useState([]);
    const [subTags, setSubTags] = useState([]);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updateCount, setUpdateCount] = useState(0);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Fetch markets with optional tag filter
    const fetchMarkets = useCallback(async (search = '', tag = '', sort = 'volume_24hr') => {
        try {
            const params = new URLSearchParams({ search, tag, sort, limit: '2000' });
            const res = await fetch(`${API_BASE}/api/markets?${params}`);
            const data = await res.json();

            // Optional: Filter out severely broken markets, but allow 0/1 (completed) markets
            const activeMarkets = (data.markets || []).filter(m => {
                return m.question && m.condition_id;
            });

            setMarkets(activeMarkets);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch markets:', err);
            setLoading(false);
        }
    }, []);

    // Fetch tags with counts
    const fetchTags = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/tags`);
            const data = await res.json();
            setTags(data || []);
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    }, []);

    // Fetch sub-tags for a category
    const fetchSubTags = useCallback(async (tagSlug) => {
        if (!tagSlug) {
            setSubTags([]);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/api/tags/${tagSlug}/sub`);
            const data = await res.json();
            setSubTags(data || []);
        } catch (err) {
            console.error('Failed to fetch sub-tags:', err);
        }
    }, []);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/stats`);
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    // WebSocket connection
    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const update = JSON.parse(event.data);
                if (update.type === 'price_update') {
                    setUpdateCount(c => c + 1);
                    setMarkets(prev => {
                        const updated = prev.map(m => {
                            if (m.condition_id === update.condition_id) {
                                return {
                                    ...m,
                                    outcome_prices: update.prices,
                                    best_bid: update.best_bid,
                                    best_ask: update.best_ask,
                                    last_trade_price: update.last_trade_price,
                                    spread: update.spread,
                                    last_updated: update.timestamp,
                                    _flash: Date.now(),
                                };
                            }
                            return m;
                        });

                        // Only drop markets entirely if they lack ID/question
                        return updated.filter(m => m.question && m.condition_id);
                    });
                }
            } catch (err) {
                // ignore
            }
        };

        ws.onclose = () => {
            setConnected(false);
            reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, []);

    // Bootstrap on mount
    useEffect(() => {
        fetchMarkets();
        fetchStats();
        fetchTags();
        connectWs();

        const statsInterval = setInterval(fetchStats, 10000);

        return () => {
            clearInterval(statsInterval);
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [fetchMarkets, fetchStats, fetchTags, connectWs]);

    return {
        markets,
        stats,
        tags,
        subTags,
        connected,
        loading,
        updateCount,
        fetchMarkets,
        fetchTags,
        fetchSubTags,
    };
}
