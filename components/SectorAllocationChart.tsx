'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SectorSummary } from '@/types/portfolio';
import { formatINR } from '@/lib/styles';
import { PieChart as PieChartIcon } from 'lucide-react';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

interface SectorAllocationChartProps {
  sectors: SectorSummary[];
}

export function SectorAllocationChart({ sectors }: SectorAllocationChartProps) {
  const totalValue = sectors.reduce((sum, s) => sum + s.totalPresentValue, 0);

  const data = sectors.map((s) => ({
    name: s.sector,
    value: Math.max(0, s.totalPresentValue),
    percentage: totalValue > 0 ? (s.totalPresentValue / totalValue) * 100 : 0,
    holdingsCount: s.holdings.length,
    gainLoss: s.totalGainLoss,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-md p-3 rounded-lg shadow-xl border border-border text-xs">
          <p className="font-bold text-foreground mb-1">{item.name}</p>
          <div className="space-y-1 text-muted-foreground font-mono">
            <p>
              Present Value:{' '}
              <span className="font-semibold text-foreground">
                {formatINR(item.value)}
              </span>
            </p>
            <p>
              Allocation:{' '}
              <span className="font-semibold text-foreground">
                {item.percentage.toFixed(2)}%
              </span>
            </p>
            <p>
              Holdings:{' '}
              <span className="font-semibold text-foreground">
                {item.holdingsCount} assets
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mb-8 border border-border/80 shadow-sm bg-card/60 backdrop-blur-md">
      <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">
              Sector Allocation & Exposure
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Visual portfolio breakdown by asset present value
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                label={(entry: any) =>
                  entry.percentage > 5 ? `${entry.name} (${entry.percentage.toFixed(0)}%)` : ''
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs font-medium text-foreground mr-3">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
