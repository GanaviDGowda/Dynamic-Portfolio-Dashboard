'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import {
  enrichHoldings,
  groupBySector,
  calculatePortfolioSummary,
} from '@/lib/enrichHoldings';
import { SectorSection } from '@/components/SectorSummary';
import { SectorAllocationChart } from '@/components/SectorAllocationChart';
import { DashboardSummary } from '@/components/DashboardSummary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Holding } from '@/types/portfolio';
import holdingsSeed from '@/data/holdings.seed.json';
import {
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react';

const holdings = holdingsSeed as Holding[];

export default function DashboardPage() {
  const { metrics, loading, refreshing, error, lastRefreshTime, refresh } =
    usePortfolioData(holdings);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [isDark, setIsDark] = useState<boolean>(true);

  // Sync dark class on document element
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Enrich holdings with real-time metrics
  const enriched = useMemo(
    () => enrichHoldings(holdings, metrics),
    [metrics]
  );

  // Overall Portfolio Summary
  const portfolioSummary = useMemo(
    () => calculatePortfolioSummary(enriched),
    [enriched]
  );

  // Sector list for filter dropdown
  const allSectors = useMemo(() => {
    const list = Array.from(new Set(holdings.map((h) => h.sector)));
    return ['ALL', ...list];
  }, []);

  // Filtered holdings and grouped sectors
  const filteredHoldings = useMemo(() => {
    return enriched.filter((h) => {
      const matchesSearch =
        h.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.sector.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSector =
        selectedSector === 'ALL' || h.sector === selectedSector;

      return matchesSearch && matchesSector;
    });
  }, [enriched, searchTerm, selectedSector]);

  const sectors = useMemo(
    () => groupBySector(filteredHoldings),
    [filteredHoldings]
  );

  if (loading) {
    return (
      <main className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-border/60 bg-card/50 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Dynamic Portfolio Dashboard
                <Badge variant="secondary" className="text-[10px] font-mono">
                  v1.0
                </Badge>
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Live CMP (Yahoo Finance) &amp; Fundamentals (Google Finance)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Error Alert if any */}
        {error && (
          <Alert variant="destructive" className="border-rose-500/50 bg-rose-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Data Stream Notice</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard KPIs Summary */}
        <DashboardSummary
          summary={portfolioSummary}
          refreshing={refreshing}
          lastRefreshTime={lastRefreshTime}
          onRefresh={refresh}
        />

        {/* Sector Allocation Chart */}
        <SectorAllocationChart sectors={groupBySector(enriched)} />

        {/* Search & Sector Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-md border border-border/80 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by stock name, ticker or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-background/80 rounded-lg border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground shrink-0">
              Sector:
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {allSectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedSector === sec
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sec === 'ALL' ? 'All Sectors' : sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sector Sections List */}
        <div className="space-y-6">
          {sectors.length === 0 ? (
            <div className="text-center py-16 bg-card/40 rounded-xl border border-dashed border-border/80">
              <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No matching holdings found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search query or sector filter.
              </p>
            </div>
          ) : (
            sectors.map((s) => (
              <SectorSection key={s.sector} summary={s} />
            ))
          )}
        </div>

        {/* Footer Note */}
        <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-1">
          <p>
            CMP updates every 15s via Yahoo Finance • Fundamentals (P/E &amp; EPS) update every 30m via Google Finance
          </p>
          <p className="text-[11px]">
            Portfolio dataset populated from <code className="font-mono text-[10px] bg-muted/60 px-1 py-0.5 rounded">data/holdings.seed.json</code> (generated from Excel sheet).
          </p>
        </footer>
      </main>
    </div>
  );
}
