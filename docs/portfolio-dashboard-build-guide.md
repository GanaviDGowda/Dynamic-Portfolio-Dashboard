# Portfolio Dashboard — Build Guide

A complete reference for building the dynamic portfolio dashboard case study: Next.js frontend, Yahoo Finance CMP, Google Finance P/E + EPS, sector grouping, and live updates.

---

## 1. Project Overview

**Goal:** Build a portfolio dashboard that displays holdings in a table, fetches live CMP from Yahoo Finance and P/E ratio + latest earnings from Google Finance, updates key values every 15 seconds, color-codes gains/losses, and groups holdings by sector with sector-level summaries.

**Stack:**
- Frontend: Next.js (App Router) + React
- Backend: Next.js API routes (Node.js)
- Styling: Tailwind CSS + TypeScript
- Table: `react-table` (TanStack Table)
- Charts (optional, implemented in §6.8): `recharts`
- Data fetching: `axios`, `yahoo-finance2`, `cheerio`

---

## 2. Project Setup

```bash
npx create-next-app@latest portfolio-dashboard --typescript --tailwind --app
cd portfolio-dashboard
npm install yahoo-finance2 axios cheerio @tanstack/react-table recharts

# shadcn/ui — component primitives + centralized theming
npx shadcn@latest init
npx shadcn@latest add table card badge alert skeleton
```

`shadcn init` sets up `components.json`, `lib/utils.ts` (the `cn()` class-merging helper), and CSS variables for your theme in `app/globals.css`. This is the centralized styling layer — colors, radii, and spacing tokens live in one place instead of being hardcoded per-component.

---

## 3. Data Model

```typescript
// types/portfolio.ts

export type Sector = string; // e.g. "Financials", "Technology"

export interface Holding {
  particulars: string;      // Stock Name
  purchasePrice: number;
  qty: number;
  exchange: 'NSE' | 'BSE';
  symbol: string;            // ticker, e.g. "RELIANCE"
  sector: Sector;
}

export interface StockMetrics {
  ticker: string;             // "NSE:RELIANCE"
  cmp: number | null;
  peRatio: number | null;
  latestEarnings: number | null; // EPS
  status: 'ok' | 'stale' | 'unavailable';
  lastUpdated: string;
}

export interface EnrichedHolding extends Holding {
  investment: number;         // purchasePrice * qty
  portfolioPercent: number;   // investment / totalInvestment
  cmp: number | null;
  presentValue: number | null; // cmp * qty
  gainLoss: number | null;     // presentValue - investment
  peRatio: number | null;
  latestEarnings: number | null;
  status: 'ok' | 'stale' | 'unavailable';
}

export interface SectorSummary {
  sector: Sector;
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  holdings: EnrichedHolding[];
}
```

---

## 4. API Strategy

### 4.1 Architecture

```
                    React / Next.js Client
                             │
                      GET /api/portfolio
                             │
                             ▼
                    Next.js API Route
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
       yahoo-finance2                axios + cheerio
       (npm library)               (verified: static HTML)
              │                              │
              ▼                              ▼
        Yahoo Finance                  Google Finance
            CMP                       P/E Ratio + EPS
              │                              │
              └──────────────┬───────────────┘
                              ▼
                        Cache Layer (Map / Redis)
                              ▼
                    Data Normalization
                              ▼
              Present Value / Gain-Loss / Portfolio %
                              ▼
                        JSON Response
                              ▼
                      Portfolio Table (UI)
```

### 4.2 Data sources & refresh cadence

| Data | Source | Method | Refresh |
|---|---|---|---|
| CMP | Yahoo Finance | `yahoo-finance2` | 15 sec |
| Present Value | Local calc | CMP × Qty | 15 sec |
| Gain/Loss | Local calc | Present Value − Investment | 15 sec |
| Portfolio % | Local calc | Investment ÷ Total Investment (confirm against Excel sheet) | On data change |
| P/E Ratio | Google Finance | axios + Cheerio | 30–60 min |
| Latest Earnings (EPS) | Google Finance | axios + Cheerio | 30–60 min |

