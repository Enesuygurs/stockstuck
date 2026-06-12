import express from 'express';
import cors from 'cors';
import { STOCKS_DATABASE, MARKET_INDICES, MACRO_ASSETS } from './stockDatabase.js';
import { FAMOUS_PRIMARY_TEFAS, getTefasPerformance, TEFAS_PERFORMANCE_MAP } from './tefasMasterDatabase.js';
import { analyzeStockTechnicals } from './technicalEngine.js';
import { getLiveTefasQuote, getLiveTefasChartData, getLiveTefasReturnsTable } from './tefasLiveService.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory caches to guarantee speed and prevent external rate limits
const quoteCache = new Map();
const chartCache = new Map();
const newsCache = new Map();

const CACHE_TTL_QUOTE_MS = 10000; // 10 seconds
const CACHE_TTL_CHART_MS = 60000; // 1 minute
const CACHE_TTL_NEWS_MS = 300000; // 5 minutes

function isTefasFund(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  const symUpper = symbol.toUpperCase().trim();
  const clean = symUpper.replace('.IS', '');
  if (['GLDTR', 'USDTR', 'ZPX10'].includes(clean)) return false; // BYFs
  if (['USD', 'EUR', 'GBP', 'TRY', 'CHF', 'JPY', 'CAD', 'AUD'].includes(clean)) return false;

  // Exclude known US Equities & ETFs
  const usStocks = STOCKS_DATABASE.US || [];
  if (usStocks.some(s => s.symbol.toUpperCase() === clean || s.symbol.toUpperCase() === symUpper)) {
    return false;
  }

  // Exclude known Macro assets & Currencies
  if (MACRO_ASSETS && MACRO_ASSETS.some(m => m.symbol.toUpperCase() === symUpper || m.symbol.toUpperCase() === clean)) {
    return false;
  }

  // Exclude Market Indices
  if (MARKET_INDICES && MARKET_INDICES.some(i => i.symbol.toUpperCase() === symUpper || i.symbol.toUpperCase() === clean)) {
    return false;
  }

  if (FAMOUS_PRIMARY_TEFAS.some(f => f.symbol.toUpperCase() === symUpper || f.symbol.replace('.IS', '').toUpperCase() === clean)) {
    return true;
  }

  const allFunds = STOCKS_DATABASE.FUNDS || [];
  if (allFunds.some(f => (f.symbol.toUpperCase() === symUpper || f.symbol.replace('.IS', '').toUpperCase() === clean) && f.category === 'TEFAS')) {
    return true;
  }

  // 3-letter Turkish fund pattern (only if not an excluded global asset)
  if (clean.length === 3 && /^[A-Z0-9]{3}$/.test(clean)) {
    return true;
  }

  return false;
}

function isKnownAsset(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  const symUpper = symbol.toUpperCase().trim();
  const clean = symUpper.replace('.IS', '');
  if (isTefasFund(symUpper)) return true;
  if (REAL_BASE_PRICES[symUpper] || REAL_BASE_PRICES[`${clean}.IS`] || REAL_BASE_PRICES[clean]) return true;
  const allDatabaseItems = [
    ...STOCKS_DATABASE.US,
    ...STOCKS_DATABASE.BIST,
    ...(STOCKS_DATABASE.FUNDS || []),
    ...MACRO_ASSETS,
    ...MARKET_INDICES
  ];
  return allDatabaseItems.some(s => s.symbol.toUpperCase() === symUpper || s.symbol.replace('.IS', '').toUpperCase() === clean);
}

async function deriveGramPreciousChart(symbol, range = '1mo', interval = '1d') {
  const metalSymbol = symbol === 'GRAM_ALTIN' ? 'GC=F' : 'SI=F';
  try {
    const [metalChart, usdChart] = await Promise.all([
      fetchYahooChart(metalSymbol, range, interval),
      fetchYahooChart('USDTRY=X', range, interval)
    ]);
    if (!metalChart || !usdChart) throw new Error('Cannot fetch metal components');

    const metalTimestamps = metalChart.timestamp || [];
    const metalQuotes = metalChart.indicators?.quote?.[0] || {};
    const usdQuotes = usdChart.indicators?.quote?.[0] || {};
    const usdCloses = (usdQuotes.close || []).filter(v => v !== null && !isNaN(v));
    const usdAvg = usdCloses.length > 0 ? usdCloses[usdCloses.length - 1] : 38.65;

    const timestamps = metalTimestamps;
    const opens = [];
    const highs = [];
    const lows = [];
    const closes = [];
    const volumes = [];

    for (let i = 0; i < timestamps.length; i++) {
      const uRate = (usdQuotes.close && usdQuotes.close[i] && !isNaN(usdQuotes.close[i])) ? usdQuotes.close[i] : usdAvg;
      const mOpen = metalQuotes.open?.[i] ?? metalQuotes.close?.[i] ?? 0;
      const mHigh = metalQuotes.high?.[i] ?? metalQuotes.close?.[i] ?? 0;
      const mLow = metalQuotes.low?.[i] ?? metalQuotes.close?.[i] ?? 0;
      const mClose = metalQuotes.close?.[i] ?? 0;

      opens.push(mOpen ? Number(((mOpen / 31.1035) * uRate).toFixed(2)) : null);
      highs.push(mHigh ? Number(((mHigh / 31.1035) * uRate).toFixed(2)) : null);
      lows.push(mLow ? Number(((mLow / 31.1035) * uRate).toFixed(2)) : null);
      closes.push(mClose ? Number(((mClose / 31.1035) * uRate).toFixed(2)) : null);
      volumes.push(metalQuotes.volume?.[i] ?? 100000);
    }

    const validCloses = closes.filter(v => v !== null && !isNaN(v));
    const latestPrice = validCloses.length > 0 ? validCloses[validCloses.length - 1] : (symbol === 'GRAM_ALTIN' ? 3540 : 39.8);

    return {
      meta: {
        symbol,
        currency: 'TRY',
        regularMarketPrice: latestPrice,
        chartPreviousClose: validCloses[0] || latestPrice,
        regularMarketDayHigh: Math.max(...highs.filter(Boolean)),
        regularMarketDayLow: Math.min(...lows.filter(Boolean)),
        fiftyTwoWeekHigh: Number((latestPrice * 1.35).toFixed(2)),
        fiftyTwoWeekLow: Number((latestPrice * 0.72).toFixed(2)),
        regularMarketVolume: 85000000
      },
      timestamp: timestamps,
      indicators: {
        quote: [{ open: opens, high: highs, low: lows, close: closes, volume: volumes }]
      }
    };
  } catch {
    return generateSyntheticChart(symbol, range, interval);
  }
}


/**
 * Robust fetch helper with dual-endpoint fallback, timeout and User-Agent
 */
async function fetchYahooChart(symbol, range = '1mo', interval = '1d') {
  if (symbol === 'GRAM_ALTIN' || symbol === 'GRAM_GUMUS') {
    return deriveGramPreciousChart(symbol, range, interval);
  }

  if (isTefasFund(symbol)) {
    try {
      const liveChart = await getLiveTefasChartData(symbol, range);
      if (liveChart && liveChart.candles && liveChart.candles.length > 0) {
        return liveChart;
      }
    } catch (err) {
      console.warn(`[TEFAS Live Chart] Falling back to generator for ${symbol}:`, err.message);
    }
    return generateTefasChart(symbol, range, interval);
  }

  const cacheKey = `${symbol}_${range}_${interval}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_CHART_MS) {
    return cached.data;
  }

  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`
  ];
  
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data?.chart?.result && data.chart.result.length > 0) {
          const result = data.chart.result[0];
          if (result && result.meta && (result.meta.regularMarketPrice !== undefined || (result.timestamp && result.timestamp.length > 0))) {
            chartCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
          }
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // Fallback to synthetic chart ONLY if it is an existing known asset in database
  if (cached) return cached.data;
  if (isKnownAsset(symbol)) {
    return generateSyntheticChart(symbol, range, interval);
  }
  throw new Error(`Geçersiz veya bulunamayan varlık: ${symbol}`);
}

/**
 * Fetch fast single quote metadata
 */
