import * as XLSX from 'xlsx';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { STOCK_SYMBOL_MAP } from '../data/stockSymbolMap';

const HoldingSchema = z.object({
  particulars: z.string().min(1),
  purchasePrice: z.number().positive(),
  qty: z.number().int().positive(),
  exchange: z.enum(['NSE', 'BSE']),
  symbol: z.string().min(1),
  sector: z.string().min(1),
});

export type Holding = z.infer<typeof HoldingSchema>;

function run() {
  const dataDir = path.resolve('data');
  const excelFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  
  if (excelFiles.length === 0) {
    throw new Error('No Excel file found in data directory.');
  }

  const filePath = path.join(dataDir, excelFiles[0]);
  console.log(`Reading source Excel file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let currentSector = 'General';
  const holdings: Holding[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const col0 = row[0]; // No. / null / undefined
    const col1 = row[1]; // Particulars (Stock Name or Sector Header)
    const col2 = row[2]; // Purchase Price
    const col3 = row[3]; // Qty

    // Detect Sector Headers (e.g. "Financial Sector", "Tech Sector", "Consumer", "Power", "Pipe Sector", "Others")
    if (
      (col0 === null || col0 === undefined || col0 === '') &&
      typeof col1 === 'string' &&
      col1.trim().length > 0 &&
      !col1.toLowerCase().includes('total') &&
      !col1.toLowerCase().includes('core fundamentals')
    ) {
      currentSector = col1.trim();
      continue;
    }

    // Stop before summary/sold blocks if grand total is reached
    if (col1 === null || col1 === undefined || typeof col1 !== 'string') continue;
    if (col1.toLowerCase().includes('total') || col1.toLowerCase().includes('sold')) {
      if (col1.toLowerCase().includes('total')) {
        break; // Stop at grand total row
      }
      continue;
    }

    // Identify stock data rows (has numerical sequence/No or valid numbers for price and qty)
    const hasValidNo = typeof col0 === 'number' || (typeof col0 === 'string' && !isNaN(Number(col0)) && col0.trim() !== '');
    const hasValidPrice = typeof col2 === 'number' && col2 > 0;
    const hasValidQty = typeof col3 === 'number' && col3 > 0;

    if (hasValidNo && hasValidPrice && hasValidQty) {
      const stockName = col1.trim();
      const mapping = STOCK_SYMBOL_MAP[stockName];

      if (!mapping) {
        throw new Error(
          `Row ${i + 1}: No symbol/sector mapping for "${stockName}". Add it to data/stockSymbolMap.ts before re-running.`
        );
      }

      const holding = {
        particulars: stockName,
        purchasePrice: col2,
        qty: Math.round(col3),
        exchange: mapping.exchange,
        symbol: mapping.symbol,
        sector: (mapping.sector || currentSector).trim(),
      };

      // Zod validation check
      const validated = HoldingSchema.parse(holding);
      holdings.push(validated);
    }
  }

  const outputPath = path.resolve('data/holdings.seed.json');
  fs.writeFileSync(outputPath, JSON.stringify(holdings, null, 2), 'utf-8');

  console.log(`Successfully converted ${holdings.length} holdings from Excel.`);
  console.log(`Output saved to: ${outputPath}`);

  // Summary by sector
  const sectorCount: Record<string, number> = {};
  holdings.forEach(h => {
    sectorCount[h.sector] = (sectorCount[h.sector] || 0) + 1;
  });
  console.log('\nSector Distribution:', sectorCount);
  console.log('Total Portfolio Investment:', holdings.reduce((sum, h) => sum + h.purchasePrice * h.qty, 0));
}

run();
