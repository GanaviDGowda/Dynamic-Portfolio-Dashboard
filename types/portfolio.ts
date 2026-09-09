export type Sector = string; // e.g. "Financial Sector", "Tech Sector"

export interface Holding {
  particulars: string; // Stock Name
  purchasePrice: number;
  qty: number;
  exchange: 'NSE' | 'BSE';
  symbol: string; // ticker e.g. "RELIANCE", "511577"
  sector: Sector;
}

export interface StockMetrics {
  ticker: string; // "NSE:RELIANCE" or "BSE:511577"
  cmp: number | null;
  peRatio: number | null;
  latestEarnings: number | null; // EPS
  status: 'ok' | 'stale' | 'unavailable';
  lastUpdated: string;
}

export interface EnrichedHolding extends Holding {
  investment: number; // purchasePrice * qty
  portfolioPercent: number; // (investment / totalInvestment) * 100
  cmp: number | null;
  presentValue: number | null; // cmp * qty
  gainLoss: number | null; // presentValue - investment
  gainLossPercent: number | null; // ((presentValue - investment) / investment) * 100
  peRatio: number | null;
  latestEarnings: number | null;
  status: 'ok' | 'stale' | 'unavailable';
}

export interface SectorSummary {
  sector: Sector;
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdings: EnrichedHolding[];
}

export interface OverallPortfolioSummary {
  totalInvestment: number;
  totalPresentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalHoldings: number;
  gainersCount: number;
  losersCount: number;
  neutralCount: number;
  lastUpdated: string;
}