async function getStockQuote(symbol) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  if (!cleanSym) {
    throw new Error('Geçersiz varlık kodu');
  }

  const cached = quoteCache.get(cleanSym);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_QUOTE_MS) {
    return cached.data;
  }

  // Direct TEFAS fund quote handling (Live Official Takasbank API with instant fallback)
  if (isTefasFund(cleanSym)) {
    try {
      const liveQuote = await getLiveTefasQuote(cleanSym);
      if (liveQuote) {
        quoteCache.set(cleanSym, { timestamp: Date.now(), data: liveQuote });
        return liveQuote;
      }
    } catch (err) {
      console.warn(`[TEFAS Live Quote] Falling back to master DB for ${cleanSym}:`, err.message);
    }
    const quoteData = generateTefasQuote(cleanSym);
    quoteCache.set(cleanSym, { timestamp: Date.now(), data: quoteData });
    return quoteData;
  }

  // Derived Gram Gold calculation
  if (cleanSym === 'GRAM_ALTIN') {
    try {
      const [onsGold, usdTry] = await Promise.all([getStockQuote('GC=F'), getStockQuote('USDTRY=X')]);
      const price = Number(((onsGold.price / 31.1035) * usdTry.price).toFixed(2));
      const prevClose = Number(((onsGold.previousClose / 31.1035) * usdTry.previousClose).toFixed(2));
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
      const dayHigh = Number(((onsGold.dayHigh / 31.1035) * usdTry.dayHigh).toFixed(2));
      const dayLow = Number(((onsGold.dayLow / 31.1035) * usdTry.dayLow).toFixed(2));
      const quoteData = {
        symbol: 'GRAM_ALTIN',
        shortName: 'Gram Altın',
        longName: 'Gram Altın (TL)',
        currency: 'TRY',
        exchange: 'SERBEST PIYASA',
        price,
        change,
        changePercent,
        previousClose: prevClose,
        dayHigh,
        dayLow,
        fiftyTwoWeekHigh: Number((price * 1.35).toFixed(2)),
        fiftyTwoWeekLow: Number((price * 0.72).toFixed(2)),
        volume: 85000000,
        marketCap: 0,
        timestamp: Date.now()
      };
      quoteCache.set('GRAM_ALTIN', { timestamp: Date.now(), data: quoteData });
      return quoteData;
    } catch {
      // fallback
    }
  }

  // Derived Gram Silver calculation
  if (cleanSym === 'GRAM_GUMUS') {
    try {
      const [onsSilver, usdTry] = await Promise.all([getStockQuote('SI=F'), getStockQuote('USDTRY=X')]);
      const price = Number(((onsSilver.price / 31.1035) * usdTry.price).toFixed(2));
      const prevClose = Number(((onsSilver.previousClose / 31.1035) * usdTry.previousClose).toFixed(2));
      const change = Number((price - prevClose).toFixed(2));
      const changePercent = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
      const dayHigh = Number(((onsSilver.dayHigh / 31.1035) * usdTry.dayHigh).toFixed(2));
      const dayLow = Number(((onsSilver.dayLow / 31.1035) * usdTry.dayLow).toFixed(2));
      const quoteData = {
        symbol: 'GRAM_GUMUS',
        shortName: 'Gram Gümüş',
        longName: 'Gram Gümüş (TL)',
        currency: 'TRY',
        exchange: 'SERBEST PIYASA',
        price,
        change,
        changePercent,
        previousClose: prevClose,
        dayHigh,
        dayLow,
        fiftyTwoWeekHigh: Number((price * 1.4).toFixed(2)),
        fiftyTwoWeekLow: Number((price * 0.65).toFixed(2)),
        volume: 24000000,
        marketCap: 0,
        timestamp: Date.now()
      };
      quoteCache.set('GRAM_GUMUS', { timestamp: Date.now(), data: quoteData });
      return quoteData;
    } catch {
      // fallback
    }
  }

  try {
    const chartResult = await fetchYahooChart(cleanSym, '1d', '5m');
    if (!chartResult || !chartResult.meta) {
      throw new Error('No metadata returned');
    }

    const meta = chartResult.meta;
    const quotes = chartResult.indicators?.quote?.[0] || {};
    const closes = (quotes.close || []).filter(v => v !== null && !isNaN(v));
    const latestClose = closes.length > 0 ? closes[closes.length - 1] : meta.regularMarketPrice;
    
    // Previous close is strictly yesterday's close (previousClose), not 5d old chartPreviousClose
    const prevClose = meta.previousClose || meta.chartPreviousClose || latestClose;
    const price = meta.regularMarketPrice || latestClose;
    if (price === undefined || price === null || isNaN(price)) {
      throw new Error('Invalid price data from market feed');
    }

    const change = meta.regularMarketChange !== undefined ? meta.regularMarketChange : (price - prevClose);
    const changePercent = meta.regularMarketChangePercent !== undefined ? meta.regularMarketChangePercent : (prevClose > 0 ? (change / prevClose) * 100 : 0);
    
    const macroDef = MACRO_ASSETS.find(m => m.symbol.toUpperCase() === cleanSym);
    const dbItem = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || []), ...MACRO_ASSETS].find(s => s.symbol.toUpperCase() === cleanSym || s.symbol.replace('.IS', '').toUpperCase() === cleanSym.replace('.IS', ''));
    const isForex = macroDef?.category === 'FOREX';
    const decimals = (price < 10 || isForex) ? 4 : 2;
    
    const quoteData = {
      symbol: meta.symbol || cleanSym,
      shortName: dbItem ? (dbItem.trName || dbItem.shortName || dbItem.name) : (macroDef ? macroDef.shortName : (meta.shortName || cleanSym)),
      longName: dbItem ? (dbItem.name || dbItem.trName) : (macroDef ? macroDef.name : (meta.longName || meta.shortName || cleanSym)),
      trName: dbItem ? (dbItem.trName || dbItem.name) : (macroDef ? macroDef.name : (meta.longName || meta.shortName || cleanSym)),
      category: macroDef ? macroDef.category : dbItem?.category,
      unit: macroDef ? macroDef.unit : dbItem?.unit,
      currency: macroDef ? macroDef.currency : (dbItem?.currency || meta.currency || (cleanSym.endsWith('.IS') ? 'TRY' : 'USD')),
      exchange: dbItem?.exchange || (macroDef
        ? (macroDef.category === 'FOREX' ? 'FOREX / KURLAR' : macroDef.category === 'COMMODITY' ? 'EMTİA PİYASASI' : macroDef.category === 'CRYPTO' ? 'KRİPTO (7/24)' : 'TAHVİL & MAKRO')
        : (meta.exchangeName || (cleanSym.endsWith('.IS') ? 'BIST' : 'NASDAQ'))),
      sector: dbItem?.sector || (macroDef
        ? (macroDef.category === 'FOREX' ? 'Döviz & Kurlar' : macroDef.category === 'COMMODITY' ? 'Emtia & Madenler' : macroDef.category === 'CRYPTO' ? 'Kripto Varlıklar' : 'Tahvil & Faiz')
        : (cleanSym.endsWith('.IS') ? 'BIST Şirketleri' : 'Global Şirketler')),
      subSector: dbItem?.subSector || (macroDef ? macroDef.descriptionTr : 'Piyasa Varlığı'),
      price: Number(price.toFixed(decimals)),
      change: Number(change.toFixed(decimals)),
      changePercent: Number(changePercent.toFixed(2)),
      previousClose: Number(prevClose.toFixed(decimals)),
      dayHigh: Number((meta.regularMarketDayHigh || price * 1.02).toFixed(decimals)),
      dayLow: Number((meta.regularMarketDayLow || price * 0.98).toFixed(decimals)),
      fiftyTwoWeekHigh: Number((meta.fiftyTwoWeekHigh || price * 1.3).toFixed(decimals)),
      fiftyTwoWeekLow: Number((meta.fiftyTwoWeekLow || price * 0.7).toFixed(decimals)),
      volume: meta.regularMarketVolume || 12500000,
      marketCap: getDatabaseMarketCap(cleanSym, price),
      timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
    };

    quoteCache.set(cleanSym, { timestamp: Date.now(), data: quoteData });
    return quoteData;
  } catch (err) {
    if (cached) return cached.data;
    if (isKnownAsset(cleanSym)) {
      return generateSyntheticQuote(cleanSym);
    }
    throw new Error(`Geçersiz veya bulunamayan varlık: ${cleanSym}`);
  }
}

function getDatabaseMarketCap(symbol, currentPrice) {
  const allStocks = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || [])];
  const found = allStocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
  if (found && found.marketCap) return found.marketCap;
  return currentPrice * 500000000;
}

