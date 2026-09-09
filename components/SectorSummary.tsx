'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectorSummary as SectorSummaryType } from '@/types/portfolio';
import { PortfolioTable } from './PortfolioTable';
import {
  cn,
  gainLossClass,
  formatINR,
  formatPercent,
} from '@/lib/styles';
import { Layers, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export function SectorSection({ summary }: { summary: SectorSummaryType }) {
  const isPositive = summary.totalGainLoss >= 0;

  return (
    <Card className="mb-8 border border-border/80 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/40 bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">
                  {summary.sector}
                </CardTitle>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {summary.holdings.length} {summary.holdings.length === 1 ? 'Holding' : 'Holdings'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aggregated sector metrics and individual asset performances
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-md bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase block text-muted-foreground font-sans">
                Invested
              </span>
              <span className="font-semibold text-foreground">
                {formatINR(summary.totalInvestment)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-md bg-background/80 border border-border/60">
              <span className="text-[10px] uppercase block text-muted-foreground font-sans">
                Present Value
              </span>
              <span className="font-semibold text-foreground">
                {formatINR(summary.totalPresentValue)}
              </span>
            </div>

            <div
              className={cn(
                'px-3 py-1.5 rounded-md border col-span-2 sm:col-span-1',
                isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase block text-muted-foreground font-sans">
                  Gain / Loss
                </span>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div className="font-bold flex items-baseline gap-1.5">
                <span>{formatINR(summary.totalGainLoss)}</span>
                <span className="text-[11px] font-normal">
                  ({formatPercent(summary.totalGainLossPercent)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <PortfolioTable data={summary.holdings} />
      </CardContent>
    </Card>
  );
}
