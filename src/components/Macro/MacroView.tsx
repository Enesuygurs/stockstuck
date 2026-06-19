import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  MacroAssetItem,
  MacroOverviewResponse,
  MacroCategory,
} from '../../types/stock';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calculator,
  BarChart2,
  Search,
  Globe,
  ExternalLink,
  DollarSign,
  Coins,
  Sparkles,
  Flame,
  Layers,
  Lightbulb,
  LineChart
} from 'lucide-react';
import { StockChart, TimeframePerformance } from '../StockDetail/StockChart';

type MacroSortField = 'symbol' | 'category' | 'price' | 'change' | 'changePercent' | 'range';

export const MacroView: React.FC = () => {
  const { language, selectStock, setActiveTab } = useApp();

  const [data, setData] = useState<MacroOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<MacroCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<MacroSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: MacroSortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'symbol' || field === 'category' ? 'asc' : 'desc');
    }
  };
  
  // Active asset selected for the in-depth chart terminal
  const [selectedAsset, setSelectedAsset] = useState<MacroAssetItem | null>(null);
  const [macroTimeframePerf, setMacroTimeframePerf] = useState<TimeframePerformance | null>(null);

  useEffect(() => {
    setMacroTimeframePerf(null);
  }, [selectedAsset?.symbol]);

  // Live Converter State
  const [convAmount, setConvAmount] = useState<number>(10000);
  const [convFrom, setConvFrom] = useState<string>('TRY');
  const [convTo, setConvTo] = useState<string>('USD');

  const fetchMacroData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getMacroOverview();
      setData(res);
      setSelectedAsset((prev) => {
        if (!prev) {
          return res.heroAssets && res.heroAssets.length > 0 ? res.heroAssets[0] : null;
        }
        // Keep current selected asset updated with live incoming price without resetting selection
        const updated = res.assets.find(a => a.symbol === prev.symbol);
        return updated || prev;
      });
    } catch (err) {
      console.warn('Failed to load macro overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMacroData();
    const interval = setInterval(() => fetchMacroData(false), 8000);
    return () => clearInterval(interval);
  }, []);

  // Filtered and sorted asset list
  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    let list = data.assets;
    if (selectedCategory !== 'ALL') {
      list = list.filter(a => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        a =>
          a.symbol.toLowerCase().includes(q) ||
          a.displayName.toLowerCase().includes(q) ||
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.descriptionTr && a.descriptionTr.toLowerCase().includes(q))
      );
    }

    if (sortField) {
      list = [...list].sort((a, b) => {
        let valA: any = a[sortField as keyof MacroAssetItem];
        let valB: any = b[sortField as keyof MacroAssetItem];

        if (sortField === 'symbol') {
          valA = a.displayName || a.symbol;
          valB = b.displayName || b.symbol;
        } else if (sortField === 'category') {
          valA = a.category || '';
          valB = b.category || '';
        } else if (sortField === 'range') {
          valA = (a.dayHigh || a.price) - (a.dayLow || a.price);
          valB = (b.dayHigh || b.price) - (b.dayLow || b.price);
        }

        if (typeof valA === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      });
    }

    return list;
  }, [data, selectedCategory, searchQuery, sortField, sortDirection]);

  const renderSortIcon = (field: MacroSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition shrink-0" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    );
  };

  // Converter calculations
  const conversionResult = useMemo(() => {
    if (!data?.converterRates || !convAmount) return { result: 0, fromTryValue: 0 };
    const rates = data.converterRates;
    
    // Convert source amount to TRY first
    let amountInTry = convAmount;
    if (convFrom !== 'TRY') {
      const fromRate = rates[convFrom] || 1;
      amountInTry = convAmount * fromRate;
    }

    // Convert TRY value to target
    let targetResult = amountInTry;
    if (convTo !== 'TRY') {
      const toRate = rates[convTo] || 1;
      targetResult = amountInTry / toRate;
    }

    return {
      result: targetResult,
      fromTryValue: amountInTry
    };
  }, [data?.converterRates, convAmount, convFrom, convTo]);

  const handleSwapConverter = () => {
    setConvFrom(convTo);
    setConvTo(convFrom);
  };

  const getCategoryBadge = (category: MacroCategory) => {
    switch (category) {
      case 'FOREX':
        return { label: language === 'tr' ? 'Döviz & Kurlar' : 'Forex', bg: 'bg-emerald-500/15 text-emerald-400' };
      case 'COMMODITY':
        return { label: language === 'tr' ? 'Emtia & Maden' : 'Commodity', bg: 'bg-amber-500/15 text-amber-400' };
      case 'CRYPTO':
        return { label: language === 'tr' ? 'Kripto Varlık' : 'Crypto', bg: 'bg-violet-500/15 text-violet-400' };
      case 'BONDS':
        return { label: language === 'tr' ? 'Tahvil & Makro' : 'Bonds & Yields', bg: 'bg-blue-500/15 text-blue-400' };
      default:
        return { label: 'Makro', bg: 'bg-slate-700/50 text-slate-300' };
    }
  };

  const formatPriceDisplay = (price: number, unit: string, decimals = 2) => {
    if (price === undefined || price === null) return '-';
    let formatted = price.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${formatted} ${unit}`;
  };

  const getMacroAssetIcon = (symbol: string) => {
    if (symbol.includes('USD')) return <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (symbol.includes('EUR')) return <Coins className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    if (symbol.includes('ALTIN') || symbol.includes('GC=F')) return <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (symbol.includes('GUMUS') || symbol.includes('SI=F')) return <Sparkles className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
    if (symbol.includes('CL=F') || symbol.includes('BZ=F')) return <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    if (symbol.includes('BTC') || symbol.includes('ETH')) return <Coins className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    return <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                {language === 'tr' ? 'Makro Piyasa & Çoklu Varlık Paneli' : 'Macro Markets & Multi-Asset Hub'}
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400">
                CANLI 24/7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-tight">
              {language === 'tr'
                ? 'Döviz kurları, değerli madenler, petrol, emtialar, kripto para birimleri ve tahvil göstergelerini canlı analiz edin'
                : 'Real-time Forex currencies, precious metals, crude oil, commodities, crypto assets and yields'}
            </p>
          </div>
        </div>

        {/* Right: Refresh Button */}
        <button
          onClick={() => fetchMacroData(true)}
          disabled={refreshing}
          className="h-9 px-3.5 bg-[#161d2c] hover:bg-[#1f293d] text-slate-300 rounded-xl transition flex items-center gap-2 text-xs font-mono font-bold shrink-0"
          title="Yenile"
          aria-label="Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{language === 'tr' ? 'Yenile' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Top Glance Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5 font-mono">
        {loading && !data ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#101520] animate-pulse rounded-2xl" />
          ))
        ) : (
          data?.heroAssets?.map((asset) => {
            const isSelected = selectedAsset?.symbol === asset.symbol;
            const isPositive = asset.changePercent >= 0;
            const decimals = asset.price < 10 ? 4 : 2;

            return (
              <div
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset)}
                className={`group p-5 rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer transition ${
                  isSelected
                    ? 'bg-[#182235] shadow-lg'
                    : 'bg-[#101520] hover:bg-[#141b27]'
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getMacroAssetIcon(asset.symbol)}
                    <span className="text-xs font-sans font-bold text-slate-400 group-hover:text-white transition truncate">
                      {asset.displayName}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md shrink-0 ${
                      isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </span>
                </div>

                <div className="my-2.5 flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight leading-none">
                    {asset.price.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{asset.unit}</span>
                </div>

                {/* 24h High/Low subtle bar */}
                <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div>
                    <span>D: </span>
                    <b className="text-slate-200 font-bold">{asset.dayLow ? asset.dayLow.toFixed(decimals) : '-'}</b>
                  </div>
                  <div>
                    <span>Y: </span>
                    <b className="text-slate-200 font-bold">{asset.dayHigh ? asset.dayHigh.toFixed(decimals) : '-'}</b>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Interactive Split: Live Cross-Asset Converter & Selected Asset Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Converter Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#101520] p-5 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.08]">
              <Calculator className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex flex-col justify-center">
                <h3 className="text-sm font-black text-white tracking-tight leading-none">
                  {language === 'tr' ? 'Canlı Çapraz Kur & Varlık Çevirici' : 'Live Multi-Asset Currency Converter'}
                </h3>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  {language === 'tr' ? 'Anlık döviz, altın ve kripto dönüşümü' : 'Instant live FX, gold and crypto conversions'}
                </span>
              </div>
            </div>

            {/* Input Amount */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  {language === 'tr' ? 'Miktar' : 'Amount'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={convAmount || ''}
                    onChange={(e) => setConvAmount(parseFloat(e.target.value) || 0)}
                    className="w-full h-11 bg-[#141b27] hover:bg-[#182130] focus:bg-[#1c273a] text-white font-mono font-bold text-base pl-3.5 pr-28 rounded-xl outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="10000"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {[1000, 10000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConvAmount(preset)}
                        className="h-7 px-2.5 rounded-lg bg-[#222c3f] hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300 hover:text-white transition flex items-center justify-center shadow-xs"
                      >
                        {preset >= 1000 ? `${preset / 1000}k` : preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selectors: From & To */}
              <div className="grid grid-cols-2 gap-3 items-center relative">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    {language === 'tr' ? 'Kaynak Varlık' : 'From Asset'}
                  </label>
                  <select
                    value={convFrom}
                    onChange={(e) => setConvFrom(e.target.value)}
                    className="w-full h-10 bg-[#141b27] text-white font-mono font-bold text-xs px-3 rounded-xl focus:outline-none transition cursor-pointer"
                  >
                    <option value="TRY">Türk Lirası (₺)</option>
                    <option value="USD">Amerikan Doları ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">İngiliz Sterlini (£)</option>
                    <option value="GRAM_ALTIN">Gram Altın (gr)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                  </select>
                </div>

                {/* Center Swap Button */}
                <button
                  type="button"
                  onClick={handleSwapConverter}
                  className="absolute left-1/2 top-7 -translate-x-1/2 w-8 h-8 rounded-full bg-[#222c3f] hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition shadow-md z-10"
                  title="Varlıkları Değiştir"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 text-right">
                    {language === 'tr' ? 'Hedef Varlık' : 'To Asset'}
                  </label>
                  <select
                    value={convTo}
                    onChange={(e) => setConvTo(e.target.value)}
                    className="w-full h-10 bg-[#141b27] text-white font-mono font-bold text-xs px-3 rounded-xl focus:outline-none transition cursor-pointer"
                  >
                    <option value="USD">Amerikan Doları ($)</option>
                    <option value="TRY">Türk Lirası (₺)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">İngiliz Sterlini (£)</option>
                    <option value="GRAM_ALTIN">Gram Altın (gr)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="ETH">Ethereum (ETH)</option>
                  </select>
                </div>
              </div>

              {/* Conversion Result Hero Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#162234] to-[#121927] space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {language === 'tr' ? 'Dönüştürülen Tutar' : 'Converted Amount'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    {conversionResult.result.toLocaleString('tr-TR', {
                      minimumFractionDigits: conversionResult.result < 1 ? 6 : 2,
                      maximumFractionDigits: conversionResult.result < 1 ? 6 : 2,
                    })}
                  </span>
                  <span className="text-sm font-mono font-bold text-white">
                    {convTo === 'GRAM_ALTIN' ? 'Gram Altın' : convTo}
                  </span>
                </div>
                
                {/* Equivalent Quick Stats */}
                <div className="pt-2 text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span>≈ {conversionResult.fromTryValue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                  <span>•</span>
                  <span>≈ {(conversionResult.fromTryValue / (data?.converterRates?.USD || 38.65)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} $</span>
                  <span>•</span>
                  <span>≈ {(conversionResult.fromTryValue / (data?.converterRates?.GRAM_ALTIN || 3540)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} gr Altın</span>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Intelligence / Cross-Asset Insights Card */}
          <div className="bg-[#101520] p-5 rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
              <Lightbulb className="w-4.5 h-4.5 text-amber-400 shrink-0" />
              <h3 className="text-white font-bold text-sm">
                {language === 'tr' ? 'Makro Piyasa Notları & Dinamikler' : 'Macro Market Dynamics'}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#141b27]">
                <b className="text-emerald-400 block mb-0.5">Dolar / TL & Gram Altın:</b>
                <span>Gram Altın fiyatı hem Ons Altın ($) hem de Dolar/TL kurundaki hareketlerden çift yönlü çarpanla beslenmektedir.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141b27]">
                <b className="text-amber-400 block mb-0.5">DXY Dolar Endeksi:</b>
                <span>DXY yükseldiğinde küresel emtialar ve gelişen piyasa para birimleri üzerinde satış baskısı artma eğilimindedir.</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141b27]">
                <b className="text-blue-400 block mb-0.5">Petrol & Enflasyon:</b>
                <span>Brent Petrol fiyatlarındaki her 10 dolarlık artış, enerji ithalatçısı ülkelerin cari dengesine doğrudan yansır.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right / In-depth Interactive Chart (8 cols) */}
        <div className="lg:col-span-8 bg-[#101520] p-5 sm:p-6 rounded-2xl shadow-lg">
          {selectedAsset ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#141b27] flex items-center justify-center font-mono font-black text-emerald-400 text-sm">
                    {selectedAsset.symbol.slice(0, 3)}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-black text-lg text-white leading-none">
                        {selectedAsset.displayName}
                      </h3>
                      <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md leading-tight ${getCategoryBadge(selectedAsset.category).bg}`}>
                        {getCategoryBadge(selectedAsset.category).label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-sans block mt-0.5 leading-tight">
                      {selectedAsset.descriptionTr || selectedAsset.name}
                    </span>
                  </div>
                </div>

                {/* Price & Timeframe Return Performance Display */}
                {(() => {
                  const isTimeframeActive = macroTimeframePerf && (macroTimeframePerf.timeframe !== '1D' || macroTimeframePerf.isHovered);
                  const displayPrice = isTimeframeActive ? macroTimeframePerf.price : selectedAsset.price;
                  const displayChange = isTimeframeActive ? macroTimeframePerf.change : selectedAsset.change;
                  const displayChangePct = isTimeframeActive ? macroTimeframePerf.changePercent : selectedAsset.changePercent;
                  const isPositive = displayChangePct >= 0;
                  const decimals = displayPrice < 10 ? 4 : 2;
                  const displayLabel = isTimeframeActive
                    ? macroTimeframePerf.label
                    : (language === 'tr' ? 'Bugün' : 'Today');

                  return (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-xl font-mono font-black text-white">
                            {displayPrice.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{selectedAsset.unit}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{isPositive ? '+' : ''}{displayChangePct.toFixed(2)}%</span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => selectStock(selectedAsset.symbol)}
                        className="h-10 px-3.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/30 active:scale-95 shrink-0"
                        title="Varlık Sayfasına Git ve Al/Sat Yap"
                      >
                        <span>Detay & Al-Sat</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Chart Component for this macro asset */}
              <div className="pt-2">
                <StockChart
                  symbol={selectedAsset.symbol}
                  currency={selectedAsset.currency || 'USD'}
                  onPerformanceChange={setMacroTimeframePerf}
                />
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <BarChart2 className="w-12 h-12 stroke-[1.5]" />
              <span>{language === 'tr' ? 'Grafiği görüntülemek için bir varlık seçin' : 'Select an asset to view chart'}</span>
            </div>
          )}
        </div>

      </div>

      {/* 4. Comprehensive Live Macro Asset Matrix Table */}
      <div className="bg-[#101520] rounded-2xl shadow-lg overflow-hidden">
        
        {/* Table Controls & Filters */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
          {/* Category Tabs */}
          <div className="h-10 flex items-center gap-1 bg-[#141b27] p-1 rounded-xl text-xs font-bold shrink-0 overflow-x-auto">
            {(['ALL', 'FOREX', 'COMMODITY', 'CRYPTO', 'BONDS'] as const).map((cat) => {
              const isActive = selectedCategory === cat;
              const catIcons = {
                ALL: <Layers className="w-3.5 h-3.5" />,
                FOREX: <Coins className="w-3.5 h-3.5" />,
                COMMODITY: <Sparkles className="w-3.5 h-3.5" />,
                CRYPTO: <Coins className="w-3.5 h-3.5" />,
                BONDS: <TrendingUp className="w-3.5 h-3.5" />,
              };
              const labels = {
                ALL: language === 'tr' ? 'Tüm Varlıklar' : 'All Assets',
                FOREX: language === 'tr' ? 'Döviz & Kurlar' : 'Forex',
                COMMODITY: language === 'tr' ? 'Emtia & Maden' : 'Commodities',
                CRYPTO: language === 'tr' ? 'Kripto Paralar' : 'Crypto',
                BONDS: language === 'tr' ? 'Tahvil & Makro' : 'Bonds & Yields',
              };
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-full flex items-center gap-1.5 px-3.5 rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#222c3f] text-emerald-400 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {catIcons[cat]}
                  <span>{labels[cat]}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 h-10">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'tr' ? 'Varlık veya kod ara (Dolar, Altın, BTC)...' : 'Search asset (Gold, BTC)...'}
              className="w-full h-full bg-[#141b27] hover:bg-[#182130] focus:bg-[#1c273a] text-white pl-10 pr-4 rounded-xl text-xs outline-none transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#0e131d] text-slate-400 font-mono text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Varlık / Sembol</span>
                    {renderSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 font-bold text-right cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Son Fiyat</span>
                    {renderSortIcon('price')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('change')}
                  className="py-3.5 px-4 font-bold text-right cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Günlük Fark</span>
                    {renderSortIcon('change')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-3.5 px-4 font-bold text-right cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Günlük %</span>
                    {renderSortIcon('changePercent')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('range')}
                  className="py-3.5 px-4 font-bold text-center cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Gün İçi Aralık</span>
                    {renderSortIcon('range')}
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Makro veriler yükleniyor...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    Aramanıza uygun makro varlık bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isPositive = asset.changePercent >= 0;
                  const decimals = asset.price < 10 ? 4 : 2;
                  const isSelected = selectedAsset?.symbol === asset.symbol;

                  // Range bar calculation
                  const low = asset.dayLow || asset.price * 0.99;
                  const high = asset.dayHigh || asset.price * 1.01;
                  const rangeSpan = Math.max(0.0001, high - low);
                  const currentPosPct = Math.min(100, Math.max(0, ((asset.price - low) / rangeSpan) * 100));

                  return (
                    <tr
                      key={asset.symbol}
                      onClick={() => setSelectedAsset(asset)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? 'bg-emerald-950/20' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Asset & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#182030] flex items-center justify-center font-mono font-bold text-[11px] text-slate-200 shrink-0">
                            {asset.symbol.slice(0, 3)}
                          </div>
                          <div className="flex flex-col justify-center">
                            <div className="font-bold text-white group-hover:text-emerald-400 transition flex items-center gap-1.5 leading-none">
                              <span>{asset.displayName}</span>
                              <span className="text-[10px] font-mono text-slate-500 font-normal">
                                ({asset.symbol})
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block max-w-xs truncate mt-0.5 leading-tight">
                              {asset.descriptionTr || asset.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${getCategoryBadge(asset.category).bg}`}>
                          {getCategoryBadge(asset.category).label}
                        </span>
                      </td>

                      {/* Last Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                        {asset.price.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                        <span className="text-xs text-slate-400 font-normal ml-1">{asset.unit}</span>
                      </td>

                      {/* Change Amount */}
                      <td className={`py-3 px-4 text-right font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{asset.change ? asset.change.toFixed(decimals) : '0.00'}
                      </td>

                      {/* Change Percent */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded-md ${
                            isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Range Visualizer Bar */}
                      <td className="py-3 px-4">
                        <div className="w-44 mx-auto space-y-1">
                          <div className="w-full h-1.5 bg-[#182030] rounded-full overflow-hidden relative">
                            <div
                              className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                              style={{ width: `${currentPosPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>{low.toFixed(decimals < 2 ? decimals : 2)}</span>
                            <span>{high.toFixed(decimals < 2 ? decimals : 2)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsset(asset);
                              window.scrollTo({ top: 200, behavior: 'smooth' });
                            }}
                            className="h-8 px-2.5 rounded-lg bg-[#182030] hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono transition"
                            title="Grafiğe Bak"
                          >
                            Grafik
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectStock(asset.symbol);
                            }}
                            className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 hover:text-white text-emerald-400 text-xs font-bold font-mono transition flex items-center gap-1"
                            title="Detaylı Sayfaya Git ve Al/Sat Yap"
                          >
                            <span>Al / Sat</span>
                            <ExternalLink className="w-3 h-3" />
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

    </div>
  );
};
