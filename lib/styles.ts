import { cn } from '@/lib/utils';

export { cn };

// Single source of truth for gain/loss coloring across the whole app
export function gainLossClass(value: number | null): string {
  if (value == null) return 'text-muted-foreground';
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
  if (value < 0) return 'text-rose-600 dark:text-rose-400 font-semibold';
  return 'text-muted-foreground font-semibold';
}

// Single source of truth for status badge variants
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
    default:
      return 'secondary';
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
    default:
      return 'Unknown';
  }
}

// Currency and number formatters for Indian Rupee format
export function formatINR(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(val);
}

export function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val == null || isNaN(val)) return '—';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '—';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}