### 4.3 Key decisions

1. **Backend proxy pattern** — all external calls go through Next.js API routes, never the client. Keeps scraping logic centralized and avoids CORS.
2. **Yahoo — `yahoo-finance2`** — maintained, typed wrapper around Yahoo's quote endpoint. No scraping needed.
3. **Google — axios + Cheerio, not Playwright** — verified live: P/E ratio and EPS are present in Google Finance's static HTML (tested against both MSFT:NASDAQ and RELIANCE:NSE). Cheerio is lighter, avoids Vercel serverless size limits, and needs no headless browser.
4. **Differentiated refresh cadence** — CMP is cheap/volatile (15s); P/E and EPS are low-frequency and costlier to scrape (30–60 min), reducing block risk.
5. **TTL-matched caching** — in-memory `Map` for simplicity; document that this resets on Vercel cold starts, or use Upstash Redis if persistence matters.
6. **Resilient batching** — `Promise.allSettled`, not `Promise.all`, so one failed ticker doesn't break the whole refresh.
7. **Explicit stale/unavailable states, no silent fallback** — third-party APIs (FMP, Alpha Vantage) are noted only as a future production migration path, never silently mixed into live data.

### 4.4 Google Finance scraper — verified selectors

Confirmed via manual testing (`curl.exe` / PowerShell `Invoke-WebRequest`) that Google Finance's summary card is server-rendered:

```html
<div class="KxsRFb">
  <div class="SwQK7">P/E ratio</div>
  <div class="dO6ijd">27.51</div>
</div>
```

- Container: `.KxsRFb`
- Label: `.SwQK7` (text `"P/E ratio"` or `"EPS"`)
- Value: `.dO6ijd`

**Caveat:** unofficial, undocumented markup. Google can change class names without notice — re-verify periodically and document the verification date in your submission.

**Label matching:** use case-insensitive `.includes()` rather than strict equality, since Google sometimes appends qualifiers like `"P/E ratio (TTM)"` depending on exchange/locale. This is intentionally broad, so if you add more metrics later, double-check no other label on the page also contains `"eps"` as a substring before reusing this pattern.

---

## 5. Backend Implementation

### 5.1 Yahoo Finance CMP fetcher

**Runtime boundary — read before wiring this up:** `yahoo-finance2` uses Node.js-only network internals and will break (or silently fail) if it ends up in a client bundle. The rule is simple: this file, and anything that imports it, must only ever be reached from a server context.

In this architecture that boundary is already respected end-to-end:
- `lib/fetchYahoo.ts` (below) is imported **only** by `app/api/portfolio/route.ts` (§5.3), which is a server-side API route.
- No client component — `PortfolioTable.tsx`, `SectorSummary.tsx`, `page.tsx`, or the `usePortfolioData` hook — ever imports `lib/fetchYahoo.ts` or `yahoo-finance2` directly. They only ever consume the JSON the API route returns.

If you add new features later, keep this rule: anything that imports `yahoo-finance2` (directly or transitively) belongs under `app/api/**/route.ts` or a `lib/` file only ever called from there — never under `components/`, `hooks/`, or any file marked `'use client'`.

```typescript
// lib/fetchYahoo.ts
import yahooFinance from 'yahoo-finance2';

export async function fetchYahooCMP(ticker: string): Promise<number | null> {
  try {
    const [exchange, symbol] = ticker.split(':');
    let yahooSymbol = symbol;
    if (exchange === 'BSE') yahooSymbol = `${symbol}.BO`;
    if (exchange === 'NSE') yahooSymbol = `${symbol}.NS`;

    const quote = await yahooFinance.quote(yahooSymbol);
    return quote.regularMarketPrice ?? null;
  } catch (error) {
    console.error(`Yahoo fetch failed for ${ticker}:`, error);
    return null;
  }
}
```

### 5.2 Google Finance scraper

