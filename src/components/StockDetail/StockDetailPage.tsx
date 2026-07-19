import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StockQuote, TechnicalAnalysisData } from '../../types/stock';
import { StockChart, TimeframePerformance } from './StockChart';
import { TechnicalGauge } from './TechnicalGauge';
import { KeyStats } from './KeyStats';
import { NewsFeed } from './NewsFeed';
import { SimilarStocks } from './SimilarStocks';
import {
  Star,
  Bell,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Scale,
  Check,
  X,
  Banknote,
  Coins,
  Layers
} from 'lucide-react';

export const StockDetailPage: React.FC = () => {
  const { symbol: routeSymbol } = useParams<{ symbol?: string }>();
  const {
    selectedStockSymbol,
    setActiveTab,
    language,
    toggleWatchlist,
    isInWatchlist,
    addPosition,
    sellPosition,
    getPosition,
    addCompareStock,
    alerts,
    openAlerts,
  } = useApp();

  const activeSymbol = (routeSymbol ? decodeURIComponent(routeSymbol).toUpperCase() : selectedStockSymbol) || 'NVDA';

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [technicals, setTechnicals] = useState<TechnicalAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [techLoading, setTechLoading] = useState<boolean>(true);
  
  // Trade Modal State
  const [tradeModalOpen, setTradeModalOpen] = useState<boolean>(false);
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeInputType, setTradeInputType] = useState<'SHARES' | 'CASH'>('SHARES');
  const [sharesInput, setSharesInput] = useState<string>('10');
  const [cashInput, setCashInput] = useState<string>('');
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);
  const [timeframePerf, setTimeframePerf] = useState<TimeframePerformance | null>(null);

  const currentHolding = getPosition(activeSymbol);
  const isOwned = !!currentHolding && currentHolding.shares > 0;

  const fetchQuoteAndTech = async (sym: string) => {
    setLoading(true);
    setTechLoading(true);
    try {
      const q = await api.getStockQuote(sym);
      setQuote(q);
      setLoading(false);

      const t = await api.getTechnicalAnalysis(sym);
      setTechnicals(t);
    } catch (err) {
      console.warn('Failed to fetch stock details:', err);
    } finally {
      setLoading(false);
      setTechLoading(false);
    }
  };

  useEffect(() => {
    if (activeSymbol) {
      fetchQuoteAndTech(activeSymbol);
      const interval = setInterval(() => {
        api.getStockQuote(activeSymbol).then(setQuote).catch(() => {});
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [activeSymbol]);

  // Numeric derived values
  const numericShares = parseFloat(sharesInput.replace(',', '.')) || 0;
  const numericCash = parseFloat(cashInput.replace(',', '.')) || 0;

  const handleSharesChange = (valStr: string) => {
    setSharesInput(valStr);
    const num = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(num) && quote && quote.price > 0) {
      setCashInput((num * quote.price).toFixed(2));
    } else if (!valStr) {
      setCashInput('');
    }
  };

  const handleCashChange = (valStr: string) => {
    setCashInput(valStr);
    const num = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(num) && quote && quote.price > 0) {
      const rawLots = num / quote.price;
      setSharesInput(Number(rawLots.toFixed(6)).toString());
    } else if (!valStr) {
      setSharesInput('');
    }
  };

  const setPresetShares = (shares: number) => {
    setSharesInput(shares.toString());
    if (quote && quote.price > 0) {
      setCashInput((shares * quote.price).toFixed(2));
    }
  };

  const setPresetCash = (cash: number) => {
    setCashInput(cash.toString());
    if (quote && quote.price > 0) {
      const rawLots = cash / quote.price;
      setSharesInput(Number(rawLots.toFixed(6)).toString());
    }
  };

  const adjustShares = (delta: number) => {
    const cur = parseFloat(sharesInput.replace(',', '.')) || 0;
    let next = cur + delta;
    if (next < 0.000001) next = 0.01;
    const maxVal = tradeMode === 'SELL' && currentHolding ? currentHolding.shares : 1000000;
    const finalVal = Math.min(maxVal, Number(next.toFixed(next < 1 ? 4 : 2)));
    setPresetShares(finalVal);
  };

  const openTradeModal = (mode: 'BUY' | 'SELL') => {
    setTradeMode(mode);
    setTradeInputType('SHARES');
    const p = quote?.price || 1;
    if (mode === 'SELL' && currentHolding) {
      setSharesInput(currentHolding.shares.toString());
      setCashInput((currentHolding.shares * p).toFixed(2));
    } else {
      const defaultShares = p > 5000 ? 0.05 : p > 500 ? 1 : 10;
      setSharesInput(defaultShares.toString());
      setCashInput((defaultShares * p).toFixed(2));
    }
    setTradeSuccessMsg(null);
    setTradeModalOpen(true);
  };

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || numericShares <= 0) return;

    const totalAmount = numericShares * quote.price;
    const currSym = quote.currency === 'TRY' ? '₺' : '$';

    if (tradeMode === 'BUY') {
      addPosition({
        symbol: quote.symbol,
        shares: Number(numericShares.toFixed(6)),
        avgBuyPrice: quote.price,
        buyDate: new Date().toISOString().split('T')[0],
        currency: quote.currency
      });
      setTradeSuccessMsg(`${numericShares} Lot ${quote.symbol} (${currSym}${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Başarıyla Satın Alındı!`);
    } else {
      const res = sellPosition(quote.symbol, numericShares, quote.price);
      if (res.success) {
        setTradeSuccessMsg(
          `${numericShares} Lot ${quote.symbol} (${currSym}${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) Satışı Gerçekleştirildi!`
        );
      }
    }

    setTimeout(() => {
      setTradeSuccessMsg(null);
      setTradeModalOpen(false);
    }, 1500);
  };

  const isBist = activeSymbol.endsWith('.IS');
  const isTefas = quote?.category === 'TEFAS' || quote?.exchange === 'TEFAS' || quote?.pricingType === 'DAILY_NAV';

  // Dynamic price & change values based on selected timeframe or hovered candle
  const isTimeframeActive = timeframePerf && (timeframePerf.timeframe !== '1D' || timeframePerf.isHovered);
  const displayPrice = isTimeframeActive ? timeframePerf.price : (quote?.price || 0);
  const displayPriceDecimals = isTefas ? 6 : (displayPrice < 10 ? 4 : 2);
  const displayChange = isTimeframeActive ? timeframePerf.change : (quote?.change || 0);
  const displayChangePct = isTimeframeActive ? timeframePerf.changePercent : (quote?.changePercent || 0);
  const isPositive = displayChangePct >= 0;

  // Realized / Projected PnL calculation for modal
  const sellPnlEstimate = currentHolding && quote ? (quote.price - currentHolding.avgBuyPrice) * numericShares : 0;
  const sellPnlPctEstimate = currentHolding && currentHolding.avgBuyPrice > 0 ? ((quote?.price || 0) - currentHolding.avgBuyPrice) / currentHolding.avgBuyPrice * 100 : 0;

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

      {/* Main Stock Header Hero */}
      <div className="bg-[#101520] rounded-2xl px-5 py-4 sm:px-6 sm:py-4.5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 shadow-lg">
        
        {/* Left: Ticker Avatar & Name & Live Price */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#141b27] flex items-center justify-center font-mono font-black text-base text-emerald-400 shadow-sm shrink-0">
              {(quote?.symbol || activeSymbol).replace('.IS', '')}
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight leading-none">
                  {(quote?.symbol || activeSymbol).replace('.IS', '')}
                </h1>

                {/* Repositioned & Elegant Holding Badge */}
                {isOwned && (
                  <div className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-300 leading-tight">
                    <span>Sahip Olunan: <strong className="text-white font-black">{currentHolding.shares}</strong></span>
                    <span className="text-emerald-500/60">•</span>
                    <span>Ortalama Maliyet: <strong className="text-white font-black">{quote?.currency === 'TRY' ? '₺' : '$'}{currentHolding.avgBuyPrice.toFixed(displayPriceDecimals)}</strong></span>
                  </div>
                )}
              </div>

              <p className="text-xs font-mono font-bold text-slate-400 mt-1 leading-tight tracking-wide uppercase">
                {quote?.exchange || (quote?.category === 'TEFAS' ? 'TEFAS' : (isBist ? 'BIST' : 'NASDAQ'))}
              </p>
            </div>
          </div>

          {/* Elegant vertical divider */}
          <div className="hidden sm:block w-px h-10 bg-white/[0.08] self-center shrink-0" />

          {/* Live Price & Change - Located right next to the stock name on the left */}
          <div className="flex items-center pl-0">
            <div className="flex flex-col items-start justify-center">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight leading-none">
                {quote ? (quote.currency === 'TRY' ? `₺${displayPrice.toFixed(displayPriceDecimals)}` : `$${displayPrice.toFixed(2)}`) : '...'}
              </span>

              <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold mt-1">
                <span className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 inline" />}
                  <span>{quote ? `${isPositive ? '+' : ''}${displayChangePct.toFixed(2)}%` : '-'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Buy/Sell Actions & Watchlist */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full xl:w-auto justify-end">
          {/* Favorite Button */}
          <button
            onClick={() => toggleWatchlist(activeSymbol)}
            className={`h-11 w-11 rounded-xl transition flex items-center justify-center shrink-0 shadow-sm ${
              isInWatchlist(activeSymbol)
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[#182030] hover:bg-[#222d42] text-slate-300 hover:text-white'
            }`}
            title={isInWatchlist(activeSymbol) ? (language === 'tr' ? 'İzleme listemden çıkar' : 'Remove from watchlist') : (language === 'tr' ? 'İzleme listeme ekle' : 'Add to watchlist')}
            aria-label="İzleme listesi"
          >
            <Star className={`w-5 h-5 shrink-0 ${isInWatchlist(activeSymbol) ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {/* Alarm Button */}
          <button
            onClick={() => openAlerts(activeSymbol)}
            className={`h-11 w-11 rounded-xl transition flex items-center justify-center shrink-0 shadow-sm relative ${
              alerts.some(a => a.symbol === activeSymbol && a.isActive)
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-[#182030] hover:bg-[#222d42] text-slate-300 hover:text-white'
            }`}
            title={alerts.some(a => a.symbol === activeSymbol && a.isActive)
              ? (language === 'tr' ? 'Fiyat alarmı aktif' : 'Price alert active')
              : (language === 'tr' ? 'Fiyat Alarmı Kur' : 'Set Price Alert')}
            aria-label={language === 'tr' ? 'Fiyat Alarmı' : 'Price Alert'}
          >
            <Bell className={`w-5 h-5 shrink-0 ${alerts.some(a => a.symbol === activeSymbol && a.isActive) ? 'fill-cyan-400 text-cyan-400' : ''}`} />
            {alerts.some(a => a.symbol === activeSymbol && a.isActive) && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#101520]" />
            )}
          </button>

          {/* Compare Button */}
          <button
            onClick={() => addCompareStock(activeSymbol)}
            className="h-11 px-5 sm:px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm font-sans flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/30 active:scale-95 shrink-0"
            title={language === 'tr' ? 'Bu hisseyi karşılaştırma laboratuvarına ekle' : 'Compare this stock'}
          >
            <Scale className="w-4 h-4 stroke-[2.5] text-white shrink-0" />
            <span className="select-none tracking-wide">{language === 'tr' ? 'KARŞILAŞTIR' : 'COMPARE'}</span>
          </button>

          {/* AL & SAT Buttons */}
          {isOwned ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => openTradeModal('BUY')}
                className="h-11 px-5 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm font-sans flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/30 active:scale-95 shrink-0"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5] text-white shrink-0" />
                <span className="select-none tracking-wider">AL</span>
              </button>
              <button
                onClick={() => openTradeModal('SELL')}
                className="h-11 px-5 sm:px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm font-sans flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/30 active:scale-95 shrink-0"
              >
                <TrendingDown className="w-4 h-4 stroke-[2.5] text-white shrink-0" />
                <span className="select-none tracking-wider">SAT</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => openTradeModal('BUY')}
              className="h-11 px-6 sm:px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm font-sans flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/30 active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5] text-white shrink-0" />
              <span className="select-none tracking-wider">AL</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Chart (8 cols) / AI & Indicators (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left Column: Chart & Real Key Stats */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          <StockChart
            symbol={activeSymbol}
            currency={quote?.currency || 'USD'}
            onPerformanceChange={setTimeframePerf}
          />
          <KeyStats quote={quote} loading={loading} />
        </div>

        {/* Right Column: Genuine Math Technical Gauge & News */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <TechnicalGauge data={technicals} loading={techLoading} />
          {!isTefas && <NewsFeed symbol={activeSymbol} />}
        </div>

      </div>

      {/* Similar Sector Peers & Co-Viewed Stocks Section */}
      <SimilarStocks currentSymbol={activeSymbol} />

      {/* Institutional Trade Execution Modal (BUY & SELL with Fractional & Cash amount support) */}
      {tradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div
            className="w-full max-w-lg bg-[#131926] rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header & Mode Switcher */}
            <div className="flex items-center justify-between pb-3.5">
              <div className="flex items-center gap-2 bg-[#0c1018] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTradeMode('BUY')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-black font-mono transition ${
                    tradeMode === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AL
                </button>
                <button
                  type="button"
                  disabled={!isOwned}
                  onClick={() => isOwned && setTradeMode('SELL')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-black font-mono transition ${
                    !isOwned ? 'opacity-40 cursor-not-allowed text-slate-500' :
                    tradeMode === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SAT
                </button>
              </div>

              <button
                onClick={() => setTradeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asset Info Card */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e1420]">
              <div>
                <span className="font-mono font-black text-white text-base block">{quote?.symbol}</span>
                <span className="text-xs text-slate-400">{quote?.trName || quote?.shortName}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-white text-lg block">
                  {quote ? `${quote.currency === 'TRY' ? '₺' : '$'}${quote.price.toFixed(quote.price < 10 ? 4 : 2)}` : '-'}
                </span>
                <span className="text-[11px] text-slate-400">Canlı Piyasa Fiyatı</span>
              </div>
            </div>

            {/* Owned Position Notice if in SELL mode */}
            {tradeMode === 'SELL' && currentHolding && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-bold">Mevcut Pozisyon:</span>
                  <span className="text-rose-300 font-black">{currentHolding.shares} Lot</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-bold">Ortalama Maliyet:</span>
                  <span className="text-slate-200">{quote?.currency === 'TRY' ? '₺' : '$'}{currentHolding.avgBuyPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-bold">Toplam Pozisyon Değeri:</span>
                  <span className="text-white font-bold">{quote?.currency === 'TRY' ? '₺' : '$'}{(currentHolding.shares * (quote?.price || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* Order Method Selector: Adet / Lot ile vs Tutar / Nakit ile */}
            <div className="flex items-center justify-between bg-[#0c1018] p-1 rounded-xl text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setTradeInputType('SHARES')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  tradeInputType === 'SHARES'
                    ? 'bg-[#182030] text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Adet İle</span>
              </button>
              <button
                type="button"
                onClick={() => setTradeInputType('CASH')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition ${
                  tradeInputType === 'CASH'
                    ? 'bg-[#182030] text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Tutar İle</span>
              </button>
            </div>

            <form onSubmit={handleExecuteTrade} className="flex flex-col gap-4">
              {/* PRIMARY INPUT: SHARES OR CASH */}
              {tradeInputType === 'SHARES' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-200 font-bold">
                      {tradeMode === 'BUY' ? 'Alınacak Lot Adedi:' : 'Satılacak Lot Adedi:'}
                    </label>
                    {tradeMode === 'SELL' && currentHolding && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Maks: {currentHolding.shares} Lot
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustShares(numericShares <= 0.1 ? -0.01 : numericShares <= 1 ? -0.1 : -1)}
                      className="w-11 h-12 bg-[#182030] hover:bg-[#222c3f] text-white rounded-xl font-mono font-black text-xl transition active:scale-95"
                    >
                      -
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sharesInput}
                        onChange={(e) => handleSharesChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-4 py-3 text-white font-mono text-center font-black text-xl outline-none transition-colors"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-500 uppercase">
                        LOT
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustShares(numericShares < 0.1 ? 0.01 : numericShares < 1 ? 0.1 : 1)}
                      className="w-11 h-12 bg-[#182030] hover:bg-[#222c3f] text-white rounded-xl font-mono font-black text-xl transition active:scale-95"
                    >
                      +
                    </button>
                  </div>

                  {/* Equivalent Cash Display Subtitle */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
                    <span>Yaklaşık Karşılığı:</span>
                    <span className="text-slate-200 font-bold">
                      ≈ {quote?.currency === 'TRY' ? '₺' : '$'}{(numericShares * (quote?.price || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Quick Preset Chips for Shares */}
                  {tradeMode === 'SELL' && currentHolding ? (
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPresetShares(Number((currentHolding.shares * pct).toFixed(6)))}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition active:scale-95"
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
                          onClick={() => setPresetShares(count)}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition active:scale-95"
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* CASH AMOUNT INPUT */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-200 font-bold">
                      {tradeMode === 'BUY' ? 'Yatırılacak Tutar:' : 'Satılacak Tutar:'}
                    </label>
                    {tradeMode === 'SELL' && currentHolding && quote && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Maks: {quote.currency === 'TRY' ? '₺' : '$'}{(currentHolding.shares * quote.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <div className="absolute left-4 font-mono font-black text-slate-400 text-lg">
                      {quote?.currency === 'TRY' ? '₺' : '$'}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashInput}
                      onChange={(e) => handleCashChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0c1018] hover:bg-[#111722] focus:bg-[#161d2b] rounded-xl px-10 py-3 text-white font-mono text-center font-black text-xl outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Calculated Fractional Lots Subtitle */}
                  <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
                    <span>Satın Alınacak Kesirli Pay:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      ≈ {quote && quote.price > 0 ? (numericCash / quote.price).toFixed(6) : '0.000000'} Lot
                    </span>
                  </div>

                  {/* Quick Preset Chips for Cash Amount */}
                  {tradeMode === 'SELL' && currentHolding && quote ? (
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const targetCash = currentHolding.shares * quote.price * pct;
                            setPresetCash(Number(targetCash.toFixed(2)));
                          }}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition active:scale-95"
                        >
                          {pct === 1.0 ? '%100' : `%${pct * 100}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {(quote?.currency === 'TRY' ? [250, 500, 1000, 5000] : [25, 50, 100, 500]).map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setPresetCash(amount)}
                          className="py-1 px-2 rounded-lg bg-[#182030] hover:bg-[#222c3f] text-slate-300 font-mono text-xs font-bold transition active:scale-95"
                        >
                          {quote?.currency === 'TRY' ? '₺' : '$'}{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Order Calculations Breakdown Summary */}
              <div className="bg-[#0c1018] p-3.5 rounded-xl flex flex-col gap-2 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">Birim Fiyat:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {quote ? `${quote.currency === 'TRY' ? '₺' : '$'}${quote.price.toFixed(quote.price < 10 ? 4 : 2)}` : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">İşlem Miktarı:</span>
                  <span className="font-mono font-black text-white">
                    {numericShares.toFixed(numericShares % 1 === 0 ? 0 : 6)} Lot
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-300 font-sans font-bold">Toplam İşlem Tutarı:</span>
                  <span className="font-mono font-black text-white text-base">
                    {quote ? `${quote.currency === 'TRY' ? '₺' : '$'}${(numericShares * quote.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </span>
                </div>

                {tradeMode === 'SELL' && currentHolding && (
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-400 font-sans">Tahmini Kâr/Zarar:</span>
                    <span className={`font-mono font-black ${sellPnlEstimate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {sellPnlEstimate >= 0 ? '+' : ''}{quote?.currency === 'TRY' ? '₺' : '$'}{sellPnlEstimate.toFixed(2)} ({sellPnlEstimate >= 0 ? '+' : ''}{sellPnlPctEstimate.toFixed(2)}%)
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-sans mt-0.5">
                  <span>Piyasa Emri • Kesirli Pay Alım/Satım Destekli</span>
                </div>
              </div>

              {/* Submit Button & Confirmation */}
              {tradeSuccessMsg ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-center text-xs flex items-center justify-center gap-2 animate-pulse">
                  <Check className="w-5 h-5" />
                  <span>{tradeSuccessMsg}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={numericShares <= 0}
                  className={`w-full py-3.5 rounded-xl text-white font-black text-sm font-mono transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                    tradeMode === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/25'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/25'
                  }`}
                >
                  {tradeMode === 'BUY' ? (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>
                        {numericShares > 0 ? `${Number(numericShares.toFixed(6))} Lot Satın Al` : 'Alım Yap'} 
                        {numericShares > 0 && quote ? ` (${quote.currency === 'TRY' ? '₺' : '$'}${(numericShares * quote.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      <span>
                        {numericShares > 0 ? `${Number(numericShares.toFixed(6))} Lot Sat` : 'Satış Yap'}
                        {numericShares > 0 && quote ? ` (${quote.currency === 'TRY' ? '₺' : '$'}${(numericShares * quote.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                      </span>
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
