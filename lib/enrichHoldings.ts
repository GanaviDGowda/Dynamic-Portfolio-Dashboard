import {
  Holding,
  StockMetrics,
  EnrichedHolding,
  SectorSummary,
  OverallPortfolioSummary,
} from '@/types/portfolio';

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
    const cmp = m?.cmp ?? null;
    const presentValue = cmp != null ? cmp * h.qty : null;
    const gainLoss = presentValue != null ? presentValue - investment : null;
    const gainLossPercent =
      gainLoss != null && investment > 0 ? (gainLoss / investment) * 100 : null;

    return {
      ...h,
      investment,
      portfolioPercent: totalInvestment > 0 ? (investment / totalInvestment) * 100 : 0,
      cmp,
      presentValue,
      gainLoss,
      gainLossPercent,
      peRatio: m?.peRatio ?? null,
      latestEarnings: m?.latestEarnings ?? null,
      status: m?.status ?? 'unavailable',
    };
  });
}

export function groupBySector(holdings: EnrichedHolding[]): SectorSummary[] {
  const bySector = new Map<string, EnrichedHolding[]>();

  for (const h of holdings) {
    const sector = h.sector.trim() || 'Other';
    if (!bySector.has(sector)) {
      bySector.set(sector, []);
    }
    bySector.get(sector)!.push(h);
  }

  return Array.from(bySector.entries()).map(([sector, group]) => {
    const totalInvestment = group.reduce((s, h) => s + h.investment, 0);
    const totalPresentValue = group.reduce(
      (s, h) => s + (h.presentValue ?? h.investment),
      0
    );
    const totalGainLoss = totalPresentValue - totalInvestment;
    const totalGainLossPercent =
      totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

    return {
      sector,
      totalInvestment,
      totalPresentValue,
      totalGainLoss,
      totalGainLossPercent,
      holdings: group,
    };
  });
}

export function calculatePortfolioSummary(
  holdings: EnrichedHolding[]
): OverallPortfolioSummary {
  const totalInvestment = holdings.reduce((s, h) => s + h.investment, 0);
  const totalPresentValue = holdings.reduce(
    (s, h) => s + (h.presentValue ?? h.investment),
    0
  );
  const totalGainLoss = totalPresentValue - totalInvestment;
  const totalGainLossPercent =
    totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  let gainersCount = 0;
  let losersCount = 0;
  let neutralCount = 0;

  holdings.forEach((h) => {
    if (h.gainLoss != null) {
      if (h.gainLoss > 0) gainersCount++;
      else if (h.gainLoss < 0) losersCount++;
      else neutralCount++;
    } else {
      neutralCount++;
    }
  });

  return {
    totalInvestment,
    totalPresentValue,
    totalGainLoss,
    totalGainLossPercent,
    totalHoldings: holdings.length,
    gainersCount,
    losersCount,
    neutralCount,
    lastUpdated: new Date().toISOString(),
  };
}