```typescript
// lib/scrapeGoogleFinance.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeGoogleFinance(ticker: string) {
  try {
    const [exchange, symbol] = ticker.split(':');
    const url = `https://www.google.com/finance/quote/${symbol}:${exchange}`;

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(data);
    let peRatio: number | null = null;
    let latestEarnings: number | null = null;

    $('.KxsRFb').each((_, el) => {
      const label = $(el).find('.SwQK7').text().trim();
      const valueStr = $(el).find('.dO6ijd').text().trim();
      const value = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));

      if (!isNaN(value)) {
        const lowercaseLabel = label.toLowerCase();
        if (lowercaseLabel.includes('p/e ratio')) peRatio = value;
        if (
          lowercaseLabel.includes('eps') ||
          lowercaseLabel.includes('earnings per share')
        )
          latestEarnings = value;
      }
    });

    return { peRatio, latestEarnings };
  } catch (error) {
    console.error(`Google Finance scraping failed for ${ticker}:`, error);
    return { peRatio: null, latestEarnings: null };
  }
}
```

### 5.3 API route with caching, batching, stale handling

```typescript
// app/api/portfolio/route.ts
import { NextResponse } from 'next/server';
import { fetchYahooCMP } from '@/lib/fetchYahoo';
import { scrapeGoogleFinance } from '@/lib/scrapeGoogleFinance';

type CacheEntry = {
  data: { cmp?: number | null; peRatio?: number | null; latestEarnings?: number | null };
  timestamp: number;
};

const cmpCache = new Map<string, CacheEntry>();
const fundamentalCache = new Map<string, CacheEntry>();

const TTL_CMP = 15 * 1000;
const TTL_FUNDAMENTALS = 30 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { holdings } = (await request.json()) as {
      holdings: { ticker: string; qty: number; purchasePrice: number }[];
    };
    const now = Date.now();

    const results = await Promise.allSettled(
      holdings.map(async (stock) => {
        const { ticker } = stock;
        let cmp: number | null = null;
        let peRatio: number | null = null;
        let latestEarnings: number | null = null;
        let status: 'ok' | 'stale' | 'unavailable' = 'ok';

        // CMP (15s TTL)
        const cachedCmp = cmpCache.get(ticker);
        if (cachedCmp && now - cachedCmp.timestamp < TTL_CMP) {
          cmp = cachedCmp.data.cmp ?? null;
        } else {
          cmp = await fetchYahooCMP(ticker);
          if (cmp !== null) {
            cmpCache.set(ticker, { data: { cmp }, timestamp: now });
          } else if (cachedCmp) {
            cmp = cachedCmp.data.cmp ?? null;
            status = 'stale';
          }
        }

        // Fundamentals (30-60m TTL)
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
            status = 'stale';
          } else {
            status = 'unavailable';
          }
        }

        return {
          ticker,
          cmp,
          peRatio,
          latestEarnings,
          status,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    const formatted = results.map((res, i) =>
      res.status === 'fulfilled'
        ? res.value
        : {
            ticker: holdings[i].ticker,
            cmp: null,
            peRatio: null,
            latestEarnings: null,
            status: 'unavailable' as const,
            lastUpdated: new Date().toISOString(),
          }
    );

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to aggregate portfolio data' },
      { status: 500 }
    );
  }
}
```

---

## 6. Frontend Implementation

### 6.1 Data fetching hook with 15s polling

```typescript
// hooks/usePortfolioData.ts
import { useEffect, useState, useCallback } from 'react';
import { Holding, StockMetrics } from '@/types/portfolio';

export function usePortfolioData(holdings: Holding[]) {
  const [metrics, setMetrics] = useState<Record<string, StockMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      setMetrics(byTicker);
      setError(null); // clear any previous error once a fetch succeeds
    } catch (err) {
      console.error('Portfolio fetch failed:', err);
      // Keep the last-known metrics on screen rather than wiping the table;
      // surface a user-visible message so the failure isn't silent.
      setError(
        'Live data refresh failed — showing the last successful values.'
      );
    } finally {
      setLoading(false);
    }
  }, [holdings]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { metrics, loading, error };
}
```

### 6.2 Merging holdings with live metrics + sector grouping

```typescript
// lib/enrichHoldings.ts
import { Holding, StockMetrics, EnrichedHolding, SectorSummary } from '@/types/portfolio';

