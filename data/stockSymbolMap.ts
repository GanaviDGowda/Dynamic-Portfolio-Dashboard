export interface StockMapping {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  sector: string;
}

export const STOCK_SYMBOL_MAP: Record<string, StockMapping> = {
  // Financial Sector
  'HDFC Bank': { symbol: 'HDFCBANK', exchange: 'NSE', sector: 'Financial Sector' },
  'Bajaj Finance': { symbol: 'BAJFINANCE', exchange: 'NSE', sector: 'Financial Sector' },
  'ICICI Bank': { symbol: 'ICICIBANK', exchange: 'NSE', sector: 'Financial Sector' },
  'Bajaj Housing': { symbol: 'BAJAJHFL', exchange: 'NSE', sector: 'Financial Sector' },
  'Savani Financials': { symbol: '511577', exchange: 'BSE', sector: 'Financial Sector' },

  // Tech Sector
  'Affle India': { symbol: 'AFFLE', exchange: 'NSE', sector: 'Tech Sector' },
  'LTI Mindtree': { symbol: '540005', exchange: 'BSE', sector: 'Tech Sector' },
  'KPIT Tech': { symbol: 'KPITTECH', exchange: 'NSE', sector: 'Tech Sector' },
  'Tata Tech': { symbol: 'TATATECH', exchange: 'NSE', sector: 'Tech Sector' },
  'BLS E-Services': { symbol: 'BLSE', exchange: 'NSE', sector: 'Tech Sector' },
  'Tanla': { symbol: 'TANLA', exchange: 'NSE', sector: 'Tech Sector' },

  // Consumer Sector
  'Dmart': { symbol: 'DMART', exchange: 'NSE', sector: 'Consumer Sector' },
  'Tata Consumer': { symbol: 'TATACONSUM', exchange: 'NSE', sector: 'Consumer Sector' },
  'Pidilite': { symbol: 'PIDILITIND', exchange: 'NSE', sector: 'Consumer Sector' },

  // Power Sector
  'Tata Power': { symbol: 'TATAPOWER', exchange: 'NSE', sector: 'Power Sector' },
  'KPI Green': { symbol: 'KPIGREEN', exchange: 'NSE', sector: 'Power Sector' },
  'Suzlon': { symbol: 'SUZLON', exchange: 'NSE', sector: 'Power Sector' },
  'Gensol': { symbol: 'GENSOL', exchange: 'NSE', sector: 'Power Sector' },

  // Pipe Sector
  'Hariom Pipes': { symbol: 'HARIOMPIPE', exchange: 'NSE', sector: 'Pipe Sector' },
  'Astral': { symbol: 'ASTRAL', exchange: 'NSE', sector: 'Pipe Sector' },
  'Polycab': { symbol: 'POLYCAB', exchange: 'NSE', sector: 'Pipe Sector' },

  // Others / Chemicals / Diversified
  'Clean Science': { symbol: 'CLEAN', exchange: 'NSE', sector: 'Others' },
  'Deepak Nitrite': { symbol: 'DEEPAKNTR', exchange: 'NSE', sector: 'Others' },
  'Fine Organic': { symbol: 'FINEORG', exchange: 'NSE', sector: 'Others' },
  'Gravita': { symbol: 'GRAVITA', exchange: 'NSE', sector: 'Others' },
  'SBI Life': { symbol: 'SBILIFE', exchange: 'NSE', sector: 'Others' },

  // Legacy / Exited / Sample Tickers
  'Infy': { symbol: 'INFY', exchange: 'NSE', sector: 'Tech Sector' },
  'Happeist Mind': { symbol: 'HAPPSTMND', exchange: 'NSE', sector: 'Tech Sector' },
  'Easemytrip': { symbol: 'EASEMYTRIP', exchange: 'NSE', sector: 'Consumer Sector' },
  'Reliance Industries': { symbol: 'RELIANCE', exchange: 'NSE', sector: 'Energy' },
  'Tata Consultancy Services': { symbol: 'TCS', exchange: 'NSE', sector: 'Technology' },
  'Tata Motors': { symbol: 'TATAMOTORS', exchange: 'NSE', sector: 'Auto' },
  'Sun Pharmaceutical Industries': { symbol: 'SUNPHARMA', exchange: 'NSE', sector: 'Healthcare' },
};
