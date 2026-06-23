import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StockQuote, PortfolioPosition } from '../../types/stock';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Trash2,
  Plus,
  Edit3,
  PieChart,
  LineChart,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Check,
  X,
  Search,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Banknote,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Bell,
  FolderPlus,
  Pencil,
  Sparkles,
  Coins,
  Rocket,
  Globe,
  Briefcase,
  Building2,
  History,
  Award
} from 'lucide-react';

const COLORS = [
  '#10b981', // Emerald
  '#38bdf8', // Sky
  '#f59e0b', // Amber
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
];

type PositionSortField = 'symbol' | 'shares' | 'avgBuyPrice' | 'curPrice' | 'value' | 'weight' | 'change24hPct' | 'pnl';
type TradeSortField = 'type' | 'symbol' | 'shares' | 'price' | 'total' | 'realizedPnl' | 'date';

export const PortfolioView: React.FC = () => {
  const {
    language,
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    activeWatchlist,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    watchlist,
    portfolio,
    tradeHistory,
    addPosition,
    sellPosition,
    removePosition,
    getPosition,
    selectStock,
    openAlerts,
    setIsNotificationsDrawerOpen
  } = useApp();

  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, StockQuote>>({});
  const [portfolioQuotes, setPortfolioQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Watchlist custom group creation & search state
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isEditingListName, setIsEditingListName] = useState(false);
  const [editListName, setEditListName] = useState('');
  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [quickAddResults, setQuickAddResults] = useState<any[]>([]);


  // Sorting state for Positions & Trade History
  const [posSortField, setPosSortField] = useState<PositionSortField>('value');
  const [posSortOrder, setPosSortOrder] = useState<'asc' | 'desc'>('desc');

  const [tradeSortField, setTradeSortField] = useState<TradeSortField>('date');
  const [tradeSortOrder, setTradeSortOrder] = useState<'asc' | 'desc'>('desc');

  const handlePosSort = (field: PositionSortField) => {
    if (posSortField === field) {
      setPosSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setPosSortField(field);
      setPosSortOrder(field === 'symbol' ? 'asc' : 'desc');
    }
  };

  const handleTradeSort = (field: TradeSortField) => {
    if (tradeSortField === field) {
      setTradeSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTradeSortField(field);
      setTradeSortOrder(field === 'symbol' || field === 'type' ? 'asc' : 'desc');
    }
  };

  const renderPosSortIcon = (field: PositionSortField) => {
    if (posSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition shrink-0" />;
    }
    return posSortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    );
  };

  const renderTradeSortIcon = (field: TradeSortField) => {
    if (tradeSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition shrink-0" />;
    }
    return tradeSortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    );
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'BUY' | 'SELL'>('BUY');
  const [modalInputType, setModalInputType] = useState<'SHARES' | 'CASH'>('SHARES');
  const [modalSymbol, setModalSymbol] = useState('NVDA');
  const [modalShares, setModalShares] = useState<string>('10');
  const [modalCash, setModalCash] = useState<string>('');
  const [modalPrice, setModalPrice] = useState<number | ''>('');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);

  // Symbol Verification State
  const [isValidatingSymbol, setIsValidatingSymbol] = useState<boolean>(false);
  const [symbolValidated, setSymbolValidated] = useState<boolean | null>(true);
  const [validatedStockInfo, setValidatedStockInfo] = useState<{
    symbol: string;
    name: string;
    exchange: string;
    price: number;
    currency: string;
    changePercent?: number;
  } | null>(null);
  const [symbolError, setSymbolError] = useState<string | null>(null);

  // Chart Timeframe
  const [equityTimeframe, setEquityTimeframe] = useState<'1W' | '1M' | '6M' | '1Y'>('1M');
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  const equityCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    const wMap: Record<string, StockQuote> = {};
    const pMap: Record<string, StockQuote> = {};

    await Promise.all([
      ...watchlist.map(async (sym) => {
        try {
          wMap[sym] = await api.getStockQuote(sym);
        } catch (e) {
          console.warn('Watchlist quote error:', sym, e);
        }
      }),
      ...portfolio.map(async (pos) => {
        try {
          pMap[pos.symbol] = await api.getStockQuote(pos.symbol);
        } catch (e) {
          console.warn('Portfolio quote error:', pos.symbol, e);
        }
      })
    ]);

    setWatchlistQuotes(wMap);
    setPortfolioQuotes(pMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000);
    return () => clearInterval(interval);
  }, [watchlist, portfolio]);

  // Autocomplete search inside modal
  useEffect(() => {
    if (!modalSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(modalSearchQuery);
        setSearchResults(res);
      } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [modalSearchQuery]);

  // Real-time symbol existence validation
  useEffect(() => {
    if (!isModalOpen) return;
    const sym = modalSymbol.trim().toUpperCase();
    if (!sym) {
      setSymbolValidated(null);
      setValidatedStockInfo(null);
      setSymbolError(null);
      setIsValidatingSymbol(false);
      return;
    }

    let isCancelled = false;
    setIsValidatingSymbol(true);
    setSymbolError(null);

    const timer = setTimeout(async () => {
      try {
        let quote: StockQuote | null = null;
        let resolvedSym = sym;

        try {
          quote = await api.getStockQuote(resolvedSym);
        } catch {
          if (!resolvedSym.includes('.') && !resolvedSym.startsWith('^')) {
            try {
              resolvedSym = `${sym}.IS`;
              quote = await api.getStockQuote(resolvedSym);
            } catch {
              quote = null;
            }
          }
        }

        if (isCancelled) return;

        if (quote && typeof quote.price === 'number' && !isNaN(quote.price) && quote.price > 0) {
          setSymbolValidated(true);
          setValidatedStockInfo({
            symbol: quote.symbol || resolvedSym,
            name: quote.trName || quote.longName || quote.shortName || resolvedSym,
            exchange: quote.exchange || (resolvedSym.endsWith('.IS') ? 'BIST' : 'NASDAQ'),
            price: quote.price,
            currency: quote.currency || (resolvedSym.endsWith('.IS') ? 'TRY' : 'USD'),
            changePercent: quote.changePercent
          });
          setSymbolError(null);
          // If modal price is empty, prefill with market price
          setModalPrice(prev => (prev === '' ? quote!.price : prev));
        } else {
          setSymbolValidated(false);
          setValidatedStockInfo(null);
          setSymbolError(`"${modalSymbol}" adında bir borsa varlığı bulunamadı.`);
        }
      } catch {
        if (isCancelled) return;
        setSymbolValidated(false);
        setValidatedStockInfo(null);
        setSymbolError(`"${modalSymbol}" adında bir borsa varlığı bulunamadı.`);
      } finally {
        if (!isCancelled) {
          setIsValidatingSymbol(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [modalSymbol, isModalOpen]);

  const [usdTryRate, setUsdTryRate] = useState<number>(38.45);
  const [equityPoints, setEquityPoints] = useState<{ timestamp: number; date: string; value: number; pnlPct: number }[]>([]);
  const [equityLoading, setEquityLoading] = useState<boolean>(false);
  const [hoverEquityIdx, setHoverEquityIdx] = useState<number | null>(null);

  // Fetch live USD/TRY rate
  useEffect(() => {
    const fetchFx = async () => {
      try {
        const q = await api.getStockQuote('TRY=X');
        if (q && q.price > 10) {
          setUsdTryRate(q.price);
        }
      } catch {
        // Keep default ~38.45
      }
    };
    fetchFx();
    const interval = setInterval(fetchFx, 60000);
    return () => clearInterval(interval);
  }, []);

  // Portfolio calculations
  const portfolioStats = useMemo(() => {
    let totalUsdCost = 0;
    let totalUsdValue = 0;
    let totalUsdDailyChange = 0;

    let totalTryCost = 0;
    let totalTryValue = 0;
    let totalTryDailyChange = 0;

    const enrichedPositions = portfolio.map((pos) => {
      const q = portfolioQuotes[pos.symbol];
      const isTRY = pos.currency === 'TRY' || pos.symbol.endsWith('.IS');
      const curPrice = q ? q.price : pos.avgBuyPrice;
      const change24hPct = q ? q.changePercent : 0;
      const change24hVal = (curPrice * (change24hPct / 100)) * pos.shares;

      const cost = pos.avgBuyPrice * pos.shares;
      const value = curPrice * pos.shares;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

      if (isTRY) {
        totalTryCost += cost;
        totalTryValue += value;
        totalTryDailyChange += change24hVal;
      } else {
        totalUsdCost += cost;
        totalUsdValue += value;
        totalUsdDailyChange += change24hVal;
      }

      return {
        ...pos,
        curPrice,
        quote: q,
        isTRY,
        cost,
        value,
        pnl,
        pnlPct,
        change24hPct,
        change24hVal,
      };
    });

    // Asset allocation percentages
    const totalUsdPortValue = totalUsdValue || 1;
    const totalTryPortValue = totalTryValue || 1;

    const positionsWithWeights = enrichedPositions.map((p) => {
      const weight = p.isTRY ? (p.value / totalTryPortValue) * 100 : (p.value / totalUsdPortValue) * 100;
      return {
        ...p,
        weight,
      };
    }).sort((a, b) => b.value - a.value);

    // Best performer
    let bestPerformer = positionsWithWeights.length > 0 ? positionsWithWeights[0] : null;
    positionsWithWeights.forEach(p => {
      if (bestPerformer && p.pnlPct > bestPerformer.pnlPct) {
        bestPerformer = p;
      }
    });

    // Sector allocation
    const sectorMap: Record<string, number> = {};
    positionsWithWeights.forEach(p => {
      const sec = p.quote?.subSector || p.quote?.sector || (p.isTRY ? 'BIST Hisse' : 'Global Hisse');
      sectorMap[sec] = (sectorMap[sec] || 0) + (p.isTRY ? p.value : p.value * usdTryRate);
    });

    const totalAllValueTRY = (totalUsdValue * usdTryRate) + totalTryValue;
    const totalAllCostTRY = (totalUsdCost * usdTryRate) + totalTryCost;
    const totalAllPnlTRY = totalAllValueTRY - totalAllCostTRY;
    const totalAllPnlPct = totalAllCostTRY > 0 ? (totalAllPnlTRY / totalAllCostTRY) * 100 : 0;

    const sectorBreakdown = Object.entries(sectorMap).map(([name, val]) => ({
      name,
      value: val,
      pct: totalAllValueTRY > 0 ? (val / totalAllValueTRY) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    const totalUsdPnl = totalUsdValue - totalUsdCost;
    const totalUsdPnlPct = totalUsdCost > 0 ? (totalUsdPnl / totalUsdCost) * 100 : 0;

    const totalTryPnl = totalTryValue - totalTryCost;
    const totalTryPnlPct = totalTryCost > 0 ? (totalTryPnl / totalTryCost) * 100 : 0;

    return {
      positions: positionsWithWeights,
      totalUsdCost,
      totalUsdValue,
      totalUsdPnl,
      totalUsdPnlPct,
      totalUsdDailyChange,
      totalTryCost,
      totalTryValue,
      totalTryPnl,
      totalTryPnlPct,
      totalTryDailyChange,
      totalAllValueTRY,
      totalAllCostTRY,
      totalAllPnlTRY,
      totalAllPnlPct,
      bestPerformer,
      sectorBreakdown,
    };
  }, [portfolio, portfolioQuotes, usdTryRate]);

  const sortedPositions = useMemo(() => {
    return [...portfolioStats.positions].sort((a, b) => {
      let valA: any = a[posSortField];
      let valB: any = b[posSortField];
      if (posSortField === 'symbol') {
        valA = a.symbol;
        valB = b.symbol;
        return posSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return posSortOrder === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
    });
  }, [portfolioStats.positions, posSortField, posSortOrder]);

  const sortedTrades = useMemo(() => {
    return [...tradeHistory].sort((a, b) => {
      if (tradeSortField === 'total') {
        const totA = a.shares * a.price;
        const totB = b.shares * b.price;
        return tradeSortOrder === 'asc' ? totA - totB : totB - totA;
      }
      let valA: any = a[tradeSortField];
      let valB: any = b[tradeSortField];
      if (tradeSortField === 'date' || tradeSortField === 'symbol' || tradeSortField === 'type') {
        valA = String(valA || '');
        valB = String(valB || '');
        return tradeSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return tradeSortOrder === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
    });
  }, [tradeHistory, tradeSortField, tradeSortOrder]);

  // Real Multi-Asset Historical Equity Curve Fetcher
  useEffect(() => {
    if (portfolio.length === 0) {
      setEquityPoints([]);
      return;
    }

    const range = equityTimeframe === '1W' ? '5d' : equityTimeframe === '1M' ? '1mo' : equityTimeframe === '6M' ? '6mo' : '1y';

    const loadRealEquityCurve = async () => {
      setEquityLoading(true);
      try {
        const chartPromises = portfolio.map(pos => api.getChartData(pos.symbol, range, '1d'));
        const chartResults = await Promise.all(chartPromises);

        // Group all candles by YYYY-MM-DD for each symbol for 100% calendar alignment
        const symbolDateMap: Record<string, Record<string, number>> = {};
        const allDatesSet = new Set<string>();
        const dateTimestampMap: Record<string, number> = {};

        portfolio.forEach((pos, posIdx) => {
          const chart = chartResults[posIdx];
          const cList = chart?.candles || [];
          symbolDateMap[pos.symbol] = {};

          cList.forEach(c => {
            const dateKey = new Date(c.time * 1000).toISOString().split('T')[0];
            symbolDateMap[pos.symbol][dateKey] = c.close;
            allDatesSet.add(dateKey);
            dateTimestampMap[dateKey] = c.time;
          });
        });

        // Sorted unique calendar dates
        const sortedDates = Array.from(allDatesSet).sort();

        // Find the earliest buy date across all positions
        const buyDates = portfolio.map(p => p.buyDate || new Date().toISOString().split('T')[0]).sort();
        const earliestBuyDate = buyDates[0] || new Date().toISOString().split('T')[0];

        // Filter dates: the portfolio curve ONLY starts from the day the user made their first purchase!
        const validDates = sortedDates.filter((d: string) => d >= earliestBuyDate);

        // If no trading days occurred yet since buyDate (e.g. bought today after hours or on weekend)
        if (validDates.length === 0) {
          validDates.push(sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0]);
        }

        const points: { timestamp: number; date: string; value: number; pnlPct: number }[] = [];
        const totalInitialCostTRY = portfolioStats.totalAllCostTRY || 1;

        // Carry forward previous close if market was closed on that day
        const lastKnownPrice: Record<string, number> = {};
        portfolio.forEach(pos => {
          lastKnownPrice[pos.symbol] = pos.avgBuyPrice;
        });

        for (let i = 0; i < validDates.length; i++) {
          const dateKey = validDates[i];
          const timestamp = dateTimestampMap[dateKey] || (new Date(dateKey).getTime() / 1000);
          let dayValTRY = 0;

          portfolio.forEach(pos => {
            if (symbolDateMap[pos.symbol] && symbolDateMap[pos.symbol][dateKey] !== undefined) {
              lastKnownPrice[pos.symbol] = symbolDateMap[pos.symbol][dateKey];
            }
            const cPrice = lastKnownPrice[pos.symbol] || pos.avgBuyPrice;
            const isTRY = pos.currency === 'TRY' || pos.symbol.endsWith('.IS');
            
            // Only count position if this date is on or after its specific purchase date
            const isOwned = !pos.buyDate || dateKey >= pos.buyDate;
            if (isOwned) {
              const posVal = pos.shares * cPrice * (isTRY ? 1.0 : usdTryRate);
              dayValTRY += posVal;
            }
          });

          // PnL relative to cost basis
          const pnlPct = totalInitialCostTRY > 0 ? ((dayValTRY - totalInitialCostTRY) / totalInitialCostTRY) * 100 : 0;

          const dateObj = new Date(dateKey);
          points.push({
            timestamp,
            date: dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            value: Number(dayValTRY.toFixed(2)),
            pnlPct: Number(pnlPct.toFixed(2))
          });
        }

        // If only 1 single point (e.g. bought today), add cost point for clean baseline
        if (points.length === 1) {
          const first = points[0];
          points.unshift({
            timestamp: first.timestamp - 86400,
            date: 'Alış Anı',
            value: Number(totalInitialCostTRY.toFixed(2)),
            pnlPct: 0
          });
        }

        setEquityPoints(points);
      } catch (err) {
        console.warn('Real equity curve calculation error:', err);
      } finally {
        setEquityLoading(false);
      }
    };

    loadRealEquityCurve();
  }, [portfolio, equityTimeframe, usdTryRate]);

  // Real Historical Canvas Renderer
  useEffect(() => {
    const canvas = equityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 70, bottom: 30, left: 20 };

    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, width, height);

    if (equityPoints.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        portfolio.length === 0 ? 'Portföyünüzde henüz hisse veya fon bulunmuyor.' : 'Getiri eğrisi hesaplanıyor...',
        width / 2,
        height / 2
      );
      return;
    }

    const values = equityPoints.map(p => p.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    minVal -= range * 0.08;
    maxVal += range * 0.08;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getY = (v: number) => padding.top + (1 - (v - minVal) / (maxVal - minVal)) * chartH;
    const getX = (idx: number) => padding.left + (idx / (equityPoints.length - 1)) * chartW;

    // Grid lines
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const val = minVal + (i / gridSteps) * (maxVal - minVal);
      const y = getY(val);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`₺${(val / 1000).toFixed(0)}k`, width - padding.right + 8, y + 4);
    }

    const isOverallPos = equityPoints[equityPoints.length - 1].value >= equityPoints[0].value;
    const lineColor = isOverallPos ? '#10b981' : '#f43f5e';
    const gradientTop = isOverallPos ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';

    // Gradient Area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, gradientTop);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(equityPoints[0].value));
    for (let i = 1; i < equityPoints.length; i++) {
      ctx.lineTo(getX(i), getY(equityPoints[i].value));
    }
    ctx.lineTo(getX(equityPoints.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Curve Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(equityPoints[0].value));
    for (let i = 1; i < equityPoints.length; i++) {
      ctx.lineTo(getX(i), getY(equityPoints[i].value));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Date X-Axis labels
    const stepLabel = Math.max(1, Math.floor(equityPoints.length / 5));
    ctx.fillStyle = '#64748b';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < equityPoints.length; i += stepLabel) {
      ctx.fillText(equityPoints[i].date, getX(i), height - 8);
    }

    // Hover Crosshair & Data Tooltip
    if (hoverEquityIdx !== null && equityPoints[hoverEquityIdx]) {
      const activePt = equityPoints[hoverEquityIdx];
      const activeX = getX(hoverEquityIdx);
      const activeY = getY(activePt.value);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(activeX, padding.top);
      ctx.lineTo(activeX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point Dot
      ctx.beginPath();
      ctx.arc(activeX, activeY, 5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

  }, [equityPoints, hoverEquityIdx]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = equityCanvasRef.current;
    if (!canvas || equityPoints.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const paddingLeft = 20;
    const paddingRight = 70;
    const chartW = rect.width - paddingLeft - paddingRight;

    const x = e.clientX - rect.left - paddingLeft;
    const ratio = Math.max(0, Math.min(1, x / chartW));
    const idx = Math.round(ratio * (equityPoints.length - 1));

    setHoverEquityIdx(idx);
  };

  const handleCanvasMouseLeave = () => {
    setHoverEquityIdx(null);
  };

  const currentModalPrice = typeof modalPrice === 'number' ? modalPrice : (portfolioQuotes[modalSymbol]?.price || watchlistQuotes[modalSymbol]?.price || 100);
  const numericModalShares = parseFloat(modalShares.replace(',', '.')) || 0;
  const numericModalCash = parseFloat(modalCash.replace(',', '.')) || 0;

  const handleModalSharesChange = (valStr: string) => {
    setModalShares(valStr);
    const num = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(num) && currentModalPrice > 0) {
      setModalCash((num * currentModalPrice).toFixed(2));
    } else if (!valStr) {
      setModalCash('');
    }
  };

  const handleModalCashChange = (valStr: string) => {
    setModalCash(valStr);
    const num = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(num) && currentModalPrice > 0) {
      const rawLots = num / currentModalPrice;
      setModalShares(Number(rawLots.toFixed(6)).toString());
    } else if (!valStr) {
      setModalShares('');
    }
  };

  const setPresetModalShares = (shares: number) => {
    setModalShares(shares.toString());
    if (currentModalPrice > 0) {
      setModalCash((shares * currentModalPrice).toFixed(2));
    }
  };

  const setPresetModalCash = (cash: number) => {
    setModalCash(cash.toString());
    if (currentModalPrice > 0) {
      const rawLots = cash / currentModalPrice;
      setModalShares(Number(rawLots.toFixed(6)).toString());
    }
  };

  const handleOpenTradeModal = (sym?: string, mode: 'BUY' | 'SELL' = 'BUY') => {
    setModalMode(mode);
    setModalInputType('SHARES');
    setModalSuccessMsg(null);
    setSymbolError(null);
    if (sym) {
      setModalSymbol(sym);
      const q = portfolioQuotes[sym] || watchlistQuotes[sym];
      const pos = getPosition(sym);
      const p = q ? q.price : (pos ? pos.avgBuyPrice : 100);
      setModalPrice(p);
      setSymbolValidated(true);
      setValidatedStockInfo({
        symbol: sym,
        name: q ? (q.trName || q.longName || q.shortName || sym) : sym,
        exchange: q?.exchange || (sym.endsWith('.IS') ? 'BIST' : 'NASDAQ'),
        price: p,
        currency: q?.currency || (sym.endsWith('.IS') ? 'TRY' : 'USD'),
        changePercent: q?.changePercent
      });
      if (mode === 'SELL' && pos) {
        setModalShares(pos.shares.toString());
        setModalCash((pos.shares * p).toFixed(2));
      } else {
        const def = p > 5000 ? 0.05 : p > 500 ? 1 : 10;
        setModalShares(def.toString());
        setModalCash((def * p).toFixed(2));
      }
    } else {
      setModalSymbol('NVDA');
      setModalPrice('');
      setModalShares('10');
      setModalCash('');
      setSymbolValidated(true);
      setValidatedStockInfo(null);
    }
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalSearchQuery('');
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const handleSavePosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSymbol || numericModalShares <= 0) return;
    if (symbolValidated !== true || isValidatingSymbol) {
      setSymbolError('İşlem yapabilmek için geçerli ve borsa veritabanında doğrulanmış bir hisse senedi seçmelisiniz.');
      return;
    }

    const isTRY = modalSymbol.endsWith('.IS');
    const priceNum = typeof modalPrice === 'number' ? modalPrice : (portfolioQuotes[modalSymbol]?.price || validatedStockInfo?.price || 100);
    const currSym = isTRY ? '₺' : '$';
    const totalAmount = numericModalShares * priceNum;

    if (modalMode === 'BUY') {
      addPosition({
        symbol: modalSymbol.toUpperCase(),
        shares: Number(numericModalShares.toFixed(6)),
        avgBuyPrice: Number(priceNum),
        buyDate: modalDate,
        currency: isTRY ? 'TRY' : 'USD',
      });
      setModalSuccessMsg(`${numericModalShares} Lot ${modalSymbol} (${currSym}${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Başarıyla Satın Alındı!`);
    } else {
      const res = sellPosition(modalSymbol, numericModalShares, Number(priceNum));
      if (res.success) {
        setModalSuccessMsg(`${numericModalShares} Lot ${modalSymbol} (${currSym}${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Satışı Gerçekleştirildi!`);
      }
    }

    setTimeout(() => {
      setModalSuccessMsg(null);
      setIsModalOpen(false);
      fetchQuotes();
    }, 1200);
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Briefcase className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
              {language === 'tr' ? 'Portföy & Varlık Yönetimi' : 'Portfolio Management'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-tight">
              {language === 'tr' ? 'Canlı kâr/zarar, getiri oranları ve varlık dağılım analizi' : 'Live P&L, returns and asset allocation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenTradeModal(undefined, 'BUY')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'tr' ? 'Yeni Pozisyon Ekle' : 'Add Position'}</span>
          </button>
        </div>
      </div>

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 font-mono">
        
        {/* Card 1: NASDAQ Total Value & Return */}
        <div className="bg-[#101520] border-y border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                NASDAQ Portföyü
              </span>
            </div>
            <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">USD</span>
          </div>

          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-white leading-none">
              ${portfolioStats.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              Maliyet: ${portfolioStats.totalUsdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Net Kâr / Zarar:</span>
            <span className={`font-black ${portfolioStats.totalUsdPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioStats.totalUsdPnl >= 0 ? '+' : ''}${portfolioStats.totalUsdPnl.toFixed(2)} ({portfolioStats.totalUsdPnl >= 0 ? '+' : ''}{portfolioStats.totalUsdPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Card 2: BIST Total Value & Return */}
        <div className="bg-[#101520] border-y border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                BIST 100 Portföyü
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">TRY</span>
          </div>

          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-white leading-none">
              ₺{portfolioStats.totalTryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              Maliyet: ₺{portfolioStats.totalTryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Net Kâr / Zarar:</span>
            <span className={`font-black ${portfolioStats.totalTryPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioStats.totalTryPnl >= 0 ? '+' : ''}₺{portfolioStats.totalTryPnl.toFixed(2)} ({portfolioStats.totalTryPnl >= 0 ? '+' : ''}{portfolioStats.totalTryPnlPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Card 3: Today's 24H Performance */}
        <div className="bg-[#101520] border-y border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                Bugünkü Değişim (24H)
              </span>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Piyasa</span>
          </div>

          <div className="my-3">
            <div className={`text-2xl sm:text-3xl font-black flex items-center gap-1.5 leading-none ${
              (portfolioStats.totalUsdDailyChange + portfolioStats.totalTryDailyChange) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(portfolioStats.totalUsdDailyChange + portfolioStats.totalTryDailyChange) >= 0 ? (
                <ArrowUpRight className="w-6 h-6 stroke-[3]" />
              ) : (
                <ArrowDownRight className="w-6 h-6 stroke-[3]" />
              )}
              <span>
                {(portfolioStats.totalUsdDailyChange + portfolioStats.totalTryDailyChange) >= 0 ? '+' : ''}
                ${portfolioStats.totalUsdDailyChange.toFixed(2)} / ₺{portfolioStats.totalTryDailyChange.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              Anlık seans fiyat hareketleri
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Aktif Pozisyon:</span>
            <span className="font-bold text-slate-200">{portfolio.length} Hisse Senedi</span>
          </div>
        </div>

        {/* Card 4: Top Performer Asset */}
        <div className="bg-[#101520] border-y border-white/[0.08] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                En Yüksek Getiri
              </span>
            </div>
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          </div>

          {portfolioStats.bestPerformer ? (
            <div className="my-3 flex items-center justify-between">
              <div>
                <div 
                  onClick={() => selectStock(portfolioStats.bestPerformer!.symbol)}
                  className="text-2xl sm:text-3xl font-black text-white font-mono hover:text-emerald-400 transition cursor-pointer"
                  title={`${portfolioStats.bestPerformer.symbol} detayına git`}
                >
                  {portfolioStats.bestPerformer.symbol.replace('.IS', '')}
                </div>
                <div className="text-xs text-slate-400 font-sans truncate mt-1">
                  {portfolioStats.bestPerformer.quote?.trName || portfolioStats.bestPerformer.quote?.shortName || (portfolioStats.bestPerformer.isTRY ? 'BIST Pozisyonu' : 'Global Hisse')}
                </div>
              </div>

              <div className="flex flex-col items-end justify-center font-mono">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 leading-tight">
                  +{portfolioStats.bestPerformer.isTRY ? '₺' : '$'}{portfolioStats.bestPerformer.pnl.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400/90 leading-tight mt-1">
                  +{portfolioStats.bestPerformer.pnlPct.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="my-3 text-slate-500 text-sm font-sans">Pozisyon bulunmuyor</div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Ağırlık:</span>
            <span className="font-bold text-slate-200">
              {portfolioStats.bestPerformer ? `${portfolioStats.bestPerformer.weight.toFixed(1)}%` : '-'}
            </span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Grid: Equity Curve + Asset Allocation Donut + Sector Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Equity Curve (7 cols) */}
        <div className="xl:col-span-7 bg-[#101520] p-5 rounded-2xl shadow-lg flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-2.5">
              <LineChart className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-white">
                Portföy Büyüme & Getiri Eğrisi
              </h3>
              {portfolio.length > 0 && (
                <span className="text-[11px] font-sans font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg">
                  Alış Tarihinden İtibaren
                </span>
              )}
            </div>

            <div className="flex items-center bg-[#161d2c] p-0.5 rounded-xl text-xs font-mono font-bold">
              {(['1W', '1M', '6M', '1Y'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setEquityTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    equityTimeframe === tf ? 'bg-[#222c3f] text-emerald-400 font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full h-[300px] bg-[#0c1018] rounded-xl overflow-hidden">
            {hoverEquityIdx !== null && equityPoints[hoverEquityIdx] && (
              <div className="absolute top-3 left-4 z-10 bg-[#141b27]/90 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-4 text-xs font-mono shadow-xl pointer-events-none">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tarih</span>
                  <span className="text-white font-bold">{equityPoints[hoverEquityIdx].date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Portföy Büyüklüğü</span>
                  <span className="text-white font-black">₺{equityPoints[hoverEquityIdx].value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Dönemsel Getiri</span>
                  <span className={`font-black ${equityPoints[hoverEquityIdx].pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {equityPoints[hoverEquityIdx].pnlPct >= 0 ? '+' : ''}{equityPoints[hoverEquityIdx].pnlPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            <canvas
              ref={equityCanvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-full block cursor-crosshair"
            />
          </div>
        </div>

        {/* Asset & Sector Allocation Breakdown (5 cols) */}
        <div className="xl:col-span-5 bg-[#101520] p-5 rounded-2xl shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-base text-white">
                Varlık & Sektör Dağılımı
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 font-semibold">100% Toplam</span>
          </div>

          {/* Allocation Breakdown Bars */}
          <div className="flex flex-col gap-3">
            {/* Visual Multi-segment bar */}
            <div className="w-full h-4 bg-[#141b27] rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {portfolioStats.positions.map((pos, idx) => (
                <div
                  key={pos.symbol}
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(3, pos.weight)}%`,
                    backgroundColor: COLORS[idx % COLORS.length],
                  }}
                  title={`${pos.symbol}: ${pos.weight.toFixed(1)}%`}
                />
              ))}
            </div>

            {/* Position Weight List */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 max-h-[220px] overflow-y-auto pr-1">
              {portfolioStats.positions.map((pos, idx) => (
                <div
                  key={pos.symbol}
                  onClick={() => selectStock(pos.symbol)}
                  className="bg-[#141b27] hover:bg-[#1a2334] p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-mono font-bold text-xs text-white">
                      {pos.symbol.replace('.IS', '')}
                    </span>
                  </div>

                  <span className="font-mono font-black text-xs text-slate-200">
                    {pos.weight.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main Detailed Positions Table */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 bg-[#0e131d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-white">
                Açık Portföy Pozisyonları ({portfolio.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Anlık fiyatlar, toplam maliyetler ve getiri oranları
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenTradeModal(undefined, 'BUY')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Pozisyon Ekle</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-[#0e131d] text-slate-300 text-xs uppercase font-bold select-none">
              <tr>
                <th
                  onClick={() => handlePosSort('symbol')}
                  className="py-4 px-4 font-sans cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Varlık / Şirket</span>
                    {renderPosSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('shares')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lot / Adet</span>
                    {renderPosSortIcon('shares')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('avgBuyPrice')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ort. Maliyet</span>
                    {renderPosSortIcon('avgBuyPrice')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('curPrice')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Son Fiyat</span>
                    {renderPosSortIcon('curPrice')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('value')}
                  className="py-4 px-4 hidden md:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Toplam Tutar</span>
                    {renderPosSortIcon('value')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('weight')}
                  className="py-4 px-4 hidden lg:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ağırlık</span>
                    {renderPosSortIcon('weight')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('change24hPct')}
                  className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Günlük Değişim</span>
                    {renderPosSortIcon('change24hPct')}
                  </div>
                </th>
                <th
                  onClick={() => handlePosSort('pnl')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Toplam Kâr/Zarar</span>
                    {renderPosSortIcon('pnl')}
                  </div>
                </th>
                <th className="py-4 px-4 text-right font-sans">İşlemler</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {sortedPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans text-sm">
                    Henüz portföyünüzde pozisyon bulunmuyor. Yukarıdaki "Yeni Pozisyon Ekle" butonuna tıklayarak sanal hisse alabilirsiniz.
                  </td>
                </tr>
              ) : (
                sortedPositions.map((pos) => {
                  const isPos = pos.pnl >= 0;
                  const isDailyPos = pos.change24hPct >= 0;

                  return (
                    <tr
                      key={pos.symbol}
                      className="hover:bg-white/[0.03] transition cursor-pointer"
                      onClick={() => selectStock(pos.symbol)}
                    >
                      {/* Symbol & Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#222d42] flex items-center justify-center font-mono font-black text-slate-100 text-xs">
                            {pos.symbol.replace('.IS', '').substring(0, 3)}
                          </div>
                          <div>
                            <span className="font-mono font-black text-white text-base block leading-none">
                              {pos.symbol.replace('.IS', '')}
                            </span>
                            <span className="text-xs text-slate-400 font-sans font-medium truncate max-w-[120px] block mt-1">
                              {pos.quote?.trName || pos.quote?.shortName || pos.symbol.replace('.IS', '')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shares */}
                      <td className="py-4 px-4 text-slate-100 font-bold">
                        {pos.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })} Lot
                      </td>

                      {/* Avg Buy Price */}
                      <td className="py-4 px-4 text-slate-300">
                        {pos.isTRY ? '₺' : '$'}{pos.avgBuyPrice.toFixed(2)}
                      </td>

                      {/* Current Price */}
                      <td className="py-4 px-4 text-white font-black text-base">
                        {pos.isTRY ? '₺' : '$'}{pos.curPrice.toFixed(2)}
                      </td>

                      {/* Total Value */}
                      <td className="py-4 px-4 text-slate-200 font-bold hidden md:table-cell">
                        {pos.isTRY ? '₺' : '$'}{pos.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Weight */}
                      <td className="py-4 px-4 font-bold text-slate-300 hidden lg:table-cell">
                        {pos.weight.toFixed(1)}%
                      </td>

                      {/* 24h Daily */}
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                          isDailyPos ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                        }`}>
                          {isDailyPos ? '+' : ''}{pos.change24hPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Total P&L */}
                      <td className="py-4 px-4">
                        <div className={`font-black text-sm sm:text-base ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{pos.isTRY ? '₺' : '$'}{pos.pnl.toFixed(2)}
                        </div>
                        <div className={`text-xs font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                        </div>
                      </td>

                      {/* Action buttons (BUY / SELL / DELETE) */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenTradeModal(pos.symbol, 'BUY')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs transition"
                            title="Lot Ekle"
                          >
                            + AL
                          </button>
                          <button
                            onClick={() => handleOpenTradeModal(pos.symbol, 'SELL')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white font-bold text-xs transition"
                            title="Pozisyonu Azalt / Sat"
                          >
                            - SAT
                          </button>
                          <button
                            onClick={() => removePosition(pos.symbol)}
                            className="p-1.5 rounded-lg bg-[#141b27] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                            title="Listeden Kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realized Trade History Section */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 bg-[#0e131d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-white">
                İşlem & Emir Geçmişi ({tradeHistory.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerçekleştirdiğiniz tüm alım ve satım işlemleri ile gerçekleşen kâr/zarar kayıtları
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-[#0e131d] text-slate-300 text-xs uppercase font-bold select-none">
              <tr>
                <th
                  onClick={() => handleTradeSort('type')}
                  className="py-3 px-4 font-sans cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>İşlem Türü</span>
                    {renderTradeSortIcon('type')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('symbol')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sembol</span>
                    {renderTradeSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('shares')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lot Adedi</span>
                    {renderTradeSortIcon('shares')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('price')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>İşlem Fiyatı</span>
                    {renderTradeSortIcon('price')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('total')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Toplam Tutar</span>
                    {renderTradeSortIcon('total')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('realizedPnl')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Gerçekleşen Kâr/Zarar</span>
                    {renderTradeSortIcon('realizedPnl')}
                  </div>
                </th>
                <th
                  onClick={() => handleTradeSort('date')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Tarih</span>
                    {renderTradeSortIcon('date')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sortedTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-sm font-sans">
                    Henüz işlem geçmişi bulunmuyor.
                  </td>
                </tr>
              ) : (
                sortedTrades.map((trade) => {
                  const isBuy = trade.type === 'BUY';
                  return (
                    <tr
                      key={trade.id}
                      onClick={() => selectStock(trade.symbol)}
                      className="hover:bg-white/[0.04] transition cursor-pointer group"
                      title={`${trade.symbol} sayfasına git`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md font-black text-xs ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isBuy ? 'AL' : 'SAT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="font-mono font-black group-hover:text-emerald-400 transition inline-flex items-center gap-1.5">
                          {trade.symbol.replace('.IS', '')}
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        {trade.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })} Lot
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        {trade.currency === 'TRY' ? '₺' : '$'}{trade.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {trade.currency === 'TRY' ? '₺' : '$'}{(trade.shares * trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        {trade.realizedPnl !== undefined ? (
                          <span className={`font-black ${trade.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.realizedPnl >= 0 ? '+' : ''}{trade.currency === 'TRY' ? '₺' : '$'}{trade.realizedPnl.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 text-xs">
                        {trade.date}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gelişmiş Çoklu İzleme Listeleri (Multiple Watchlists Manager) */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg space-y-0">
        {/* Watchlist Header & Group Tabs */}
        <div className="p-5 bg-[#0e131d] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Star className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-black text-lg text-white tracking-tight flex items-center gap-2">
                    <span>{activeWatchlist?.name || 'İzleme Listesi'}</span>
                    <span className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                      {watchlist.length} Hisse
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'tr'
                      ? 'Kişiselleştirilmiş çoklu izleme listeleriniz ve anlık fiyat/getiri performansı'
                      : 'Manage custom grouped watchlists and track live performance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Add Stock Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={quickAddSearch}
                onChange={(e) => setQuickAddSearch(e.target.value)}
                placeholder={language === 'tr' ? 'Bu listeye hisse ekle...' : 'Add stock to list...'}
                className="w-full bg-[#161d2c] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition hover:bg-[#1a2335] focus:bg-[#1c263a]"
              />

              {/* Autocomplete Dropdown */}
              {quickAddResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#141b27] rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-white/[0.04]">
                  {quickAddResults.map((res) => (
                    <button
                      key={res.symbol}
                      onClick={() => {
                        addToWatchlist(res.symbol, activeWatchlistId);
                        setQuickAddSearch('');
                        setQuickAddResults([]);
                      }}
                      className="w-full p-2.5 text-left hover:bg-white/[0.06] flex items-center justify-between transition group"
                    >
                      <div>
                        <div className="font-mono font-bold text-xs text-white group-hover:text-emerald-400">
                          {res.symbol}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {res.name}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        + Ekle
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Watchlist Group Pills & Create Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
            {watchlists.map((group) => {
              const isActive = group.id === activeWatchlistId;
              return (
                <div
                  key={group.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'bg-[#141b27] hover:bg-[#182130] text-slate-300 hover:text-white'
                  }`}
                  onClick={() => setActiveWatchlistId(group.id)}
                >
                  <Star className={`w-3 h-3 shrink-0 ${isActive ? 'text-slate-950 fill-slate-950' : 'text-amber-400'}`} />
                  <span>{group.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-white/[0.08] text-slate-400'
                  }`}>
                    {group.symbols.length}
                  </span>

                  {/* Delete button if custom and not active default */}
                  {!group.isDefault && watchlists.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWatchlist(group.id);
                      }}
                      className={`p-0.5 rounded hover:bg-black/20 transition ${isActive ? 'text-slate-950' : 'text-slate-400 hover:text-rose-400'}`}
                      title="Listeyi Sil"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Inline New List Creator Button */}
            {isCreatingList ? (
              <div className="flex items-center gap-1.5 bg-[#141b27] p-1 rounded-xl shrink-0">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Liste Adı..."
                  className="bg-transparent px-2.5 py-1 text-xs text-white placeholder-slate-500 outline-none w-28 font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newListName.trim()) {
                      createWatchlist(newListName);
                      setNewListName('');
                      setIsCreatingList(false);
                    } else if (e.key === 'Escape') {
                      setIsCreatingList(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newListName.trim()) {
                      createWatchlist(newListName);
                      setNewListName('');
                      setIsCreatingList(false);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                >
                  Ekle
                </button>
                <button
                  onClick={() => setIsCreatingList(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingList(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#141b27] hover:bg-[#192334] text-emerald-400 transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'tr' ? 'Yeni Liste Ekle' : 'New List'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Watchlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 p-5">
          {watchlist.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm font-sans flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-500">
                <Star className="w-6 h-6" />
              </div>
              <p className="font-bold text-white">Bu listede henüz hisse bulunmuyor</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Yukarıdaki arama kutusundan hisse arayarak veya hisse detay sayfasından yıldız ikonuna tıklayarak hisseleri listenize ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            watchlist.map((sym) => {
              const q = watchlistQuotes[sym];
              const isBist = sym.endsWith('.IS');
              const isPositive = q ? q.changePercent >= 0 : true;

              return (
                <div
                  key={sym}
                  onClick={() => selectStock(sym)}
                  className="bg-[#141b27] hover:bg-[#182030] p-4 rounded-xl flex items-center justify-between cursor-pointer transition group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(sym);
                      }}
                      className="text-amber-400 hover:text-slate-500 transition p-1 hover:bg-white/[0.06] rounded-lg shrink-0"
                      title="Listeden Çıkar"
                    >
                      <Star className="w-4.5 h-4.5 fill-amber-400" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-white text-base group-hover:text-emerald-400 transition">
                          {sym.replace('.IS', '')}
                        </span>
                        {isBist && (
                          <span className="text-[9px] font-mono font-bold bg-white/[0.06] text-slate-400 px-1 py-0.2 rounded">
                            BIST
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[130px] sm:max-w-[160px] font-sans font-medium">
                        {q?.trName || q?.shortName || sym.replace('.IS', '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Price & Change */}
                    <div className="text-right font-mono">
                      <div className="font-black text-white text-base">
                        {q ? `${isBist ? '₺' : '$'}${q.price.toFixed(2)}` : '...'}
                      </div>
                      <div className={`text-xs font-black inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{q ? q.changePercent.toFixed(2) : '0.00'}%
                      </div>
                    </div>

                    {/* Quick Action Buttons: Bell (Alert) + Trade (Al/Sat) */}
                    <div className="flex items-center gap-1 pl-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAlerts(sym);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition"
                        title="Alarm Kur"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSymbol(sym);
                          setModalMode('BUY');
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition"
                        title="Alım Yap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* Upgraded Trade Execution Modal (BUY & SELL with Fractional & Cash support) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className="w-full max-w-lg bg-[#131926] rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header with BUY / SELL tab switcher */}
            <div className="flex items-center justify-between pb-3.5">
              <div className="flex items-center gap-2 bg-[#0c1018] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalMode('BUY')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-black font-mono transition ${
                    modalMode === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AL
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('SELL')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-black font-mono transition ${
                    modalMode === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SAT
                </button>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Execution Method Selector */}
            <div className="flex items-center justify-between bg-[#0c1018] p-1 rounded-xl text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setModalInputType('SHARES')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  modalInputType === 'SHARES'
                    ? 'bg-[#182030] text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Adet / Lot İle</span>
              </button>
              <button
                type="button"
                onClick={() => setModalInputType('CASH')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  modalInputType === 'CASH'
                    ? 'bg-[#182030] text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Tutar / Nakit İle</span>
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="flex flex-col gap-4">
              {/* Symbol Input / Search with Live Verification */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Varlık / Hisse Kodu
                  </label>
                  {isValidatingSymbol ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Doğrulanıyor...
                    </span>
                  ) : symbolValidated === true ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Doğrulandı
                    </span>
                  ) : symbolValidated === false ? (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Geçersiz Varlık
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={modalSymbol}
                    onChange={(e) => {
                      setModalSymbol(e.target.value.toUpperCase());
                      setModalSearchQuery(e.target.value);
                    }}
                    placeholder="Örn: NVDA, THYAO.IS, GRAM_ALTIN"
                    className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-base font-bold outline-none transition-colors"
                    required
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-[#161d2b] rounded-xl mt-1 shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                      {searchResults.map((r) => (
                        <div
                          key={r.symbol}
                          onClick={() => {
                            setModalSymbol(r.symbol);
                            const q = portfolioQuotes[r.symbol] || watchlistQuotes[r.symbol];
                            if (q) setModalPrice(q.price);
                            setValidatedStockInfo({
                              symbol: r.symbol,
                              name: r.name,
                              exchange: r.exchange || 'GLOBAL',
                              price: q ? q.price : 0,
                              currency: r.symbol.endsWith('.IS') ? 'TRY' : 'USD',
                            });
                            setSymbolValidated(true);
                            setSymbolError(null);
                            setSearchResults([]);
                            setModalSearchQuery('');
                          }}
                          className="p-2.5 px-4 hover:bg-[#1f293d] cursor-pointer flex justify-between items-center text-xs transition"
                        >
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-white">{r.symbol}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{r.name}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300">
                            {r.exchange || 'GLOBAL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real-time Verified Asset Info Badge */}
                {symbolValidated === true && validatedStockInfo && (
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-emerald-500/10 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="flex flex-col truncate">
                        <span className="text-white font-bold truncate">{validatedStockInfo.name}</span>
                        <span className="text-[10px] text-slate-400">{validatedStockInfo.exchange}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-white">
                        {validatedStockInfo.currency === 'TRY' ? '₺' : '$'}{validatedStockInfo.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {validatedStockInfo.changePercent !== undefined && (
                        <div className={`text-[10px] font-mono font-bold ${validatedStockInfo.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {validatedStockInfo.changePercent >= 0 ? '+' : ''}{validatedStockInfo.changePercent.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Invalid Asset Alert Message */}
                {symbolValidated === false && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="font-bold text-rose-200">Böyle Bir Hisse veya Varlık Bulunamadı</span>
                      <span className="text-[11px] text-rose-300/90 mt-0.5">
                        {symbolError || `"${modalSymbol}" borsada işlem gören geçerli bir hisse senedi veya varlık değildir. Lütfen geçerli bir kod girin.`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Inputs: SHARES OR CASH */}
              {modalInputType === 'SHARES' ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Lot Adedi
                        </label>
                        {modalMode === 'SELL' && getPosition(modalSymbol) && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Maks: {getPosition(modalSymbol)?.shares}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={modalShares}
                        onChange={(e) => handleModalSharesChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-base font-bold outline-none transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        İşlem Fiyatı ({modalSymbol.endsWith('.IS') ? '₺' : '$'})
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={modalPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || '';
                          setModalPrice(val);
                          if (typeof val === 'number' && numericModalShares > 0) {
                            setModalCash((numericModalShares * val).toFixed(2));
                          }
                        }}
                        placeholder={portfolioQuotes[modalSymbol]?.price?.toString() || 'Piyasa Fiyatı'}
                        className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-base font-bold outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Quick Chips for Shares */}
                  {modalMode === 'SELL' && getPosition(modalSymbol) ? (
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPresetModalShares(Number((getPosition(modalSymbol)!.shares * pct).toFixed(6)))}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition"
                        >
                          {pct === 1.0 ? '%100' : `%${pct * 100}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-6 gap-1.5 mt-1">
                      {[0.05, 0.1, 0.5, 1, 5, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setPresetModalShares(count)}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition"
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          İşlem Tutarı ({modalSymbol.endsWith('.IS') ? '₺' : '$'})
                        </label>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={modalCash}
                        onChange={(e) => handleModalCashChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-base font-bold outline-none transition-colors"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        İşlem Fiyatı ({modalSymbol.endsWith('.IS') ? '₺' : '$'})
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={modalPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || '';
                          setModalPrice(val);
                          if (typeof val === 'number' && numericModalCash > 0) {
                            setModalShares(Number((numericModalCash / val).toFixed(6)).toString());
                          }
                        }}
                        placeholder={portfolioQuotes[modalSymbol]?.price?.toString() || 'Piyasa Fiyatı'}
                        className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-base font-bold outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Calculated Lot Subtitle */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
                    <span>Hesaplanan Kesirli Lot:</span>
                    <span className="text-emerald-400 font-bold">
                      ≈ {numericModalShares > 0 ? numericModalShares.toFixed(6) : '0.000000'} Lot
                    </span>
                  </div>

                  {/* Quick Preset Chips for Cash Amount */}
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {(modalSymbol.endsWith('.IS') ? [500, 1000, 5000, 10000] : [50, 100, 500, 1000]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPresetModalCash(amt)}
                        className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition"
                      >
                        {modalSymbol.endsWith('.IS') ? '₺' : '$'}{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buy Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-sm outline-none transition-colors"
                />
              </div>

              {/* Total Summary & Estimated Realized PnL */}
              <div className="bg-[#0c1018] p-4 rounded-xl flex flex-col gap-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">İşlem Miktarı:</span>
                  <span className="font-mono font-black text-white">
                    {numericModalShares.toFixed(numericModalShares % 1 === 0 ? 0 : 6)} Lot
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400 font-sans">Toplam İşlem Tutarı:</span>
                  <span className="font-mono font-black text-base text-white">
                    {modalSymbol.endsWith('.IS') ? '₺' : '$'}
                    {(numericModalShares * currentModalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {modalMode === 'SELL' && getPosition(modalSymbol) && typeof modalPrice === 'number' && (
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-slate-400 font-sans">Gerçekleşecek Kâr/Zarar:</span>
                    <span className={`font-black ${modalPrice >= getPosition(modalSymbol)!.avgBuyPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {modalPrice >= getPosition(modalSymbol)!.avgBuyPrice ? '+' : ''}{modalSymbol.endsWith('.IS') ? '₺' : '$'}{((modalPrice - getPosition(modalSymbol)!.avgBuyPrice) * numericModalShares).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit / Success Toast */}
              {modalSuccessMsg ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-center text-xs flex items-center justify-center gap-2 animate-pulse">
                  <Check className="w-5 h-5" />
                  <span>{modalSuccessMsg}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={numericModalShares <= 0 || symbolValidated !== true || isValidatingSymbol}
                  className={`w-full py-3.5 rounded-xl text-white font-black text-sm font-mono transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    symbolValidated === false
                      ? 'bg-rose-900/50 text-rose-300 cursor-not-allowed'
                      : modalMode === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                  }`}
                >
                  {isValidatingSymbol ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Varlık Kontrol Ediliyor...</span>
                    </>
                  ) : symbolValidated === false ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      <span>Geçersiz Varlık - İşlem Yapılamaz</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>{modalMode === 'BUY' ? 'Alım Emrini Kaydet' : 'Satış Emrini Gerçekleştir'}</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