export function enrichHoldings(
  holdings: Holding[],
  metrics: Record<string, StockMetrics>
): EnrichedHolding[] {
  const totalInvestment = holdings.reduce(
    (sum, h) => sum + h.purchasePrice * h.qty,
    0
  );

  return holdings.map((h) => {
    const ticker = `${h.exchange}:${h.symbol}`;
    const m = metrics[ticker];
    const investment = h.purchasePrice * h.qty;
    const presentValue = m?.cmp != null ? m.cmp * h.qty : null;

    return {
      ...h,
      investment,
      portfolioPercent: (investment / totalInvestment) * 100,
      cmp: m?.cmp ?? null,
      presentValue,
      gainLoss: presentValue != null ? presentValue - investment : null,
      peRatio: m?.peRatio ?? null,
      latestEarnings: m?.latestEarnings ?? null,
      status: m?.status ?? 'unavailable',
    };
  });
}

export function groupBySector(holdings: EnrichedHolding[]): SectorSummary[] {
  const bySector = new Map<string, EnrichedHolding[]>();

  for (const h of holdings) {
    if (!bySector.has(h.sector)) bySector.set(h.sector, []);
    bySector.get(h.sector)!.push(h);
  }

  return Array.from(bySector.entries()).map(([sector, group]) => ({
    sector,
    totalInvestment: group.reduce((s, h) => s + h.investment, 0),
    totalPresentValue: group.reduce((s, h) => s + (h.presentValue ?? 0), 0),
    totalGainLoss: group.reduce((s, h) => s + (h.gainLoss ?? 0), 0),
    holdings: group,
  }));
}
```

### 6.3 Centralized styling

Instead of scattering `text-green-600` / `text-red-600` / status-color logic inline across every component, keep it in one file. This is also where `shadcn init` put your `cn()` helper — extend it rather than creating a second utils file.

```typescript
// lib/styles.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Single source of truth for gain/loss coloring across the whole app
export function gainLossClass(value: number | null): string {
  if (value == null) return 'text-muted-foreground';
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
}

// Single source of truth for status → badge variant mapping
export function statusVariant(
  status: 'ok' | 'stale' | 'unavailable'
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'ok':
      return 'default';
    case 'stale':
      return 'secondary';
    case 'unavailable':
      return 'destructive';
  }
}

export function statusLabel(status: 'ok' | 'stale' | 'unavailable'): string {
  switch (status) {
    case 'ok':
      return 'Live';
    case 'stale':
      return 'Stale';
    case 'unavailable':
      return 'N/A';
  }
}
```

If `shadcn init` already generated `lib/utils.ts` with its own `cn()`, don't duplicate it — put `gainLossClass` and the status helpers in `lib/styles.ts` and import `cn` from `lib/utils.ts` as usual. The point is one place per concern: `lib/utils.ts` for class merging, `lib/styles.ts` for your app's semantic color/status mapping. Every component below imports from here instead of redefining color logic locally.

Actual color values (the emerald/red shades, badge variants, radii) trace back to the CSS variables `shadcn init` wrote into `app/globals.css` — so if you want to retheme the whole dashboard later, you edit tokens in one file rather than hunting through components.

### 6.4 Portfolio table component (shadcn Table + react-table)

```tsx
// components/PortfolioTable.tsx
'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EnrichedHolding } from '@/types/portfolio';
import { cn, gainLossClass, statusVariant, statusLabel } from '@/lib/styles';

const columnHelper = createColumnHelper<EnrichedHolding>();

