export interface StockQuote {
  symbol: string;
  shortName: string;
  longName: string;
  trName?: string;
  currency: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  marketCap: number;
  timestamp: number;
  sector?: string;
  subSector?: string;
  category?: string;
  manager?: string;
  fee?: string;
  risk?: number;
  pricingType?: 'DAILY_NAV' | 'REALTIME';
  navDate?: string;
  investorCount?: number;
  returns?: TefasReturns;
}

export interface TefasReturns {
  return1w: number;
  return1m: number;
  return3m: number;
  return6m: number;
  returnYtd: number;
  return1y: number;
  return3y: number | null;
  return5y: number | null;
  categoryRank?: string;
  categoryAvg1m?: number;
}

export interface MarketIndexItem extends StockQuote {
  displayName: string;
  market: 'US' | 'TR' | 'FX' | 'CRYPTO' | 'COMMODITY';
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataResponse {
  success: boolean;
  symbol: string;
  meta: any;
  range: string;
  interval: string;
  candlesCount: number;
  candles: Candle[];
}

export interface TechnicalIndicatorValue {
  value: number;
  signal: string;
}

export interface MovingAverageItem {
  name: string;
  value: number | null;
  signal: string;
  diffPercent?: number;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface TechnicalAnalysisData {
  score: number;
  rating: 'GÜÇLÜ AL' | 'AL' | 'NÖTR' | 'SAT' | 'GÜÇLÜ SAT';
  ratingEn: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  ratingColor: string;
  badgeBg: string;
  currentPrice: number;
  indicators: {
    rsi: TechnicalIndicatorValue;
    macd: {
      macd: number;
      signal: number | string;
      histogram: number;
    };
    stochastic: {
      k: number;
      d: number;
      signal: string;
    };
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
      bandwidth: number;
      percentB: number;
    };
  };
  movingAverages: {
    summary: { buy: number; sell: number };
    list: MovingAverageItem[];
  };
  oscillators: {
    summary: { buy: number; sell: number; neutral: number };
  };
  pivots: PivotPoints;
  aiAnalysis: {
    trend: string;
    score: number;
    rating: string;
    breakoutTarget: number;
    stopLoss: number;
    riskReward: string;
    isGoldenCross: boolean;
    summaryTr: string;
  };
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBookTrade {
  time: string;
  price: number;
  size: number;
  type: 'BUY' | 'SELL';
}

export interface OrderBookData {
  symbol: string;
  spread: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  recentTrades: OrderBookTrade[];
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  time: string;
  sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

export interface HeatmapSector {
  name: string;
  totalMarketCap: number;
  stocks: StockQuote[];
}

export interface HeatmapResponse {
  success: boolean;
  market: 'US' | 'BIST' | 'FUNDS';
  totalStocks: number;
  sectors: HeatmapSector[];
  stocks: StockQuote[];
}

export interface SearchResultItem {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  type: string;
}

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  avgBuyPrice: number;
  buyDate: string;
  currency: string;
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  date: string;
  realizedPnl?: number;
  currency: string;
}

export interface FundItem extends StockQuote {
  name?: string;
  manager?: string;
  fee?: string;
  risk?: number;
  category?: 'ETF' | 'TEFAS' | 'CRYPTO' | 'COMMODITY';
  nav?: number;
}

export type MacroCategory = 'FOREX' | 'COMMODITY' | 'CRYPTO' | 'BONDS';

export interface MacroAssetItem extends StockQuote {
  name?: string;
  displayName: string;
  category: MacroCategory;
  unit: string;
  descriptionTr?: string;
  isHero?: boolean;
}

export interface MacroOverviewResponse {
  success: boolean;
  timestamp: number;
  heroAssets: MacroAssetItem[];
  categories: {
    FOREX: MacroAssetItem[];
    COMMODITY: MacroAssetItem[];
    CRYPTO: MacroAssetItem[];
    BONDS: MacroAssetItem[];
  };
  assets: MacroAssetItem[];
  converterRates: {
    TRY: number;
    USD: number;
    EUR: number;
    GBP: number;
    GRAM_ALTIN: number;
    BTC: number;
    ETH: number;
    [key: string]: number;
  };
}

// ==========================================
// 1. ALARMS & NOTIFICATIONS
// ==========================================
export type AlertFrequency = 'ONCE' | 'HOURLY' | 'DAILY' | 'ALWAYS';

export type AlertType =
  | 'PRICE_TARGET'
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'CHANGE_PCT_ABOVE'
  | 'CHANGE_PCT_BELOW'
  | 'MACD_BULLISH'
  | 'MACD_BEARISH';

export interface StockAlert {
  id: string;
  symbol: string;
  name?: string;
  type?: AlertType;
  targetValue: number;
  currentValue?: number;
  initialPrice?: number;
  frequency?: AlertFrequency;
  createdAt: string;
  lastTriggered?: string;
  isActive: boolean;
  notes?: string;
  soundEnabled: boolean;
  currency?: string;
}

export interface AppNotification {
  id: string;
  alertId?: string;
  symbol: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'ALERT' | 'INFO' | 'TRADE' | 'SYSTEM';
  severity?: 'success' | 'warning' | 'info' | 'error';
  targetValue?: number;
  currentValue?: number;
}

// ==========================================
// 2. MULTIPLE WATCHLISTS
// ==========================================
export interface WatchlistGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  symbols: string[];
  createdAt: string;
  isDefault?: boolean;
}

// ==========================================
// 3. MONEY FLOW & INSTITUTIONAL TAKAS
// ==========================================
export interface InstitutionalBrokerFlow {
  brokerName: string;
  buyVolumeTRY: number;
  sellVolumeTRY: number;
  netVolumeTRY: number;
  sharePercent: number;
  type: 'BUYER' | 'SELLER';
  logoColor?: string;
}

export interface MoneyFlowStockItem {
  symbol: string;
  name: string;
  trName?: string;
  exchange: string;
  currency: string;
  price: number;
  changePercent: number;
  netFlow: number; // Positive = inflow, Negative = outflow
  totalVolumeTRY: number;
  inflowVolume: number;
  outflowVolume: number;
  inflowRatio: number; // 0 - 100 percentage
  largeBlockTradesCount: number;
  institutionalPowerIndex: number; // 0 - 100
  sector: string;
}

export interface BlockTradeItem {
  id: string;
  time: string;
  symbol: string;
  price: number;
  shares: number;
  totalValue: number;
  currency: string;
  side: 'BUY' | 'SELL';
  broker?: string;
}

export interface SectorMoneyFlow {
  sector: string;
  netFlow: number;
  inflowRatio: number;
  stockCount: number;
}

export interface MoneyFlowData {
  market: 'BIST' | 'US';
  timestamp: number;
  totalMarketInflow: number;
  totalMarketOutflow: number;
  netMarketFlow: number;
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  institutionalBuyRatio: number;
  retailBuyRatio: number;
  topInflowStocks: MoneyFlowStockItem[];
  topOutflowStocks: MoneyFlowStockItem[];
  topBrokers: InstitutionalBrokerFlow[];
  blockTrades: BlockTradeItem[];
  sectorFlows: SectorMoneyFlow[];
}

