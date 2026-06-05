/**
 * StockStuck Semantic Asset Routing & Categorization Engine
 * Automatically classifies assets to dedicated semantic English URL paths:
 * - Funds & ETFs -> /fund/:symbol
 * - Commodities & Precious Metals -> /commodity/:symbol
 * - Forex & Currencies -> /forex/:symbol
 * - Crypto Assets -> /crypto/:symbol
 * - Market Indices -> /index/:symbol
 * - Equities / Stocks -> /stock/:symbol
 */

export type AssetTypeCategory = 'fund' | 'commodity' | 'forex' | 'crypto' | 'index' | 'stock';

const KNOWN_COMMODITIES = new Set([
  'GRAM_ALTIN', 'GRAM_GUMUS', 'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'HG=F', 'PL=F',
  'GLD', 'IAU', 'SLV', 'GDX', 'USO', 'UNG', 'DBA'
]);

const KNOWN_INDICES = new Set([
  'XU100', 'XU030', 'XUTUM', 'XBANK', 'XUSIN',
  '^GSPC', '^IXIC', '^DJI', '^RUT', '^FTSE', '^GDAXI', '^N225'
]);

const KNOWN_ETFS = new Set([
  'SPY', 'QQQ', 'VOO', 'VTI', 'IVV', 'DIA', 'IWM', 'VT', 'SCHD', 'JEPI', 'JEPQ',
  'VEA', 'VWO', 'EEM', 'TQQQ', 'SQQQ', 'SOXL', 'SOXS', 'NVDL', 'TSLL', 'SMH',
  'SOXX', 'XLK', 'VGT', 'XLF', 'XLE', 'XLV', 'XLI', 'XLU', 'ARKK', 'BOTZ',
  'AIQ', 'KWEB', 'URNM', 'VNQ', 'IBIT', 'FBTC', 'ARKB', 'BITO', 'ETHA', 'TLT',
  'BND', 'HYG', 'GLDTR', 'USDTR', 'ZPX10'
]);

const KNOWN_US_STOCKS = new Set([
  'AAPL', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AMD', 'INTC', 'NFLX',
  'QCOM', 'AVGO', 'CSCO', 'ADBE', 'CRM', 'TXN', 'PYPL', 'INTU', 'AMAT', 'MU',
  'ARM', 'PANW', 'SNPS', 'CDNS', 'CRWD', 'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS',
  'BLK', 'AXP', 'V', 'MA', 'PFE', 'JNJ', 'UNH', 'ABBV', 'MRK', 'LLY', 'TMO',
  'DHR', 'BMY', 'AMGN', 'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'CAT', 'GE',
  'HON', 'UNP', 'BA', 'LMT', 'RTX', 'DE', 'PG', 'KO', 'PEP', 'COST', 'WMT',
  'MCD', 'NKE', 'SBUX', 'DIS', 'ORCL', 'IBM', 'NOW', 'UBER', 'ABNB', 'PLTR'
]);

export function getAssetType(symbol: string): AssetTypeCategory {
  if (!symbol) return 'stock';
  const symUpper = symbol.toUpperCase().trim();
  const clean = symUpper.replace('.IS', '').trim();

  // 1. Precious Metals & Commodities
  if (KNOWN_COMMODITIES.has(symUpper) || KNOWN_COMMODITIES.has(clean)) {
    return 'commodity';
  }

  // 2. Forex & Currencies
  if (symUpper.includes('=X') || ['USDTRY', 'EURTRY', 'EURUSD', 'GBPTRY', 'USDJPY', 'GBPUSD', 'USDCHF'].includes(clean)) {
    return 'forex';
  }

  // 3. Cryptocurrencies
  if (symUpper.includes('-USD') || symUpper.includes('-EUR') || symUpper.includes('-TRY') || ['BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'DOGE', 'BNB', 'ADA'].includes(clean)) {
    return 'crypto';
  }

  // 4. Market Indices
  if (symUpper.startsWith('^') || KNOWN_INDICES.has(symUpper) || KNOWN_INDICES.has(clean)) {
    return 'index';
  }

  // 5. Mutual Funds & ETFs
  if (KNOWN_ETFS.has(clean) || ['GLDTR', 'USDTR', 'ZPX10'].includes(clean)) {
    return 'fund';
  }
  // 3-letter Turkish funds (excluding known US stocks & currencies)
  if (clean.length === 3 && /^[A-Z0-9]{3}$/.test(clean)) {
    if (!KNOWN_US_STOCKS.has(clean) && !['USD', 'EUR', 'GBP', 'TRY', 'CAD', 'CHF', 'JPY'].includes(clean)) {
      return 'fund';
    }
  }

  // 6. Default to Equities / Stocks (BIST or Global)
  return 'stock';
}

export function getAssetRoutePrefix(category: AssetTypeCategory): string {
  switch (category) {
    case 'fund': return 'fund';
    case 'commodity': return 'commodity';
    case 'forex': return 'forex';
    case 'crypto': return 'crypto';
    case 'index': return 'index';
    case 'stock':
    default: return 'stock';
  }
}

export function getAssetUrl(symbol: string): string {
  const category = getAssetType(symbol);
  const prefix = getAssetRoutePrefix(category);
  return `/${prefix}/${encodeURIComponent(symbol)}`;
}

export function getAssetCategoryLabel(symbol: string, language: 'tr' | 'en' = 'tr'): { category: AssetTypeCategory; label: string } {
  const category = getAssetType(symbol);
  switch (category) {
    case 'fund':
      return { category, label: language === 'tr' ? 'Yatırım Fonları & ETF' : 'Funds & ETFs' };
    case 'commodity':
      return { category, label: language === 'tr' ? 'Değerli Maden & Emtia' : 'Commodities' };
    case 'forex':
      return { category, label: language === 'tr' ? 'Döviz & Kurlar' : 'Currencies & Forex' };
    case 'crypto':
      return { category, label: language === 'tr' ? 'Kripto Varlıklar' : 'Crypto Assets' };
    case 'index':
      return { category, label: language === 'tr' ? 'Piyasa Endeksleri' : 'Market Indices' };
    case 'stock':
    default:
      return { category, label: symbol.endsWith('.IS') ? (language === 'tr' ? 'BIST Hisseleri' : 'BIST Equities') : (language === 'tr' ? 'Global Hisseler' : 'Global Equities') };
  }
}
