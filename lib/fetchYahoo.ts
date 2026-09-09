import YahooFinance from 'yahoo-finance2';

// Initialize YahooFinance instance
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function fetchYahooCMP(ticker: string): Promise<number | null> {
  try {
    const [exchange, symbol] = ticker.split(':');
    if (!exchange || !symbol) return null;

    let yahooSymbol = symbol;
    if (exchange === 'BSE') yahooSymbol = `${symbol}.BO`;
    if (exchange === 'NSE') yahooSymbol = `${symbol}.NS`;

    const quote = await yahooFinance.quote(yahooSymbol);
    if (!quote) return null;

    const price = quote.regularMarketPrice ?? quote.currentPrice ?? null;
    return typeof price === 'number' && !isNaN(price) ? price : null;
  } catch (error) {
    console.error(`Yahoo fetch failed for ${ticker}:`, error);
    return null;
  }
}