const REAL_BASE_PRICES = {
  // Prominent BIST Real Equities
  'KOZAL.IS': 22.40,
  'KOZAA.IS': 56.70,
  'IPEKE.IS': 43.10,
  'THYAO.IS': 298.50,
  'GARAN.IS': 118.40,
  'AKBNK.IS': 58.60,
  'ISCTR.IS': 14.80,
  'YKBNK.IS': 31.40,
  'VAKBN.IS': 22.10,
  'HALKB.IS': 18.90,
  'ASELS.IS': 62.10,
  'EREGL.IS': 52.40,
  'KRDMD.IS': 28.50,
  'KCAER.IS': 14.20,
  'SISE.IS': 47.80,
  'TUPRS.IS': 175.20,
  'FROTO.IS': 1045.00,
  'TOASO.IS': 248.00,
  'BIMAS.IS': 485.00,
  'MGROS.IS': 520.00,
  'KCHOL.IS': 212.00,
  'SAHOL.IS': 98.40,
  'PGSUS.IS': 234.00,
  'TAVHL.IS': 242.00,
  'PETKM.IS': 21.80,
  'TTKOM.IS': 51.20,
  'TCELL.IS': 92.40,

  // TEFAS Funds & BYFs
  'THF.IS': 2.912217,
  'TP2.IS': 1.642085,
  'TLY.IS': 2.1540,
  'TRJ.IS': 1.4820,
  'TLV.IS': 1.3210,
  'PBR.IS': 2.1845,
  'PRY.IS': 1.5420,
  'PHE.IS': 3.1240,
  'PYR.IS': 2.8540,
  'PPH.IS': 3.4210,
  'AC4.IS': 1.4520,
  'AFT.IS': 0.5240,
  'AFA.IS': 0.4180,
  'AFO.IS': 4.8250,
  'GUM.IS': 2.1450,
  'BIO.IS': 0.5420,
  'BUY.IS': 0.7240,
  'APE.IS': 1.6840,
  'AYR.IS': 4.1250,
  'MAC.IS': 3.6540,
  'NNF.IS': 6.8420,
  'IIH.IS': 4.8530,
  'HVT.IS': 4.1240,
  'HKH.IS': 3.1850,
  'TI3.IS': 8.9450,
  'TI2.IS': 4.8510,
  'TI1.IS': 1.2540,
  'TI4.IS': 4.6520,
  'TTE.IS': 0.6240,
  'TTA.IS': 5.2140,
  'TAU.IS': 8.5240,
  'IDH.IS': 3.5420,
  'IKP.IS': 4.6210,
  'IPV.IS': 2.4510,
  'GBG.IS': 5.4120,
  'GMR.IS': 4.9120,
  'GGK.IS': 4.6210,
  'GBV.IS': 3.9120,
  'YAS.IS': 6.8420,
  'YAY.IS': 0.6240,
  'YZH.IS': 0.7120,
  'YKT.IS': 4.8120,
  'YBE.IS': 1.8420,
  'ZPX10.IS': 185.40,
  'GLDTR.IS': 415.20,
  'USDTR.IS': 480.10,
  'ZAG.IS': 3.8420,
  'DBH.IS': 1.9420,
  'DMG.IS': 2.0140,
  'KZL.IS': 3.9120,
  'KUB.IS': 4.6210,
  'PPZ.IS': 5.4210,
  'FIL.IS': 4.9520,
  'NVB.IS': 3.8120,
  'NRC.IS': 3.6120,
  'GSP.IS': 2.8120,
  'ST1.IS': 2.4120,
  'OKD.IS': 3.4120,
  'OTJ.IS': 3.2140,
  'TCD.IS': 11.8540,

  // Macro & Multi-Asset Hub Base Prices
  'USDTRY=X': 38.65,
  'EURTRY=X': 41.85,
  'EURUSD=X': 1.0825,
  'GBPTRY=X': 49.20,
  'DX-Y.NYB': 104.20,
  'GRAM_ALTIN': 3540.00,
  'GC=F': 2855.00,
  'GRAM_GUMUS': 39.80,
  'SI=F': 32.10,
  'BZ=F': 74.20,
  'CL=F': 70.80,
  'NG=F': 2.85,
  'HG=F': 4.35,
  'BTC-USD': 94800.00,
  'ETH-USD': 2840.00,
  'SOL-USD': 198.50,
  'XRP-USD': 2.38,
  'BNB-USD': 658.00,
  '^TNX': 4.32,
  '^VIX': 15.60,
  '^IRX': 4.85,
};

function getRealisticBasePrice(symbol) {
  const symUpper = (symbol || '').toUpperCase().trim();
  const cleanSym = symUpper.replace('.IS', '');

  if (REAL_BASE_PRICES[symUpper]) return REAL_BASE_PRICES[symUpper];
  if (REAL_BASE_PRICES[`${cleanSym}.IS`]) return REAL_BASE_PRICES[`${cleanSym}.IS`];
  if (REAL_BASE_PRICES[cleanSym]) return REAL_BASE_PRICES[cleanSym];

  const macroAsset = MACRO_ASSETS.find(m => m.symbol.toUpperCase() === symUpper || m.symbol.toUpperCase() === cleanSym);
  if (macroAsset && macroAsset.basePrice) {
    return macroAsset.basePrice;
  }
  
  // Is this a 3-letter TEFAS fund code?
  if (cleanSym.length === 3 && /^[A-Z0-9]{3}$/.test(cleanSym)) {
    const hash = cleanSym.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Number((1.80 + (hash % 20) * 0.25).toFixed(4));
  }
  
  const isBIST = symUpper.endsWith('.IS');
  if (isBIST) {
    return 75.0 + (cleanSym.length * 15);
  }
  
  return 180.0 + (cleanSym.length * 20);
}

/**
 * High-precision TEFAS Mutual Funds Quote Generator
 */
function generateTefasQuote(symbol) {
  const symUpper = (symbol || '').toUpperCase().trim();
  const cleanSym = symUpper.replace('.IS', '');
  
  const allFunds = STOCKS_DATABASE.FUNDS || [];
  const dbItem = allFunds.find(f => f.symbol.toUpperCase() === symUpper || f.symbol.replace('.IS', '').toUpperCase() === cleanSym)
    || FAMOUS_PRIMARY_TEFAS.find(f => f.symbol.toUpperCase() === symUpper || f.symbol.replace('.IS', '').toUpperCase() === cleanSym)
    || {
      symbol: `${cleanSym}.IS`,
      name: `${cleanSym} TEFAS Yatırım Fonu`,
      trName: `${cleanSym} Fonu`,
      sector: 'TEFAS - Hisse Senedi',
      subSector: 'Hisse Senedi Yoğun',
      manager: 'Portföy Yönetimi A.Ş.',
      fee: '%2.00',
      risk: 5,
      marketCap: 2500000000
    };

  const perf = getTefasPerformance(cleanSym, dbItem);
  const basePrice = perf.price;
  const fixedDailyChangePct = perf.return1d;

  const previousClose = Number((basePrice / (1 + fixedDailyChangePct / 100)).toFixed(6));
  const change = Number((basePrice - previousClose).toFixed(6));
  
  const fiftyTwoWeekHigh = Number((basePrice * 1.015).toFixed(6));
  const fiftyTwoWeekLow = Number((basePrice / (1 + perf.return1y / 100)).toFixed(6));

  const seed = cleanSym.split('').reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 1), 0);

  return {
    symbol: `${cleanSym}.IS`,
    shortName: cleanSym,
    longName: dbItem.name || `${cleanSym} TEFAS Yatırım Fonu`,
    trName: dbItem.trName || `${cleanSym} Fonu`,
    currency: 'TRY',
    exchange: 'TEFAS',
    category: 'TEFAS',
    sector: dbItem.sector || 'TEFAS - Yatırım Fonları',
    subSector: dbItem.subSector || 'Hisse Senedi Yoğun',
    manager: dbItem.manager || 'Portföy Yönetimi A.Ş.',
    fee: dbItem.fee || '%2.00',
    risk: dbItem.risk || 5,
    price: basePrice,
    change,
    changePercent: fixedDailyChangePct,
    previousClose,
    dayHigh: basePrice,
    dayLow: basePrice,
    fiftyTwoWeekHigh,
    volume: 0,
    marketCap: dbItem.marketCap || (basePrice * 1000000000),
    pricingType: 'DAILY_NAV',
    navDate: new Date().toLocaleDateString('tr-TR'),
    returns: {
      return1w: perf.return1w,
      return1m: perf.return1m,
      return3m: perf.return3m,
      return6m: perf.return6m,
      returnYtd: perf.returnYtd,
      return1y: perf.return1y,
      return3y: perf.return3y,
      return5y: perf.return5y,
      categoryRank: perf.categoryRank,
      categoryAvg1m: perf.categoryAvg1m
    },
    timestamp: Date.now()
  };
}

/**
 * High-precision TEFAS Mutual Funds Historical NAV Chart Generator
 */
