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
import {
  cn,
  gainLossClass,
  statusVariant,
  statusLabel,
  formatINR,
  formatNumber,
  formatPercent,
} from '@/lib/styles';

const columnHelper = createColumnHelper<EnrichedHolding>();

const columns = [
  columnHelper.accessor('particulars', {
    header: 'Particulars',
    cell: (info) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground tracking-tight">
          {info.getValue()}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {info.row.original.exchange}:{info.row.original.symbol}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor('purchasePrice', {
    header: 'Purchase Price',
    cell: (info) => (
      <span className="font-mono text-xs">
        {formatINR(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('qty', {
    header: 'Qty',
    cell: (info) => (
      <span className="font-mono text-xs font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('investment', {
    header: 'Investment',
    cell: (info) => (
      <span className="font-mono text-xs font-medium">
        {formatINR(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('portfolioPercent', {
    header: 'Portfolio (%)',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue().toFixed(2)}%
      </span>
    ),
  }),
  columnHelper.accessor('exchange', {
    header: 'Exchange',
    cell: (info) => (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('cmp', {
    header: 'CMP',
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="font-mono text-xs font-semibold">
          {val != null ? formatINR(val) : '—'}
        </span>
      );
    },
  }),
  columnHelper.accessor('presentValue', {
    header: 'Present Value',
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="font-mono text-xs font-semibold">
          {val != null ? formatINR(val) : '—'}
        </span>
      );
    },
  }),
  columnHelper.accessor('gainLoss', {
    header: 'Gain / Loss',
    cell: (info) => {
      const val = info.getValue();
      const pct = info.row.original.gainLossPercent;
      return (
        <div className="flex flex-col">
          <span className={cn('font-mono text-xs', gainLossClass(val))}>
            {val != null ? formatINR(val) : '—'}
          </span>
          {pct != null && (
            <span
              className={cn(
                'text-[10px] font-mono',
                pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}
            >
              ({formatPercent(pct)})
            </span>
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor('peRatio', {
    header: 'P/E Ratio',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue() != null ? formatNumber(info.getValue(), 2) : '—'}
      </span>
    ),
  }),
  columnHelper.accessor('latestEarnings', {
    header: 'EPS (Earnings)',
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">
        {info.getValue() != null ? formatNumber(info.getValue(), 2) : '—'}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const st = info.getValue();
      return (
        <Badge
          variant={statusVariant(st)}
          className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5"
        >
          {statusLabel(st)}
        </Badge>
      );
    },
  }),
];

function PortfolioTableInner({ data }: { data: EnrichedHolding[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm shadow-sm">
      <Table className="min-w-[1050px]">
        <TableHeader className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent border-b border-border/80">
              {hg.headers.map((header) => (
                <TableHead key={header.id} className="py-3 px-3 font-semibold text-foreground/80">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, idx) => (
            <TableRow
              key={row.id}
              className={cn(
                'border-b border-border/40 transition-colors hover:bg-muted/30',
                idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-2.5 px-3">
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Memoized table component to prevent unnecessary re-renders across sector polls
export const PortfolioTable = React.memo(PortfolioTableInner);
