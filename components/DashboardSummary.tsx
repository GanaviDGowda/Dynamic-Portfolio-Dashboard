'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OverallPortfolioSummary } from '@/types/portfolio';
import {
  cn,
  formatINR,
  formatPercent,
  gainLossClass,
} from '@/lib/styles';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  PieChart,
} from 'lucide-react';

interface DashboardSummaryProps {
  summary: OverallPortfolioSummary;
  refreshing: boolean;
  lastRefreshTime: Date | null;
  onRefresh: () => void;
}

export function DashboardSummary({
  summary,
  refreshing,
  lastRefreshTime,
  onRefresh,
}: DashboardSummaryProps) {
  const isGain = summary.totalGainLoss >= 0;

  return (
    <div className="space-y-4 mb-8">
      {/* Top Header Bar with Live Indicator & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card/60 backdrop-blur-md border border-border/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                refreshing ? 'bg-amber-400' : 'bg-emerald-400'
              )}
            />
            <span
              className={cn(
                'relative inline-flex rounded-full h-3 w-3',
                refreshing ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {refreshing ? 'Refreshing live quotes...' : 'Live Polling Active'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {lastRefreshTime
                ? `Updated: ${lastRefreshTime.toLocaleTimeString()}`
                : 'Connecting to market feeds...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
            Interval: 15s
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')}
            />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Investment */}
        <Card className="border border-border/80 shadow-sm bg-card/70 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Invested
              </span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {formatINR(summary.totalInvestment)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cost basis of {summary.totalHoldings} holdings
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Portfolio Value */}
        <Card className="border border-border/80 shadow-sm bg-card/70 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current Value
              </span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {formatINR(summary.totalPresentValue)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Real-time valuation based on live CMP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Gain / Loss */}
        <Card
          className={cn(
            'border shadow-sm bg-card/70 backdrop-blur-md',
            isGain
              ? 'border-emerald-500/30'
              : 'border-rose-500/30'
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Overall Return (P&amp;L)
              </span>
              <div
                className={cn(
                  'p-2 rounded-lg',
                  isGain
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                )}
              >
                {isGain ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <div
                className={cn(
                  'text-2xl font-bold font-mono tracking-tight',
                  gainLossClass(summary.totalGainLoss)
                )}
              >
                {formatINR(summary.totalGainLoss)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                <span
                  className={cn(
                    'font-semibold',
                    isGain
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {formatPercent(summary.totalGainLossPercent)}
                </span>
                <span className="text-muted-foreground text-[11px] font-sans">
                  overall profit/loss
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Health / Breadth */}
        <Card className="border border-border/80 shadow-sm bg-card/70 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Market Breadth
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-3 text-sm font-semibold font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ▲ {summary.gainersCount} Gainers
                </span>
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  ▼ {summary.losersCount} Losers
                </span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-2 mt-3 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      summary.totalHoldings > 0
                        ? (summary.gainersCount / summary.totalHoldings) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      summary.totalHoldings > 0
                        ? (summary.losersCount / summary.totalHoldings) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