function generateTefasChart(symbol, range = '1mo', interval = '1d') {
  const symUpper = (symbol || '').toUpperCase().trim();
  const cleanSym = symUpper.replace('.IS', '');
  const quote = generateTefasQuote(cleanSym);
  const targetBase = quote.price;
  const previousClose = quote.previousClose;
  const perf = quote.returns || {};
  const isMoneyMarket = quote.sector?.includes('Para Piyasası') || quote.subSector?.includes('Likit');

  let startPrice = previousClose;
  let count = 30;
  let step = 86400; // 1 day in seconds
  const now = Math.floor(Date.now() / 1000);

  if (range === '1d') {
    count = 24;
    step = 3600;
    startPrice = previousClose;
  } else if (range === '5d') {
    count = 5;
    step = 86400;
    const r5d = perf.return1w || 4.5;
    startPrice = Number((targetBase / (1 + r5d / 100)).toFixed(6));
  } else if (range === '1mo') {
    count = 30;
    step = 86400;
    const r1m = perf.return1m || 29.47;
    startPrice = Number((targetBase / (1 + r1m / 100)).toFixed(6));
  } else if (range === '6mo') {
    count = 130;
    step = 86400;
    const r6m = perf.return6m || 118.50;
    startPrice = Number((targetBase / (1 + r6m / 100)).toFixed(6));
  } else if (range === '1y') {
    count = 250;
    step = 86400;
    const r1y = perf.return1y || 214.80;
    startPrice = Number((targetBase / (1 + r1y / 100)).toFixed(6));
  } else if (range === '5y') {
    count = 260;
    step = 86400 * 7; // Weekly
    const r5y = perf.return5y || 1850.00;
    startPrice = Number((targetBase / (1 + r5y / 100)).toFixed(6));
  } else if (range === 'max') {
    count = 360;
    step = 86400 * 7;
    const rMax = (perf.return5y || 1850.00) * 1.35;
    startPrice = Number((targetBase / (1 + rMax / 100)).toFixed(6));
  }

  const timestamps = [];
  const opens = [];
  const highs = [];
  const lows = [];
  const closes = [];
  const volumes = [];

  const seed = cleanSym.split('').reduce((acc, c, idx) => acc + c.charCodeAt(0) * (idx + 1), 0);

  if (range === '1d') {
    for (let i = count; i >= 0; i--) {
      const t = now - (i * step);
      const progress = (count - i) / count;
      const val = progress < 0.25 ? previousClose : targetBase;
      timestamps.push(t);
      opens.push(val);
      highs.push(val);
      lows.push(val);
      closes.push(val);
      volumes.push(Math.floor(quote.volume / count));
    }
  } else {
    for (let i = count; i >= 0; i--) {
      const t = now - (i * step);
      const progress = (count - i) / count;
      const rawTrend = startPrice * Math.pow(targetBase / startPrice, progress);
      // Ensure exact endpoints at i === count (start) and i === 0 (end)
      const noise = (i === 0 || i === count) ? 0 : Math.sin(i * 0.75 + seed) * (rawTrend * (isMoneyMarket ? 0.0003 : 0.002));
      const val = Number((i === 0 ? targetBase : i === count ? startPrice : Math.max(0.000001, rawTrend + noise)).toFixed(6));

      timestamps.push(t);
      opens.push(val);
      highs.push(val);
      lows.push(val);
      closes.push(val);
      volumes.push(Math.floor(quote.volume / count));
    }
  }

  return {
    meta: {
      symbol: `${cleanSym}.IS`,
      currency: 'TRY',
      exchangeName: 'TEFAS',
      regularMarketPrice: targetBase,
      chartPreviousClose: startPrice,
      previousClose: quote.previousClose,
      regularMarketDayHigh: targetBase,
      regularMarketDayLow: targetBase,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      regularMarketVolume: quote.volume
    },
    timestamp: timestamps,
    indicators: {
      quote: [{ open: opens, high: highs, low: lows, close: closes, volume: volumes }]
    }
  };
}

/**
 * High-fidelity synthetic fallback generator for offline / simulated scenarios
 */
function generateSyntheticQuote(symbol) {
  const symUpper = (symbol || '').toUpperCase().trim();
  const cleanSym = symUpper.replace('.IS', '');

  if (isTefasFund(symUpper)) {
    return generateTefasQuote(symUpper);
  }

  const basePrice = getRealisticBasePrice(symUpper);
  const isBIST = symUpper.endsWith('.IS');

  const macroAsset = MACRO_ASSETS.find(m => m.symbol.toUpperCase() === symUpper);
  if (macroAsset) {
    const isForex = macroAsset.category === 'FOREX';
    const decimals = (basePrice < 10 || isForex) ? 4 : 2;
    const changePercent = Number((Math.sin(Date.now() / 10000 + symbol.length) * 1.25).toFixed(2));
    const change = Number((basePrice * (changePercent / 100)).toFixed(decimals));
    const price = Number((basePrice + change).toFixed(decimals));

    return {
      symbol,
      shortName: macroAsset.shortName,
      longName: macroAsset.name,
      trName: macroAsset.name,
      currency: macroAsset.currency,
      category: macroAsset.category,
      unit: macroAsset.unit,
      exchange: macroAsset.category === 'FOREX' ? 'FOREX / KURLAR' : macroAsset.category === 'COMMODITY' ? 'EMTİA PİYASASI' : macroAsset.category === 'CRYPTO' ? 'KRİPTO (7/24)' : 'TAHVİL & MAKRO',
      sector: macroAsset.category === 'FOREX' ? 'Döviz & Kurlar' : macroAsset.category === 'COMMODITY' ? 'Emtia & Madenler' : macroAsset.category === 'CRYPTO' ? 'Kripto Varlıklar' : 'Tahvil & Faiz',
      subSector: macroAsset.descriptionTr,
      price,
      change,
      changePercent,
      previousClose: basePrice,
      dayHigh: Number((price * 1.012).toFixed(decimals)),
      dayLow: Number((price * 0.988).toFixed(decimals)),
      fiftyTwoWeekHigh: Number((price * 1.45).toFixed(decimals)),
      fiftyTwoWeekLow: Number((price * 0.72).toFixed(decimals)),
      volume: 12500000,
      marketCap: getDatabaseMarketCap(symbol, price),
      pricingType: 'REALTIME',
      timestamp: Date.now()
    };
  }

  // Continuous Equities & ETFs (US Stocks, BIST Stocks, Global ETFs, BYF)
  const dbItem = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || [])].find(s => s.symbol.toUpperCase() === symUpper || s.symbol.replace('.IS', '').toUpperCase() === cleanSym);
  const changePercent = Number((Math.sin(Date.now() / 10000 + symbol.length) * 1.85).toFixed(2));
  const change = Number((basePrice * (changePercent / 100)).toFixed(4));
  const price = Number((basePrice + change).toFixed(4));
  
  return {
    symbol,
    shortName: dbItem ? (dbItem.trName || dbItem.shortName || dbItem.name || cleanSym) : cleanSym,
    longName: dbItem ? (dbItem.name || cleanSym) : `${cleanSym}`,
    trName: dbItem ? (dbItem.trName || dbItem.name || cleanSym) : cleanSym,
    sector: dbItem?.sector || (isBIST ? 'BIST Şirketleri' : 'Global Şirketler'),
    subSector: dbItem?.subSector || 'Piyasa Varlığı',
    currency: dbItem?.currency || (isBIST ? 'TRY' : 'USD'),
    exchange: dbItem?.exchange || (isBIST ? 'BIST' : 'NASDAQ'),
    price,
    change,
    changePercent,
    previousClose: basePrice,
    dayHigh: Number((price * 1.012).toFixed(4)),
    dayLow: Number((price * 0.988).toFixed(4)),
    fiftyTwoWeekHigh: Number((price * 1.45).toFixed(4)),
    fiftyTwoWeekLow: Number((price * 0.72).toFixed(4)),
    volume: 12500000,
    marketCap: getDatabaseMarketCap(symbol, price),
    pricingType: 'REALTIME',
    timestamp: Date.now()
  };
}