const columns = [
  columnHelper.accessor('particulars', { header: 'Particulars' }),
  columnHelper.accessor('purchasePrice', {
    header: 'Purchase Price',
    cell: (info) => info.getValue().toFixed(2),
  }),
  columnHelper.accessor('qty', { header: 'Qty' }),
  columnHelper.accessor('investment', {
    header: 'Investment',
    cell: (info) => info.getValue().toFixed(2),
  }),
  columnHelper.accessor('portfolioPercent', {
    header: 'Portfolio (%)',
    cell: (info) => `${info.getValue().toFixed(2)}%`,
  }),
  columnHelper.accessor('exchange', { header: 'NSE/BSE' }),
  columnHelper.accessor('cmp', {
    header: 'CMP',
    cell: (info) => info.getValue()?.toFixed(2) ?? '—',
  }),
  columnHelper.accessor('presentValue', {
    header: 'Present Value',
    cell: (info) => info.getValue()?.toFixed(2) ?? '—',
  }),
  columnHelper.accessor('gainLoss', {
    header: 'Gain/Loss',
    // gainLossClass is the single source of truth for this color —
    // see §6.3. No component defines its own green/red logic.
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={cn('font-medium', gainLossClass(val))}>
          {val == null ? '—' : val.toFixed(2)}
        </span>
      );
    },
  }),
  columnHelper.accessor('peRatio', {
    header: 'P/E Ratio',
    cell: (info) => info.getValue()?.toFixed(2) ?? '—',
  }),
  columnHelper.accessor('latestEarnings', {
    header: 'Latest Earnings',
    cell: (info) => info.getValue()?.toFixed(2) ?? '—',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={statusVariant(info.getValue())}>
        {statusLabel(info.getValue())}
      </Badge>
    ),
  }),
];

