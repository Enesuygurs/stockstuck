import {
  StockQuote,
  MarketIndexItem,
  ChartDataResponse,
  TechnicalAnalysisData,
  NewsItem,
  HeatmapResponse,
  SearchResultItem,
  MacroOverviewResponse
} from '../types/stock';

const API_BASE = '/api';

export const api = {
  /**
   * Fetch Real-time Market Overview Indices (NASDAQ, S&P 500, BIST 100, etc.)
   */
  async getMarketOverview(): Promise<MarketIndexItem[]> {
    try {
      const res = await fetch(`${API_BASE}/market-overview`);
      if (!res.ok) throw new Error('Market overview fetch failed');
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('Fallback market overview', err);
      return [];
    }
  },

  /**
   * Fetch Heatmap Sectors and Stocks / Funds
   */
  async getHeatmap(market: 'US' | 'BIST' | 'FUNDS' = 'US'): Promise<HeatmapResponse> {
    const res = await fetch(`${API_BASE}/heatmap/${market}`);
    if (!res.ok) throw new Error(`Heatmap fetch failed for ${market}`);
    return res.json();
  },

  /**
   * Fetch Single Stock Detailed Quote
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const res = await fetch(`${API_BASE}/quote/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Quote fetch failed for ${symbol}`);
    const data = await res.json();
    return data.data;
  },

  /**
   * Fetch Interactive Chart History (OHLCV)
   */
  async getChartData(symbol: string, range = '1mo', interval = '1d'): Promise<ChartDataResponse> {
    const res = await fetch(`${API_BASE}/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
    if (!res.ok) throw new Error(`Chart fetch failed for ${symbol}`);
    return res.json();
  },

  /**
   * Fetch Technical Analysis & AI Rating
   */
  async getTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysisData> {
    const res = await fetch(`${API_BASE}/technical/${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Technical analysis fetch failed for ${symbol}`);
    const data = await res.json();
    return data.data;
  },


  /**
   * Search Tickers & Companies
   */
  async search(query: string): Promise<SearchResultItem[]> {
    if (!query.trim()) return [];
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  },

  /**
   * Fetch News Stories & Sentiment
   */
  async getNews(symbol: string): Promise<NewsItem[]> {
    try {
      const res = await fetch(`${API_BASE}/news/${encodeURIComponent(symbol)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.news || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch Screener Stocks
   */
  async getScreener(market = 'ALL', filter = 'ALL'): Promise<StockQuote[]> {
    const res = await fetch(`${API_BASE}/screener?market=${market}&filter=${filter}`);
    if (!res.ok) throw new Error('Screener fetch failed');
    const data = await res.json();
    return data.data || [];
  },

  /**
   * Fetch Comprehensive Funds & ETFs (Global ETFs & TEFAS)
   */
  async getFunds(category = 'ALL'): Promise<any[]> {
    const res = await fetch(`${API_BASE}/funds?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error('Funds fetch failed');
    const data = await res.json();
    return data.data || [];
  },

  /**
   * Fetch Similar Sector Peers & Co-viewed Stocks
   */
  async getSimilarStocks(symbol: string): Promise<StockQuote[]> {
    try {
      const res = await fetch(`${API_BASE}/similar-stocks/${encodeURIComponent(symbol)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.peers || [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch Macro Markets, Currencies, Commodities, Crypto & Bonds Overview
   */
  async getMacroOverview(): Promise<MacroOverviewResponse> {
    const res = await fetch(`${API_BASE}/macro`);
    if (!res.ok) throw new Error('Macro overview fetch failed');
    return res.json();
  }
};