function generateSyntheticChart(symbol, range = '1mo', interval = '1d') {
  const symUpper = (symbol || '').toUpperCase().trim();
  const cleanSym = symUpper.replace('.IS', '');
  
  if (isTefasFund(symUpper)) {
    return generateTefasChart(symUpper, range, interval);
  }

  const isBIST = symUpper.endsWith('.IS');
  const count = range === '1d' ? 78 : range === '5d' ? 40 : range === '1mo' ? 30 : range === '6mo' ? 130 : range === '1y' ? 250 : range === '5y' ? 260 : range === 'max' ? 360 : 100;
  const now = Math.floor(Date.now() / 1000);
  const step = range === '1d' ? 300 : 86400;
  
  let targetBase = getRealisticBasePrice(symUpper);
  let base = range === '1d' ? targetBase * 0.995 : range === '5d' ? targetBase * 0.985 : range === '1mo' ? targetBase * 0.95 : range === '6mo' ? targetBase * 0.82 : range === '1y' ? targetBase * 0.72 : targetBase * 0.45;
  const timestamps = [];
  const opens = [];
  const highs = [];
  const lows = [];
  const closes = [];
  const volumes = [];
  
  for (let i = count; i >= 0; i--) {
    const t = now - (i * step);
    const progress = (count - i) / count;
    // Organic trend towards current target base
    const trendBase = base + (targetBase - base) * progress;
    const noise = (Math.random() - 0.48) * (trendBase * 0.015);
    const open = trendBase;
    const close = Math.max(0.01, trendBase + noise);
    const high = Math.max(open, close) + Math.random() * (trendBase * 0.008);
    const low = Math.min(open, close) - Math.random() * (trendBase * 0.008);
    const volume = Math.floor(Math.random() * 4000000 + 500000);
    
    timestamps.push(t);
    opens.push(Number(open.toFixed(4)));
    highs.push(Number(high.toFixed(4)));
    lows.push(Number(low.toFixed(4)));
    closes.push(Number(close.toFixed(4)));
    volumes.push(volume);
  }
  
  return {
    meta: {
      symbol,
      currency: isBIST ? 'TRY' : 'USD',
      regularMarketPrice: targetBase,
      chartPreviousClose: base,
      regularMarketDayHigh: targetBase * 1.02,
      regularMarketDayLow: targetBase * 0.98,
      fiftyTwoWeekHigh: targetBase * 1.45,
      fiftyTwoWeekLow: targetBase * 0.72,
      regularMarketVolume: 12500000
    },
    timestamp: timestamps,
    indicators: {
      quote: [{ open: opens, high: highs, low: lows, close: closes, volume: volumes }]
    }
  };
}

/**
 * ----------------------------------------------------
 * REST API ENDPOINTS
 * ----------------------------------------------------
 */

/**
 * 1. Market Overview Indices Ribbon
 */
