'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Holding, StockMetrics } from '@/types/portfolio';

export function usePortfolioData(holdings: Holding[]) {
  const [metrics, setMetrics] = useState<Record<string, StockMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current || holdings.length === 0) return;
    isFetchingRef.current = true;

    if (!isInitial) {
      setRefreshing(true);
    }

    const payload = {
      holdings: holdings.map((h) => ({
        ticker: `${h.exchange}:${h.symbol}`,
        qty: h.qty,
        purchasePrice: h.purchasePrice,
      })),
    };

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data: StockMetrics[] = await res.json();
      const byTicker = Object.fromEntries(data.map((d) => [d.ticker, d]));
      setMetrics((prev) => ({ ...prev, ...byTicker }));
      setError(null);
      setLastRefreshTime(new Date());
    } catch (err: any) {
      console.error('Portfolio fetch failed:', err);
      // Keep last known values on screen rather than wiping the dashboard,
      // but surface user-facing notice
      setError(
        'Live market data refresh failed — displaying last known cached values.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [holdings]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 15000); // 15 second polling cadence
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggerManualRefresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  return { metrics, loading, refreshing, error, lastRefreshTime, refresh: triggerManualRefresh };
}