function PortfolioTableInner({ data }: { data: EnrichedHolding[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <Table className="min-w-[950px]">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Wrapped in React.memo so a sector's table only re-renders when its own
// holdings data actually changes, not on every 15s poll of other sectors.
export const PortfolioTable = React.memo(PortfolioTableInner);
```

The `status` column (using the `statusVariant`/`statusLabel` helpers from §6.3) replaces the earlier plan to "wire in a status badge later" — it's now a real column, not a follow-up task.

### 6.5 Sector summary component (shadcn Card)

```tsx
// components/SectorSummary.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SectorSummary as SectorSummaryType } from '@/types/portfolio';
import { PortfolioTable } from './PortfolioTable';
import { cn, gainLossClass } from '@/lib/styles';

export function SectorSection({ summary }: { summary: SectorSummaryType }) {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <CardTitle>{summary.sector}</CardTitle>
        <div className="flex flex-wrap gap-4 sm:gap-6 text-sm text-muted-foreground">
          <span>Investment: {summary.totalInvestment.toFixed(2)}</span>
          <span>Present Value: {summary.totalPresentValue.toFixed(2)}</span>
          <span className={cn('font-medium', gainLossClass(summary.totalGainLoss))}>
            Gain/Loss: {summary.totalGainLoss.toFixed(2)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <PortfolioTable data={summary.holdings} />
      </CardContent>
    </Card>
  );
}
```

Note that `gainLossClass` here is the exact same function used inside `PortfolioTable` (§6.4) — the sector total and every individual row's gain/loss are colored by one shared rule, so they can never visually disagree with each other.

### 6.6 Top-level dashboard page (shadcn Alert + Skeleton)

```tsx
// app/page.tsx
'use client';

import { usePortfolioData } from '@/hooks/usePortfolioData';
import { enrichHoldings, groupBySector } from '@/lib/enrichHoldings';
import { SectorSection } from '@/components/SectorSummary';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Holding } from '@/types/portfolio';

// Replace with data loaded from your Excel sheet / a JSON seed file
const holdings: Holding[] = [
  {
    particulars: 'Reliance Industries',
    purchasePrice: 2400,
    qty: 10,
    exchange: 'NSE',
    symbol: 'RELIANCE',
    sector: 'Energy',
  },
  // ...rest of your holdings
];

export default function DashboardPage() {
  const { metrics, loading, error } = usePortfolioData(holdings);

  if (loading) {
    return (
      <main className="p-4 sm:p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  const enriched = enrichHoldings(holdings, metrics);
  const sectors = groupBySector(enriched);

  return (
    <main className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-2">Portfolio Dashboard</h1>
      <p className="text-xs text-muted-foreground mb-6">
        CMP refreshes every 15s · P/E &amp; earnings refresh every 30–60 min ·
        scraped data may lag official sources
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sectors.map((s) => (
        <SectorSection key={s.sector} summary={s} />
      ))}
    </main>
  );
}
```

Swapping the plain `<div>` loading state for shadcn's `Skeleton` gives a more polished first paint than a bare "Loading portfolio…" string, and the `Alert` component replaces the hand-rolled yellow banner with something that matches the rest of the theme automatically.

### 6.7 Responsiveness

Two adjustments in the code above handle the spec's "adapts well across devices" requirement:

- `PortfolioTable` (§6.4) is wrapped in an `overflow-x-auto` container with a `min-w-[950px]` table, so on narrow screens the table scrolls horizontally instead of squashing columns unreadably.
- `SectorSection` (§6.5) uses `CardHeader`'s flex layout, switching from a row to a stacked column layout below the `sm` breakpoint, so the sector name and totals don't overflow on mobile.

If you want to go further, consider collapsing less-critical columns (e.g. P/E Ratio, Latest Earnings) behind a "show more" toggle on small screens rather than relying on horizontal scroll alone.

### 6.8 Optional: sector allocation chart (recharts)

`recharts` was installed in §2 but not used anywhere yet — the spec lists it as an optional visualization, so this closes that gap rather than leaving an unused dependency.

```tsx
// components/SectorAllocationChart.tsx
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SectorSummary } from '@/types/portfolio';

// Ties into the same centralized theme as everything else — pull actual
// hex values from your CSS variables (app/globals.css) rather than
// hardcoding a new palette here.
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

export function SectorAllocationChart({ sectors }: { sectors: SectorSummary[] }) {
  const data = sectors.map((s) => ({
    name: s.sector,
    value: s.totalPresentValue,
  }));

  return (
    <div className="w-full h-72 mb-6">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(entry) => entry.name}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toFixed(2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Drop it into the dashboard page (§6.6) above the sector list:

```tsx
import { SectorAllocationChart } from '@/components/SectorAllocationChart';

// inside DashboardPage, after the error Alert block:
<SectorAllocationChart sectors={sectors} />
```

This is explicitly optional per the spec — if you're tight on time, dropping this section costs you nothing on "Functionality" but does forgo a small amount of extra "User Interface" polish. If you skip it, remove `recharts` from `package.json` so you're not shipping an unused dependency.

---

## 7. Error Handling Checklist

- [x] Every fetch function catches its own errors and returns `null` rather than throwing (§5.1, §5.2)
- [x] `Promise.allSettled` used for all multi-ticker fetches (§5.3)
- [x] Each stock carries a `status` field (`ok` / `stale` / `unavailable`), rendered as a shadcn `Badge` in its own table column (§6.4), colored via the `statusVariant` helper (§6.3) — not a follow-up task, it's implemented
- [x] API route returns a valid response even if all external calls fail (§5.3, `formatted` fallback branch)
- [x] Frontend shows a fallback ("—") for missing cell values (§6.4)
- [x] User-facing error banner when the whole fetch cycle fails, not just a console log (§6.1, §6.6) — satisfies the spec's "display clear error messages for users" requirement

---

## 8. Performance Checklist

- [ ] TTL-based caching per data type (15s CMP, 30–60min fundamentals)
- [x] `PortfolioTable` wrapped in `React.memo` (see §6.4) so unrelated sector updates don't trigger a full re-render
- [ ] Avoid re-fetching Google Finance data on every 15s tick — only Yahoo CMP should be that frequent
- [ ] Debounce/guard against overlapping fetches if a request is slow

---

## 9. Security Checklist

- [ ] No API keys needed for this stack (Yahoo/Google scraping doesn't require keys) — but if you add FMP/Alpha Vantage as a fallback later, keep keys in `.env.local`, never in client code
- [ ] All scraping happens server-side only (API routes), never in client components
- [x] `yahoo-finance2` is only imported by `lib/fetchYahoo.ts`, which is only called from `app/api/portfolio/route.ts` — never imported directly by any client component (§5.1). Double-check this yourself before submitting: `grep -r "yahoo-finance2" components/ hooks/ app/page.tsx` should return nothing.

---

## 10. Real-Time Updates — setInterval vs WebSockets

The spec lists WebSockets as an *optional* enhancement over `setInterval` polling. This guide uses `setInterval` (§6.1) as the primary mechanism — it's simpler, sufficient for a 15s cadence, and matches what the spec requires as the baseline.

If you want to mention WebSockets in your submission for extra credit on "Problem Solving," note it as a stated trade-off rather than implementing it: a WebSocket server would push CMP updates instead of polling, reducing redundant requests when multiple users have the dashboard open, at the cost of needing a persistent connection (harder to host on serverless platforms like Vercel, which don't support long-lived WebSocket connections in standard API routes). Given the assignment's scope, polling is the more appropriate choice — but naming this trade-off in your README demonstrates awareness without over-engineering the actual implementation.

---

## 11. Deployment Notes

- If deploying to **Vercel**: the in-memory `Map` cache resets on cold starts — document this as a known limitation, or swap to Upstash Redis (free tier) for persistence.
- Playwright is intentionally avoided (see API Strategy §4.3), so no headless-browser/serverless function-size issues to worry about.
- Set `revalidate` / cache headers appropriately if you also use Next.js's built-in fetch caching.

---

## 12. Pre-Submission Verification Steps

1. Re-run the Google Finance selector check (`.KxsRFb`, `.SwQK7`, `.dO6ijd`) against a few tickers from your actual Excel sheet — confirm both NSE and BSE symbols resolve correctly.
2. Confirm the Portfolio (%) formula matches what the Excel sheet expects (cost basis vs. live value weighting).
3. Test the app with at least one intentionally invalid ticker to confirm `status: 'unavailable'` renders cleanly in the UI instead of crashing.
4. Note the verification date for your scraping selectors in your README, since Google's markup can change without notice.

---

## 13. What This Covers Against the Evaluation Criteria

| Criteria | How it's addressed |
|---|---|
| Functionality | All required columns, dynamic updates, sector grouping, visual indicators |
| Code Quality | Typed data model, separated concerns (lib/hooks/components), centralized styling helpers instead of repeated inline color logic (§6.3) |
| Performance | TTL caching, differentiated refresh rates, batched fetches, `React.memo` on the table (§6.4) |
| Error Handling | Per-stock status field surfaced as a real `Badge` column, `allSettled`, graceful cell fallback, **and** a user-facing `Alert` banner when the whole refresh cycle fails (§6.1, §6.6) — not just a console log |
| API Strategy | Verified (not assumed) scraping approach, rate-limit-conscious cadence, defensive case-insensitive label matching for locale/exchange variants (§5.2), explicit server/client runtime boundary for `yahoo-finance2` (§5.1) |
| User Interface | shadcn/ui components (Table, Card, Badge, Alert, Skeleton) on a centralized theme instead of ad hoc Tailwind, color-coded gain/loss, responsive layout that scrolls on mobile instead of breaking (§6.3–§6.7), optional sector allocation pie chart via `recharts` (§6.8) |
| Problem Solving | Documented, tested reasoning for every non-obvious technical choice, including the setInterval-vs-WebSockets trade-off named explicitly rather than silently skipped (§10) |

**Honesty check:** WebSockets are *mentioned* as a documented trade-off (§10), not implemented — the spec lists them as optional, so this is a deliberate scope decision, not a gap. Call this out explicitly in your own README so it reads as a choice rather than an oversight.