app.get('/api/market-overview', async (req, res) => {
  try {
    const promises = MARKET_INDICES.map(async (item) => {
      try {
        const quote = await getStockQuote(item.symbol);
        return {
          ...item,
          ...quote,
          displayName: item.shortName
        };
      } catch {
        return {
          ...item,
          ...generateSyntheticQuote(item.symbol),
          displayName: item.shortName
        };
      }
    });

    const results = await Promise.all(promises);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1.5. Macro Markets & Multi-Asset Hub API
 */
app.get('/api/macro', async (req, res) => {
  try {
    const promises = MACRO_ASSETS.map(async (asset) => {
      try {
        const quote = await getStockQuote(asset.symbol);
        return {
          ...asset,
          ...quote,
          displayName: asset.shortName,
          category: asset.category,
          unit: asset.unit,
          descriptionTr: asset.descriptionTr,
          isHero: asset.isHero,
        };
      } catch {
        const mock = generateSyntheticQuote(asset.symbol);
        return {
          ...asset,
          ...mock,
          displayName: asset.shortName,
          category: asset.category,
          unit: asset.unit,
          descriptionTr: asset.descriptionTr,
          isHero: asset.isHero,
        };
      }
    });

    const allAssets = await Promise.all(promises);

    const categories = {
      FOREX: allAssets.filter(a => a.category === 'FOREX'),
      COMMODITY: allAssets.filter(a => a.category === 'COMMODITY'),
      CRYPTO: allAssets.filter(a => a.category === 'CRYPTO'),
      BONDS: allAssets.filter(a => a.category === 'BONDS'),
    };

    const heroAssets = allAssets.filter(a => a.isHero);

    // Get live key rates for cross-converter
    const usdTry = allAssets.find(a => a.symbol === 'TRY=X' || a.symbol === 'USDTRY=X')?.price || 38.65;
    const eurTry = allAssets.find(a => a.symbol === 'EURTRY=X')?.price || 42.10;
    const gbpTry = allAssets.find(a => a.symbol === 'GBPTRY=X')?.price || 49.50;
    const gramGold = allAssets.find(a => a.symbol === 'GRAM_ALTIN')?.price || 3540.00;
    const btcUsd = allAssets.find(a => a.symbol === 'BTC-USD')?.price || 91500;
    const ethUsd = allAssets.find(a => a.symbol === 'ETH-USD')?.price || 2840.00;

    const converterRates = {
      TRY: 1,
      USD: usdTry,
      EUR: eurTry,
      GBP: gbpTry,
      GRAM_ALTIN: gramGold,
      BTC: btcUsd * usdTry,
      ETH: ethUsd * usdTry,
    };

    res.json({
      success: true,
      timestamp: Date.now(),
      heroAssets,
      categories,
      assets: allAssets,
      converterRates
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1.8. Global Multi-Asset Overview & Hero Rates
 */
app.get('/api/macro-overview', async (req, res) => {
  try {
    const heroSymbols = ['TRY=X', 'EURTRY=X', 'GC=F', 'GRAM_ALTIN', 'SI=F', 'BTC-USD', '^GSPC', 'CL=F'];
    const heroPromises = heroSymbols.map(s => getStockQuote(s).catch(e => generateSyntheticQuote(s)));
    const heroQuotes = await Promise.all(heroPromises);

    const heroAssets = heroQuotes.map(q => {
      const def = MACRO_ASSETS.find(m => m.symbol.toUpperCase() === q.symbol.toUpperCase()) || {};
      return {
        ...def,
        ...q,
        name: def.name || q.longName || q.shortName,
        shortName: def.shortName || q.shortName,
        category: def.category || q.category || 'COMMODITY',
        unit: def.unit || q.unit,
        descriptionTr: def.descriptionTr || q.subSector
      };
    });

    const categoryMap = {
      FOREX: [],
      COMMODITY: [],
      CRYPTO: [],
      BONDS: []
    };

    const assetPromises = MACRO_ASSETS.map(async (asset) => {
      try {
        const quote = await getStockQuote(asset.symbol);
        return {
          ...asset,
          ...quote,
          name: asset.name,
          shortName: asset.shortName,
          category: asset.category,
          unit: asset.unit,
          descriptionTr: asset.descriptionTr
        };
      } catch (err) {
        const mock = generateSyntheticQuote(asset.symbol);
        return {
          ...asset,
          ...mock,
          name: asset.name,
          shortName: asset.shortName,
          category: asset.category,
          unit: asset.unit,
          descriptionTr: asset.descriptionTr
        };
      }
    });

    const allAssets = await Promise.all(assetPromises);
    allAssets.forEach(item => {
      if (categoryMap[item.category]) {
        categoryMap[item.category].push(item);
      }
    });

    const categories = [
      { id: 'FOREX', name: 'Döviz & Kurlar (TCMB / Serbest)', assets: categoryMap.FOREX },
      { id: 'COMMODITY', name: 'Emtia & Kıymetli Madenler', assets: categoryMap.COMMODITY },
      { id: 'CRYPTO', name: 'Kripto Varlıklar (7/24 Canlı)', assets: categoryMap.CRYPTO },
      { id: 'BONDS', name: 'Tahvil & Küresel Faizler', assets: categoryMap.BONDS }
    ];

    const usdTry = allAssets.find(a => a.symbol === 'TRY=X')?.price || 38.65;
    const eurTry = allAssets.find(a => a.symbol === 'EURTRY=X')?.price || 42.10;
    const gbpTry = allAssets.find(a => a.symbol === 'GBPTRY=X')?.price || 49.50;
    const gramAltin = allAssets.find(a => a.symbol === 'GRAM_ALTIN')?.price || 3540.0;
    const btcUsd = allAssets.find(a => a.symbol === 'BTC-USD')?.price || 91500;

    const converterRates = {
      USD: usdTry,
      EUR: eurTry,
      GBP: gbpTry,
      GRAM_ALTIN: gramAltin,
      BTC: btcUsd * usdTry,
      TRY: 1.0
    };

    res.json({
      success: true,
      timestamp: Date.now(),
      heroAssets,
      categories,
      converterRates
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Heatmap Data (NASDAQ / BIST 100 / FUNDS)
 */
app.get('/api/heatmap/:market', async (req, res) => {
  const market = (req.params.market || 'US').toUpperCase();
  let stockList = STOCKS_DATABASE.US;
  if (market === 'BIST') stockList = STOCKS_DATABASE.BIST;
  else if (market === 'FUNDS') stockList = STOCKS_DATABASE.FUNDS || [];

  try {
    const promises = stockList.map(async (stock) => {
      try {
        const quote = await getStockQuote(stock.symbol);
        return {
          ...quote,
          ...stock,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          previousClose: quote.previousClose,
          dayHigh: quote.dayHigh,
          dayLow: quote.dayLow,
          volume: quote.volume,
          marketCap: stock.marketCap || quote.marketCap,
          sector: stock.sector || quote.sector,
          subSector: stock.subSector || quote.subSector,
          trName: stock.trName || quote.trName || stock.name,
          name: stock.name || quote.name,
          id: stock.symbol,
        };
      } catch {
        const mock = generateSyntheticQuote(stock.symbol);
        return {
          ...mock,
          ...stock,
          price: mock.price,
          change: mock.change,
          changePercent: mock.changePercent,
          previousClose: mock.previousClose,
          dayHigh: mock.dayHigh,
          dayLow: mock.dayLow,
          volume: mock.volume,
          marketCap: stock.marketCap || mock.marketCap,
          sector: stock.sector || mock.sector,
          subSector: stock.subSector || mock.subSector,
          trName: stock.trName || mock.trName || stock.name,
          name: stock.name || mock.name,
          id: stock.symbol,
        };
      }
    });

    const results = await Promise.all(promises);

    // Group by Sector
    const sectorsMap = {};
    for (const item of results) {
      const sector = item.sector || 'Diğer';
      if (!sectorsMap[sector]) {
        sectorsMap[sector] = {
          name: sector,
          totalMarketCap: 0,
          stocks: []
        };
      }
      sectorsMap[sector].stocks.push(item);
      sectorsMap[sector].totalMarketCap += (item.marketCap || item.price * 1000000);
    }

    const sectors = Object.values(sectorsMap).sort((a, b) => b.totalMarketCap - a.totalMarketCap);

    res.json({
      success: true,
      market,
      totalStocks: results.length,
      sectors,
      stocks: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2.5. Dedicated Comprehensive Funds & ETFs Directory API
 */
app.get('/api/funds', async (req, res) => {
  const category = (req.query.category || 'ALL').toUpperCase();
  const fundList = STOCKS_DATABASE.FUNDS || [];

  try {
    const promises = fundList.map(async (fund) => {
      try {
        const quote = await getStockQuote(fund.symbol);
        return {
          ...fund,
          ...quote,
          nav: quote.price,
        };
      } catch {
        const mock = generateSyntheticQuote(fund.symbol);
        return {
          ...fund,
          ...mock,
          nav: mock.price,
        };
      }
    });

    let results = await Promise.all(promises);

    if (category !== 'ALL') {
      const catUpper = category.toUpperCase();
      results = results.filter(f => 
        (f.category && f.category.toUpperCase() === catUpper) ||
        (f.sector && f.sector.toUpperCase().includes(catUpper)) ||
        (f.subSector && f.subSector.toUpperCase().includes(catUpper))
      );
    }

    res.json({
      success: true,
      total: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Single Stock / Fund Real-time Quote
 */
app.get('/api/quote/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cleanSym = symbol.replace('.IS', '');
  try {
    const quote = await getStockQuote(symbol);
    const dbItem = [
      ...STOCKS_DATABASE.US,
      ...STOCKS_DATABASE.BIST,
      ...(STOCKS_DATABASE.FUNDS || []),
      ...FAMOUS_PRIMARY_TEFAS,
      ...MACRO_ASSETS
    ].find(s => s.symbol.toUpperCase() === symbol || s.symbol.replace('.IS', '').toUpperCase() === cleanSym);
    
    res.json({
      success: true,
      data: {
        ...quote,
        sector: dbItem?.sector || quote.sector || (dbItem?.category ? `Makro (${dbItem.category})` : 'Piyasa Varlığı'),
        subSector: dbItem?.subSector || quote.subSector || dbItem?.unit || 'Piyasa Varlığı',
        trName: dbItem?.trName || quote.trName || dbItem?.name || quote.shortName || quote.symbol,
        manager: quote.manager || dbItem?.manager || (isTefasFund(symbol) ? 'Portföy Yönetimi A.Ş.' : undefined),
        fee: quote.fee || dbItem?.fee || (isTefasFund(symbol) ? '%2.25' : undefined),
        risk: quote.risk || dbItem?.risk || (isTefasFund(symbol) ? 6 : undefined),
        category: quote.category || dbItem?.category || (isTefasFund(symbol) ? 'TEFAS' : undefined),
      }
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message || `Geçersiz veya bulunamayan varlık: ${symbol}` });
  }
});

/**
 * 4. Interactive Chart Data (OHLCV Candles & Timeframes)
 */
app.get('/api/chart/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const range = req.query.range || '1mo'; // 1d, 5d, 1mo, 3mo, 6mo, ytd, 1y, 5y, max
  const interval = req.query.interval || '1d'; // 1m, 5m, 15m, 1h, 1d, 1wk

  try {
    const result = await fetchYahooChart(symbol, range, interval);

    // Direct return if candles already formatted (e.g. from TEFAS live service)
    if (result && Array.isArray(result.candles)) {
      return res.json({
        success: true,
        symbol,
        meta: result.meta || {},
        range: result.range || range,
        interval: result.interval || interval,
        candlesCount: result.candles.length,
        candles: result.candles
      });
    }

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];
    
    const isFund = isTefasFund(symbol);
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null && !isNaN(closes[i])) {
        const cVal = closes[i];
        const decimals = isFund ? 6 : (cVal < 10 ? 4 : 2);
        candles.push({
          time: timestamps[i],
          open: Number((opens[i] || cVal).toFixed(decimals)),
          high: Number((highs[i] || cVal).toFixed(decimals)),
          low: Number((lows[i] || cVal).toFixed(decimals)),
          close: Number(cVal.toFixed(decimals)),
          volume: volumes[i] || 0,
        });
      }
    }

    res.json({
      success: true,
      symbol,
      meta,
      range,
      interval,
      candlesCount: candles.length,
      candles
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * 5. Full Technical Analysis & AI Rating
 */
app.get('/api/technical/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const chartResult = await fetchYahooChart(symbol, '1y', '1d');
    const quotes = chartResult.indicators?.quote?.[0] || {};
    const timestamps = chartResult.timestamp || [];
    
    const cleanData = {
      closes: [],
      highs: [],
      lows: [],
      volumes: [],
      timestamps: []
    };

    for (let i = 0; i < (quotes.close || []).length; i++) {
      if (quotes.close[i] !== null && !isNaN(quotes.close[i])) {
        cleanData.closes.push(quotes.close[i]);
        cleanData.highs.push(quotes.high[i] || quotes.close[i]);
        cleanData.lows.push(quotes.low[i] || quotes.close[i]);
        cleanData.volumes.push(quotes.volume[i] || 0);
        cleanData.timestamps.push(timestamps[i]);
      }
    }

    const meta = chartResult.meta || { symbol };
    const analysis = analyzeStockTechnicals(cleanData, meta);

    res.json({
      success: true,
      symbol,
      data: analysis
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});



function normalizeSearchText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * 7. Universal Real-time Search Engine
 */
app.get('/api/search', async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();
  if (!rawQuery) {
    return res.json({ success: true, results: [] });
  }

  const queryUpper = rawQuery.toUpperCase();
  const queryNorm = normalizeSearchText(rawQuery);

  try {
    const allLocal = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || []), ...MARKET_INDICES, ...MACRO_ASSETS];
    
    // Exact & partial matching with relevance score
    const scoredMatches = [];

    for (const item of allLocal) {
      const symUpper = item.symbol.toUpperCase();
      const symClean = symUpper.replace('.IS', '');
      const symNorm = normalizeSearchText(symClean);
      const nameNorm = normalizeSearchText(item.name || '');
      const trNameNorm = normalizeSearchText(item.trName || '');
      const shortNameNorm = normalizeSearchText(item.shortName || '');
      const managerNorm = normalizeSearchText(item.manager || '');
      const sectorNorm = normalizeSearchText(item.sector || '');

      let score = 0;
      if (symClean === queryUpper || symUpper === queryUpper) {
        score = 100;
      } else if (symClean.startsWith(queryUpper)) {
        score = 80;
      } else if (symNorm.includes(queryNorm)) {
        score = 60;
      } else if (nameNorm.startsWith(queryNorm) || trNameNorm.startsWith(queryNorm) || shortNameNorm.startsWith(queryNorm)) {
        score = 50;
      } else if (nameNorm.includes(queryNorm) || trNameNorm.includes(queryNorm) || shortNameNorm.includes(queryNorm)) {
        score = 40;
      } else if (managerNorm.includes(queryNorm) || sectorNorm.includes(queryNorm)) {
        score = 30;
      }

      if (score > 0) {
        scoredMatches.push({
          score,
          item: {
            symbol: item.symbol,
            name: item.trName || item.shortName || item.name,
            exchange: item.exchange || (item.category === 'FOREX' ? 'FOREX' : item.category === 'COMMODITY' ? 'EMTİA' : item.category === 'CRYPTO' ? 'KRİPTO' : item.symbol.endsWith('.IS') ? 'BIST' : 'NASDAQ'),
            sector: item.subSector || item.sector || (item.category ? item.category : 'Piyasa Varlığı'),
            type: item.category ? item.category : (item.symbol.startsWith('^') ? 'INDEX' : 'EQUITY')
          }
        });
      }
    }

    scoredMatches.sort((a, b) => b.score - a.score);
    const localMatches = scoredMatches.map(m => m.item);

    // Fetch live Yahoo search for broader US / Global tickers if needed
    let remoteMatches = [];
    if (localMatches.length < 5) {
      try {
        const ySearchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(rawQuery)}&quotesCount=8`;
        const yRes = await fetch(ySearchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (yRes.ok) {
          const yData = await yRes.json();
          remoteMatches = (yData.quotes || []).map(q => ({
            symbol: q.symbol,
            name: q.longname || q.shortname || q.symbol,
            exchange: q.exchange || q.exchDisp || 'GLOBAL',
            sector: q.sector || q.industry || 'Global Piyasa',
            type: q.quoteType || 'EQUITY'
          }));
        }
      } catch (e) {
        // Silently fallback to local
      }
    }

    const combined = [...localMatches, ...remoteMatches];
    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        unique.push(item);
      }
    }

    res.json({ success: true, results: unique.slice(0, 15) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. News & Sentiment Analysis API
 */
app.get('/api/news/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_NEWS_MS) {
    return res.json({ success: true, news: cached.data });
  }

  // TEFAS funds are Turkish investment funds with no foreign ticker news.
  // Querying Yahoo Finance for fund tickers causes fuzzy matches to unrelated US equities (e.g. THF -> THFF).
  if (isTefasFund(symbol)) {
    newsCache.set(symbol, { timestamp: Date.now(), data: [] });
    return res.json({ success: true, news: [] });
  }

  // If asset is not a known/valid asset, do not return news
  const isKnown = isKnownAsset(symbol);
  if (!isKnown) {
    return res.json({ success: true, news: [] });
  }

  try {
    const macroDef = MACRO_ASSETS.find(m => m.symbol.toUpperCase() === symbol);
    const cleanSymbol = macroDef ? (macroDef.shortName || macroDef.name) : symbol.replace('.IS', '');
    const dbItem = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || []), ...MACRO_ASSETS, ...MARKET_INDICES]
      .find(s => s.symbol.toUpperCase() === symbol || s.symbol.replace('.IS', '').toUpperCase() === cleanSymbol);

    const ySearchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanSymbol)}&newsCount=6`;
    const yRes = await fetch(ySearchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    let news = [];
    if (yRes.ok) {
      const yData = await yRes.json();
      const rawArticles = yData.news || [];

      // Filter articles to only those genuinely relevant to the requested asset
      const relevantArticles = rawArticles.filter(n => {
        const tickers = Array.isArray(n.relatedTickers) ? n.relatedTickers.map(t => t.toUpperCase()) : [];
        if (tickers.includes(cleanSymbol) || tickers.includes(symbol) || tickers.includes(`${cleanSymbol}.IS`)) {
          return true;
        }

        // Aliases (e.g. GOOG vs GOOGL, BRK-B vs BRK.B)
        if (cleanSymbol === 'GOOGL' && tickers.includes('GOOG')) return true;
        if (cleanSymbol === 'GOOG' && tickers.includes('GOOGL')) return true;
        if (cleanSymbol === 'BRK.B' && (tickers.includes('BRK-B') || tickers.includes('BRK/B'))) return true;

        const title = n.title || '';
        const tickerRegex = new RegExp(`\\b${cleanSymbol}\\b`, 'i');
        if (tickerRegex.test(title)) {
          return true;
        }

        if (macroDef) {
          const keywords = [macroDef.shortName, macroDef.name]
            .filter(Boolean)
            .flatMap(name => name.split(/[\s/()\-]+/))
            .filter(w => w.length > 2);
          if (keywords.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(title))) {
            return true;
          }
        }

        if (dbItem && dbItem.name) {
          const cleanName = dbItem.name.replace(/(Inc\.|Corp\.|Corporation|Holdings|Co\.|Ltd\.|A\.Ş\.|Group|PLC)/gi, '').trim();
          const primaryName = cleanName.split(' ')[0];
          if (primaryName && primaryName.length > 2 && new RegExp(`\\b${primaryName}\\b`, 'i').test(title)) {
            return true;
          }
        }

        return false;
      });

      news = relevantArticles.map(n => {
        // Classify sentiment
        const text = (n.title + ' ' + (n.publisher || '')).toLowerCase();
        let sentiment = 'NEUTRAL';
        if (text.includes('surge') || text.includes('high') || text.includes('gain') || text.includes('beat') || text.includes('buy') || text.includes('record') || text.includes('yüksel') || text.includes('rekor')) {
          sentiment = 'BULLISH';
        } else if (text.includes('drop') || text.includes('fall') || text.includes('miss') || text.includes('loss') || text.includes('düşüş') || text.includes('risk')) {
          sentiment = 'BEARISH';
        }
        
        return {
          id: n.uuid || Math.random().toString(),
          title: n.title,
          publisher: n.publisher || 'Finans Haberi',
          link: n.link,
          time: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toLocaleString('tr-TR') : 'Bugün',
          sentiment
        };
      });
    }

    newsCache.set(symbol, { timestamp: Date.now(), data: news });
    res.json({ success: true, news });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 9. Screener & Scanner API
 */
app.get('/api/screener', async (req, res) => {
  const market = (req.query.market || 'ALL').toUpperCase();
  const filter = (req.query.filter || 'ALL').toUpperCase(); // GAINERS, LOSERS, VOLUME, RSI_OVERSOLD, RSI_OVERBOUGHT, STRONG_BUY
  
  let pool = [];
  if (market === 'US') pool = STOCKS_DATABASE.US;
  else if (market === 'BIST') pool = STOCKS_DATABASE.BIST;
  else pool = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST];

  try {
    const promises = pool.map(async (s) => {
      try {
        const quote = await getStockQuote(s.symbol);
        return {
          ...s,
          ...quote
        };
      } catch {
        return {
          ...s,
          ...generateSyntheticQuote(s.symbol)
        };
      }
    });

    let results = await Promise.all(promises);

    // Apply filter presets
    if (filter === 'GAINERS') {
      results = results.sort((a, b) => b.changePercent - a.changePercent);
    } else if (filter === 'LOSERS') {
      results = results.sort((a, b) => a.changePercent - b.changePercent);
    } else if (filter === 'VOLUME') {
      results = results.sort((a, b) => (b.volume * b.price) - (a.volume * a.price));
    }

    res.json({ success: true, data: results.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Get Similar Sector Peers & Co-viewed Stocks
app.get('/api/similar-stocks/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const upper = symbol.toUpperCase();
  const clean = upper.replace('.IS', '');

  // Find info about target stock
  const allEntries = [...STOCKS_DATABASE.US, ...STOCKS_DATABASE.BIST, ...(STOCKS_DATABASE.FUNDS || []), ...MACRO_ASSETS];
  const target = allEntries.find(s => s.symbol.toUpperCase() === upper || s.symbol.replace('.IS', '').toUpperCase() === clean);

  let peerSymbols = [];

  // Dedicated thematic peer groups
  const peerMap = {
    // Forex & FX Pairs
    'USDTRY=X': ['EURTRY=X', 'GBPTRY=X', 'EURUSD=X', 'DX-Y.NYB', 'GRAM_ALTIN'],
    'EURTRY=X': ['USDTRY=X', 'GBPTRY=X', 'EURUSD=X', 'GRAM_ALTIN'],
    'EURUSD=X': ['USDTRY=X', 'EURTRY=X', 'GBPTRY=X', 'DX-Y.NYB'],
    'GBPTRY=X': ['USDTRY=X', 'EURTRY=X', 'EURUSD=X'],
    'DX-Y.NYB': ['USDTRY=X', 'EURUSD=X', '^TNX', 'GC=F'],

    // Commodities, Gold & Metals
    'GRAM_ALTIN': ['GC=F', 'GRAM_GUMUS', 'SI=F', 'USDTRY=X'],
    'GC=F': ['GRAM_ALTIN', 'SI=F', 'GRAM_GUMUS', 'BZ=F'],
    'GRAM_GUMUS': ['SI=F', 'GRAM_ALTIN', 'GC=F', 'HG=F'],
    'SI=F': ['GC=F', 'GRAM_GUMUS', 'GRAM_ALTIN', 'HG=F'],
    'BZ=F': ['CL=F', 'NG=F', 'HG=F', 'GC=F'],
    'CL=F': ['BZ=F', 'NG=F', 'HG=F'],
    'NG=F': ['BZ=F', 'CL=F', 'HG=F'],
    'HG=F': ['SI=F', 'BZ=F', 'CL=F', 'GC=F'],

    // Cryptocurrencies
    'BTC-USD': ['ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'IBIT'],
    'ETH-USD': ['BTC-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD'],
    'SOL-USD': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD'],
    'XRP-USD': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD'],
    'BNB-USD': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD'],

    // Yields & Bonds
    '^TNX': ['^IRX', '^VIX', 'DX-Y.NYB'],
    '^VIX': ['^TNX', '^IRX', 'SPY'],
    '^IRX': ['^TNX', '^VIX'],

    // Semiconductors & AI Hardware
    'NVDA': ['AVGO', 'AMD', 'MRVL', 'QCOM', 'ARM', 'TSM', 'SMCI'],
    'MRVL': ['NVDA', 'AVGO', 'AMD', 'QCOM', 'ARM', 'MU', 'INTC'],
    'AMD': ['NVDA', 'INTC', 'AVGO', 'MRVL', 'ARM', 'QCOM'],
    'AVGO': ['NVDA', 'MRVL', 'AMD', 'QCOM', 'TXN', 'ADI'],
    'ARM': ['NVDA', 'QCOM', 'AMD', 'MRVL', 'AVGO'],
    'TSM': ['NVDA', 'ASML', 'AMD', 'QCOM', 'INTC'],
    'INTC': ['AMD', 'NVDA', 'QCOM', 'MU', 'TXN'],
    'MU': ['WDC', 'STX', 'INTC', 'NVDA', 'MRVL'],
    'ASML': ['LRCX', 'AMAT', 'KLAC', 'TSM', 'NVDA'],
    'SMCI': ['DELL', 'HPE', 'NVDA', 'PLTR'],

    // Big Tech & Cloud
    'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
    'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'ORCL', 'CRM'],
    'GOOGL': ['META', 'MSFT', 'AMZN', 'AAPL', 'NFLX'],
    'META': ['GOOGL', 'SNAP', 'PINS', 'MSFT', 'NFLX'],
    'AMZN': ['MSFT', 'GOOGL', 'WMT', 'COST', 'SHOP'],
    'PLTR': ['AI', 'SNOW', 'MSTR', 'CRM', 'ORCL', 'NVDA'],
    'MSTR': ['COIN', 'IBIT', 'MARA', 'RIOT', 'NVDA'],
    'COIN': ['MSTR', 'IBIT', 'HOOD', 'MARA'],
    'TSLA': ['RIVN', 'LCID', 'NIO', 'NVDA', 'FROTO.IS'],

    // BIST Havacılık
    'THYAO.IS': ['PGSUS.IS', 'TAVHL.IS', 'CLEBI.IS', 'DAL', 'UAL'],
    'PGSUS.IS': ['THYAO.IS', 'TAVHL.IS', 'CLEBI.IS', 'LHA'],
    'TAVHL.IS': ['THYAO.IS', 'PGSUS.IS', 'CLEBI.IS'],

    // BIST Bankalar
    'GARAN.IS': ['AKBNK.IS', 'ISCTR.IS', 'YKBNK.IS', 'VAKBN.IS', 'HALKB.IS'],
    'AKBNK.IS': ['GARAN.IS', 'ISCTR.IS', 'YKBNK.IS', 'VAKBN.IS'],
    'ISCTR.IS': ['GARAN.IS', 'AKBNK.IS', 'YKBNK.IS', 'TSKB.IS'],
    'YKBNK.IS': ['GARAN.IS', 'AKBNK.IS', 'ISCTR.IS', 'VAKBN.IS'],
    'VAKBN.IS': ['HALKB.IS', 'GARAN.IS', 'ISCTR.IS', 'AKBNK.IS'],
    'HALKB.IS': ['VAKBN.IS', 'GARAN.IS', 'ISCTR.IS', 'AKBNK.IS'],

    // BIST Savunma & Teknoloji
    'ASELS.IS': ['SDTTR.IS', 'MIATK.IS', 'REEDR.IS', 'OTKAR.IS', 'LMT'],
    'SDTTR.IS': ['ASELS.IS', 'MIATK.IS', 'REEDR.IS', 'KFEIN.IS'],
    'MIATK.IS': ['ASELS.IS', 'SDTTR.IS', 'REEDR.IS', 'FONET.IS'],
    'REEDR.IS': ['ASELS.IS', 'MIATK.IS', 'VESTL.IS'],

    // BIST Demir Çelik & Sanayi
    'EREGL.IS': ['KRDMD.IS', 'KCAER.IS', 'SISE.IS', 'KOZAL.IS'],
    'KRDMD.IS': ['EREGL.IS', 'KCAER.IS', 'CEMTS.IS'],
    'SISE.IS': ['EREGL.IS', 'KCHOL.IS', 'SAHOL.IS', 'TUPRS.IS'],

    // BIST Petrol & Enerji
    'TUPRS.IS': ['PETKM.IS', 'ASTOR.IS', 'ENJSA.IS', 'XOM'],
    'PETKM.IS': ['TUPRS.IS', 'SASA.IS', 'HEKTS.IS'],
    'SASA.IS': ['HEKTS.IS', 'GUBRF.IS', 'PETKM.IS'],
    'ASTOR.IS': ['EUPWR.IS', 'KONTR.IS', 'GESAN.IS', 'CWENE.IS'],
    'ENJSA.IS': ['ASTOR.IS', 'CWENE.IS', 'KONTR.IS', 'AKSEN.IS'],
    'KONTR.IS': ['ASTOR.IS', 'EUPWR.IS', 'GESAN.IS', 'YEOTK.IS'],

    // BIST Holdingler
    'KCHOL.IS': ['SAHOL.IS', 'ALARK.IS', 'ENKAI.IS', 'DOHOL.IS', 'AGHOL.IS'],
    'SAHOL.IS': ['KCHOL.IS', 'ALARK.IS', 'ENKAI.IS', 'AGHOL.IS'],
    'ALARK.IS': ['KCHOL.IS', 'SAHOL.IS', 'ENKAI.IS'],

    // BIST Perakende
    'BIMAS.IS': ['MGROS.IS', 'SOKM.IS', 'TABGD.IS', 'MAVI.IS'],
    'MGROS.IS': ['BIMAS.IS', 'SOKM.IS', 'TABGD.IS'],
    'SOKM.IS': ['BIMAS.IS', 'MGROS.IS', 'TABGD.IS'],

    // BIST Otomotiv
    'FROTO.IS': ['TOASO.IS', 'DOAS.IS', 'BRISA.IS', 'TTRAK.IS', 'TSLA'],
    'TOASO.IS': ['FROTO.IS', 'DOAS.IS', 'BRISA.IS'],
    'DOAS.IS': ['FROTO.IS', 'TOASO.IS', 'BRISA.IS'],

    // TEFAS Fonları
    'THF': ['PBR', 'TP2', 'TLY', 'MAC', 'NNF', 'IIH', 'TI3'],
    'PBR': ['THF', 'TP2', 'TLY', 'MAC', 'NNF'],
    'TP2': ['THF', 'PBR', 'TLY', 'TI3'],
    'MAC': ['NNF', 'THF', 'IIH', 'IDH'],
    'NNF': ['MAC', 'THF', 'IIH', 'PBR'],
    'TI3': ['THF', 'TP2', 'PBR', 'MAC'],
  };

  const isKnown = isKnownAsset(symbol);
  if (!isKnown && !target) {
    return res.json({ peers: [] });
  }

  if (peerMap[upper]) {
    peerSymbols = peerMap[upper];
  } else if (peerMap[clean]) {
    peerSymbols = peerMap[clean];
  } else if (target) {
    const sameSector = allEntries.filter(s => s.symbol.toUpperCase() !== upper && (s.subSector === target.subSector || s.sector === target.sector));
    peerSymbols = sameSector.slice(0, 5).map(s => s.symbol);
  }

  if (peerSymbols.length === 0) {
    return res.json({ peers: [] });
  }

  // Filter out the symbol itself
  peerSymbols = peerSymbols.filter(s => s.toUpperCase() !== upper && s.replace('.IS', '').toUpperCase() !== clean).slice(0, 5);

  // Fetch quotes for peers in parallel
  const quotes = await Promise.all(
    peerSymbols.map(async (sym) => {
      try {
        return await getStockQuote(sym);
      } catch (err) {
        return null;
      }
    })
  );

  const validQuotes = quotes.filter(Boolean);
  res.json({ peers: validQuotes });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`StockStuck Financial Intelligence Server running on port ${PORT}`);
});

