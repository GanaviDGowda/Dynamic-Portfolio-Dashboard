import axios from 'axios';
import * as cheerio from 'cheerio';

export interface GoogleFinanceData {
  peRatio: number | null;
  latestEarnings: number | null;
  price?: number | null;
}

export async function scrapeGoogleFinance(ticker: string): Promise<GoogleFinanceData> {
  try {
    const [exchange, symbol] = ticker.split(':');
    if (!exchange || !symbol) {
      return { peRatio: null, latestEarnings: null, price: null };
    }

    // Google Finance uses "BOM" for Bombay Stock Exchange (BSE) and "NSE" for National Stock Exchange
    const googleExchange = exchange === 'BSE' ? 'BOM' : 'NSE';
    const url = `https://www.google.com/finance/quote/${symbol}:${googleExchange}`;

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 6000,
    });

    const $ = cheerio.load(data);
    let peRatio: number | null = null;
    let latestEarnings: number | null = null;
    let price: number | null = null;

    // Optional price extraction from Google Finance header
    const priceText = $('.YMlKec.fxKbKc').first().text().replace(/[^0-9.-]/g, '');
    if (priceText) {
      const parsedPrice = parseFloat(priceText);
      if (!isNaN(parsedPrice)) price = parsedPrice;
    }

    // Verified selectors from build guide §4.4
    $('.KxsRFb').each((_, el) => {
      const label = $(el).find('.SwQK7').text().trim().toLowerCase();
      const valueStr = $(el).find('.dO6ijd').text().trim();
      const value = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));

      if (!isNaN(value)) {
        if (label.includes('p/e ratio') || label.includes('pe ratio')) {
          peRatio = value;
        }
        if (
          label.includes('eps') ||
          label.includes('earnings per share') ||
          label.includes('latest earnings')
        ) {
          latestEarnings = value;
        }
      }
    });

    return { peRatio, latestEarnings, price };
  } catch (error) {
    console.error(`Google Finance scraping failed for ${ticker}:`, error);
    return { peRatio: null, latestEarnings: null, price: null };
  }
}
