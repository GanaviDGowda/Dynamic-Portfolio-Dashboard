import { NextResponse } from 'next/server';
import { fetchYahooCMP } from '@/lib/fetchYahoo';
import { scrapeGoogleFinance } from '@/lib/scrapeGoogleFinance';
import { StockMetrics } from '@/types/portfolio';

type CacheEntry = {
  data: {
    cmp?: number | null;
    peRatio?: number | null;
    latestEarnings?: number | null;
  };
  timestamp: number;
};

// In-memory cache layers
const cmpCache = new Map<string, CacheEntry>();
const fundamentalCache = new Map<string, CacheEntry>();

// Cache TTLs
const TTL_CMP = 15 * 1000; // 15 seconds for CMP
const TTL_FUNDAMENTALS = 30 * 60 * 1000; // 30 minutes for P/E & EPS

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const holdings: { ticker: string; qty?: number; purchasePrice?: number }[] =
      body.holdings || [];

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: 'Holdings array is required' },
        { status: 400 }
      );
    }

    const now = Date.now();

    const results = await Promise.allSettled(
      holdings.map(async (stock): Promise<StockMetrics> => {
        const { ticker } = stock;
        let cmp: number | null = null;
        let peRatio: number | null = null;
        let latestEarnings: number | null = null;
        let cmpStatus: 'ok' | 'stale' | 'unavailable' = 'ok';
        let fundStatus: 'ok' | 'stale' | 'unavailable' = 'ok';

        // 1. Fetch / Cache CMP (15s TTL)
        const cachedCmp = cmpCache.get(ticker);
        if (cachedCmp && now - cachedCmp.timestamp < TTL_CMP) {
          cmp = cachedCmp.data.cmp ?? null;
        } else {
          cmp = await fetchYahooCMP(ticker);
          if (cmp !== null) {
            cmpCache.set(ticker, { data: { cmp }, timestamp: now });
          } else if (cachedCmp && cachedCmp.data.cmp != null) {
            cmp = cachedCmp.data.cmp;
            cmpStatus = 'stale';
          } else {
            // Fallback attempt from Google Finance if Yahoo failed
            const gFallback = await scrapeGoogleFinance(ticker);
            if (gFallback.price != null) {
              cmp = gFallback.price;
              cmpCache.set(ticker, { data: { cmp }, timestamp: now });
            } else {
              cmpStatus = 'unavailable';
            }
          }
        }

        // 2. Fetch / Cache Fundamentals (30m TTL)
        const cachedFund = fundamentalCache.get(ticker);
        if (cachedFund && now - cachedFund.timestamp < TTL_FUNDAMENTALS) {
          peRatio = cachedFund.data.peRatio ?? null;
          latestEarnings = cachedFund.data.latestEarnings ?? null;
        } else {
          const funds = await scrapeGoogleFinance(ticker);
          peRatio = funds.peRatio;
          latestEarnings = funds.latestEarnings;

          if (peRatio !== null || latestEarnings !== null) {
            fundamentalCache.set(ticker, {
              data: { peRatio, latestEarnings },
              timestamp: now,
            });
          } else if (cachedFund) {
            peRatio = cachedFund.data.peRatio ?? null;
            latestEarnings = cachedFund.data.latestEarnings ?? null;
            fundStatus = 'stale';
          } else {
            fundStatus = 'unavailable';
          }
        }

        // Determine overall status
        let finalStatus: 'ok' | 'stale' | 'unavailable' = 'ok';
        if (cmpStatus === 'unavailable' && fundStatus === 'unavailable') {
          finalStatus = 'unavailable';
        } else if (cmpStatus === 'stale' || fundStatus === 'stale') {
          finalStatus = 'stale';
        } else if (cmpStatus === 'unavailable' || fundStatus === 'unavailable') {
          finalStatus = cmpStatus === 'ok' ? 'ok' : 'stale';
        }

        return {
          ticker,
          cmp,
          peRatio,
          latestEarnings,
          status: finalStatus,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    const formatted: StockMetrics[] = results.map((res, i) =>
      res.status === 'fulfilled'
        ? res.value
        : {
            ticker: holdings[i].ticker,
            cmp: null,
            peRatio: null,
            latestEarnings: null,
            status: 'unavailable',
            lastUpdated: new Date().toISOString(),
          }
    );

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('API /api/portfolio error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate portfolio data' },
      { status: 500 }
    );
  }
}
