import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../services/api';
import { HeatmapResponse, StockQuote, HeatmapSector } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import { computeSquarifiedTreemap, TreemapItem, TreemapRect } from '../../utils/treemap';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Search,
  LayoutGrid,
  Layers,
  Flame,
  Globe,
  Building2
} from 'lucide-react';

type LayoutMode = 'treemap' | 'grid';

export const HeatmapView: React.FC = () => {
  const { language, selectStock, formatPrice, formatNumber } = useApp();
  const [market, setMarket] = useState<'US' | 'BIST' | 'FUNDS'>('US');
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('treemap');
  const [filterText, setFilterText] = useState<string>('');
  const [hoveredStock, setHoveredStock] = useState<StockQuote | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 1200, h: 720 });

  const fetchHeatmap = async (targetMarket: 'US' | 'BIST' | 'FUNDS') => {
    setLoading(true);
    try {
      const res = await api.getHeatmap(targetMarket);
      setData(res);
    } catch (err) {
      console.warn('Heatmap fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap(market);
    setActiveSector(null);
    const interval = setInterval(() => fetchHeatmap(market), 15000);
    return () => clearInterval(interval);
  }, [market]);

  // Track container size for responsive Treemap
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          const width = entry.contentRect.width;
          const height = Math.max(720, Math.min(960, width * 0.60));
          setContainerSize({ w: width, h: height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getTileColor = (pct: number) => {
    if (pct >= 3) return 'bg-[#10b981] text-slate-950';
    if (pct >= 1.2) return 'bg-[#059669] text-white';
    if (pct > 0.2) return 'bg-[#047857] text-white';
    if (pct >= -0.2) return 'bg-[#283548] text-slate-100';
    if (pct >= -1.2) return 'bg-[#9f1239] text-white';
    if (pct >= -3) return 'bg-[#be123c] text-white';
    return 'bg-[#e11d48] text-white';
  };

  const filteredSectors = useMemo(() => {
    if (!data || !data.sectors) return [];
    let sectors = data.sectors;
    if (activeSector) {
      sectors = sectors.filter(s => s.name === activeSector);
    }
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      return sectors.map(sec => ({
        ...sec,
        stocks: sec.stocks.filter((st: StockQuote) => 
          st.symbol.toLowerCase().includes(q) || 
          (st.shortName && st.shortName.toLowerCase().includes(q)) ||
          (st.trName && st.trName.toLowerCase().includes(q))
        )
      })).filter(sec => sec.stocks.length > 0);
    }
    return sectors;
  }, [data, activeSector, filterText]);

  // Compute Nested Treemap with generous margins and padding
  const treemapLayout = useMemo(() => {
    if (layoutMode !== 'treemap' || filteredSectors.length === 0 || containerSize.w <= 0) {
      return [];
    }

    const { w, h } = containerSize;

    // Step 1: Sector Items
    const sectorItems: TreemapItem<HeatmapSector>[] = filteredSectors.map(sec => {
      const secValue = sec.stocks.reduce((sum: number, s: StockQuote) => sum + Math.max(1, s.marketCap || 1), 0);
      return {
        id: sec.name,
        value: secValue,
        data: sec,
      };
    });

    const sectorRects = computeSquarifiedTreemap(sectorItems, 0, 0, w, h);

    // Step 2: For each sector rect, compute stock rectangles inside it with generous padding & gaps
    const allStockRects: {
      sectorName: string;
      sectorData: HeatmapSector;
      sectorChangeAvg: number;
      sectorRect: { x: number; y: number; w: number; h: number };
      stocks: TreemapRect<StockQuote>[];
    }[] = [];

    const sectorInset = 6; // Generous gap between sectors matching grid gap
    const innerPadding = 12; // Padding inside sector box
    const headerHeight = 52; // Full matching header height with p-4 pb-3 padding

    sectorRects.forEach(secRect => {
      const sec = secRect.item.data;
      
      const sX = secRect.x + sectorInset;
      const sY = secRect.y + sectorInset;
      const sW = Math.max(10, secRect.w - sectorInset * 2);
      const sH = Math.max(10, secRect.h - sectorInset * 2);

      const innerX = sX + innerPadding;
      const innerY = sY + headerHeight + 8;
      const innerW = Math.max(10, sW - innerPadding * 2);
      const innerH = Math.max(10, sH - headerHeight - 8 - innerPadding);

      const stockItems: TreemapItem<StockQuote>[] = sec.stocks.map((st: StockQuote) => ({
        id: st.symbol,
        value: Math.max(1, st.marketCap || 1),
        data: st,
      }));

      const stockRects = computeSquarifiedTreemap(stockItems, innerX, innerY, innerW, innerH);
      const sectorChangeAvg = sec.stocks.reduce((acc: number, s: StockQuote) => acc + (s.changePercent || 0), 0) / (sec.stocks.length || 1);

      allStockRects.push({
        sectorName: sec.name,
        sectorData: sec,
        sectorChangeAvg,
        sectorRect: { x: sX, y: sY, w: sW, h: sH },
        stocks: stockRects,
      });
    });

    return allStockRects;
  }, [filteredSectors, containerSize, layoutMode]);

  const marketStats = useMemo(() => {
    if (!data || !data.stocks) return { gainers: 0, losers: 0, unchanged: 0 };
    let gainers = 0, losers = 0, unchanged = 0;
    for (const s of data.stocks) {
      if (s.changePercent > 0) gainers++;
      else if (s.changePercent < 0) losers++;
      else unchanged++;
    }
    return { gainers, losers, unchanged };
  }, [data]);

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        
        {/* Title & Market Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="flex flex-col justify-center">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                {language === 'tr' ? 'Borsa Isı Haritası' : 'Market Heatmap'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 leading-tight">
                {language === 'tr' ? 'Piyasa değerine göre orantılı canlı sektör ağaç haritası' : 'Real-time market cap weighted heatmap'}
              </p>
            </div>
          </div>

          {/* Market Switcher */}
          <div className="flex items-center bg-[#161d2c] p-1 rounded-xl text-xs sm:text-sm font-bold shrink-0 gap-1">
            <button
              onClick={() => { setMarket('US'); setFilterText(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                market === 'US' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>NASDAQ</span>
            </button>
            <button
              onClick={() => { setMarket('BIST'); setFilterText(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                market === 'BIST' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>BIST 100</span>
            </button>
            <button
              onClick={() => { setMarket('FUNDS'); setFilterText(''); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                market === 'FUNDS' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Fonlar & ETF</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Quick Filter & Layout Switcher & Refresh */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          
          {/* Quick Heatmap Filter */}
          <div className="relative w-44 sm:w-48 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Haritada filtrele..."
              className="w-full bg-[#161d2c] hover:bg-[#1a2334] focus:bg-[#1e293b] rounded-xl pl-8 pr-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Layout Mode Switcher */}
          <div className="flex items-center bg-[#161d2c] p-1 rounded-xl text-xs sm:text-sm font-bold shrink-0">
            <button
              onClick={() => setLayoutMode('treemap')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
                layoutMode === 'treemap' ? 'bg-[#222c3f] text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Oransal Ağaç Haritası (Finviz Stili)"
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Oransal Harita</span>
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
                layoutMode === 'grid' ? 'bg-[#222c3f] text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Düzenli Izgara Görünümü"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span>Düzenli Izgara</span>
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchHeatmap(market)}
            disabled={loading}
            className="p-2 bg-[#161d2c] hover:bg-[#1f293d] text-slate-300 rounded-xl transition shrink-0"
            title="Yenile"
            aria-label="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-bar: Sector Filter Breadcrumb & Live Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm bg-[#101520]/80 p-3.5 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSector(null)}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
              activeSector === null ? 'bg-[#182030] text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'tr' ? 'Tüm Sektörler' : 'All Sectors'} ({data?.stocks?.length || 0})
          </button>
          {activeSector && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <button
                onClick={() => setActiveSector(null)}
                className="font-extrabold text-slate-100 bg-[#182030] px-3.5 py-1.5 rounded-lg hover:bg-[#222c3f] transition"
                title="Sektör filtresini kaldır"
              >
                {activeSector}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-5 text-sm font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {marketStats.gainers} Yükselen
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4" />
            {marketStats.losers} Düşen
          </span>
        </div>
      </div>

      {/* Main Heatmap Area */}
      <div ref={containerRef} className="w-full bg-[#0c1018] rounded-2xl p-3 overflow-hidden shadow-2xl relative">
        {loading && !data ? (
          <div className="w-full h-[600px] flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="font-medium">Canlı piyasa verileri hesaplanıyor...</span>
          </div>
        ) : filteredSectors.length === 0 ? (
          <div className="w-full h-80 flex items-center justify-center text-slate-400 text-sm">
            Arama kriterine uygun hisse bulunamadı.
          </div>
        ) : layoutMode === 'treemap' ? (
          /* Treemap with generous margins between sectors and tiles */
          <div
            className="relative w-full overflow-hidden select-none"
            style={{ height: `${containerSize.h}px` }}
          >
            {treemapLayout.map((secGroup) => (
              <div
                key={secGroup.sectorName}
                className="absolute bg-[#121824] rounded-2xl overflow-hidden shadow-lg"
                style={{
                  left: `${secGroup.sectorRect.x}px`,
                  top: `${secGroup.sectorRect.y}px`,
                  width: `${secGroup.sectorRect.w}px`,
                  height: `${secGroup.sectorRect.h}px`,
                }}
              >
                {/* Sector Header matching regular grid header exactly */}
                <div
                  onClick={() => setActiveSector(activeSector === secGroup.sectorName ? null : secGroup.sectorName)}
                  className="p-4 pb-3 flex items-center justify-between cursor-pointer group select-none"
                  title="Bu sektöre odaklan"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-emerald-400 transition truncate">
                      {secGroup.sectorName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      ({secGroup.sectorData.stocks.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono font-bold text-sm shrink-0 ml-2">
                    <span className={secGroup.sectorChangeAvg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {secGroup.sectorChangeAvg >= 0 ? '+' : ''}{secGroup.sectorChangeAvg.toFixed(2)}%
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                  </div>
                </div>

                {/* Stocks inside Sector with generous tile gaps */}
                {secGroup.stocks.map((stRect) => {
                  const stock = stRect.item.data;
                  const pct = stock.changePercent || 0;
                  const tileBg = getTileColor(pct);
                  const isBist = stock.symbol.endsWith('.IS');

                  // Generous 5px-6px gap around each tile
                  const tileGap = 3;
                  const relX = stRect.x - secGroup.sectorRect.x + tileGap;
                  const relY = stRect.y - secGroup.sectorRect.y + tileGap;
                  const tileW = Math.max(4, stRect.w - tileGap * 2);
                  const tileH = Math.max(4, stRect.h - tileGap * 2);

                  const isTiny = tileW < 52 || tileH < 42;
                  const isMedium = tileW >= 85 && tileH >= 65;
                  const isLarge = tileW >= 130 && tileH >= 85;

                  return (
                    <div
                      key={stock.symbol}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectStock(stock.symbol)}
                      onKeyDown={(e) => e.key === 'Enter' && selectStock(stock.symbol)}
                      onMouseEnter={(e) => {
                        setHoveredStock(stock);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredStock(null)}
                      className={`absolute cursor-pointer rounded-lg p-1.5 flex flex-col justify-center items-center text-center transition-all hover:brightness-110 shadow-md ${tileBg}`}
                      style={{
                        left: `${relX}px`,
                        top: `${relY}px`,
                        width: `${tileW}px`,
                        height: `${tileH}px`,
                      }}
                    >
                      <span className={`font-mono font-black tracking-tight leading-none ${
                        isLarge ? 'text-lg' : isMedium ? 'text-sm sm:text-base' : isTiny ? 'text-[10px]' : 'text-xs'
                      }`}>
                        {stock.symbol.replace('.IS', '')}
                      </span>

                      <span className={`font-mono font-black tracking-tight mt-1 leading-none ${
                        isLarge ? 'text-base' : isMedium ? 'text-xs sm:text-sm' : isTiny ? 'text-[9px]' : 'text-[11px]'
                      }`}>
                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </span>

                      {isMedium && (
                        <span className="text-[10px] font-mono font-bold opacity-90 mt-1">
                          {isBist ? '₺' : '$'}{stock.price ? stock.price.toFixed(2) : '-'}
                        </span>
                      )}

                      {isLarge && (
                        <span className="text-[10px] opacity-80 truncate max-w-[90%] mt-0.5">
                          {stock.trName || stock.shortName}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* Symmetrical Clean Grid Mode with generous spacing */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-2">
            {filteredSectors.map((sector) => {
              const sectorChangeAvg = sector.stocks.reduce((acc, s) => acc + (s.changePercent || 0), 0) / (sector.stocks.length || 1);
              return (
                <div
                  key={sector.name}
                  className="bg-[#121824] rounded-2xl p-4 flex flex-col gap-3.5 shadow-lg"
                >
                  <div
                    onClick={() => setActiveSector(activeSector === sector.name ? null : sector.name)}
                    className="flex items-center justify-between cursor-pointer group pb-3 select-none"
                    title="Bu sektöre odaklan"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-emerald-400 transition">
                        {sector.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({sector.stocks.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                      <span className={sectorChangeAvg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {sectorChangeAvg >= 0 ? '+' : ''}{sectorChangeAvg.toFixed(2)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                    </div>
                  </div>

                  {/* Uniform Perfect Matrix Grid with generous gaps */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                    {sector.stocks.map((stock) => {
                      const pct = stock.changePercent || 0;
                      const tileBg = getTileColor(pct);
                      const isBist = stock.symbol.endsWith('.IS');

                      return (
                        <div
                          key={stock.symbol}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectStock(stock.symbol)}
                          onKeyDown={(e) => e.key === 'Enter' && selectStock(stock.symbol)}
                          onMouseEnter={(e) => {
                            setHoveredStock(stock);
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredStock(null)}
                          className={`cursor-pointer rounded-xl p-3 flex flex-col justify-between h-[92px] transition-all hover:brightness-110 shadow-md ${tileBg}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-mono font-black text-sm sm:text-base tracking-tight leading-none">
                              {stock.symbol.replace('.IS', '')}
                            </span>
                            <span className="text-xs opacity-90 font-mono font-bold">
                              {isBist ? '₺' : '$'}{stock.price ? stock.price.toFixed(2) : '-'}
                            </span>
                          </div>

                          <div className="flex items-end justify-between mt-1">
                            <span className="text-xs sm:text-sm font-mono font-black tracking-tight leading-none">
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                            <span className="text-[11px] opacity-85 font-medium truncate max-w-[80px]">
                              {stock.trName || stock.shortName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Tooltip */}
        {hoveredStock && (
          <div
            className="fixed pointer-events-none z-50 bg-[#161d2b] rounded-2xl p-4 shadow-2xl w-80 text-sm flex flex-col gap-2.5 font-sans"
            style={{
              left: Math.min(window.innerWidth - 340, tooltipPos.x + 15),
              top: Math.min(window.innerHeight - 240, tooltipPos.y + 15),
            }}
          >
            <div className="flex items-center justify-between pb-2.5">
              <div>
                <span className="font-mono font-black text-white text-base">
                  {hoveredStock.symbol}
                </span>
                <div className="text-xs text-slate-300 font-medium truncate max-w-[160px]">
                  {hoveredStock.trName || hoveredStock.longName || hoveredStock.shortName}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-slate-100 text-base">
                  {formatPrice(hoveredStock.price, hoveredStock.currency)}
                </div>
                <div
                  className={`font-mono font-black text-sm ${
                    hoveredStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hoveredStock.changePercent >= 0 ? '+' : ''}{hoveredStock.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs py-2">
              <div>
                <span className="text-slate-400 block text-xs">Günlük Aralık</span>
                <span className="font-mono font-bold text-slate-200">{hoveredStock.dayLow} - {hoveredStock.dayHigh}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">52 Haftalık</span>
                <span className="font-mono font-bold text-slate-200">{hoveredStock.fiftyTwoWeekLow} - {hoveredStock.fiftyTwoWeekHigh}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Hacim</span>
                <span className="font-mono font-bold text-slate-200">{formatNumber(hoveredStock.volume)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Piyasa Değeri</span>
                <span className="font-mono font-bold text-slate-200">{formatNumber(hoveredStock.marketCap)}</span>
              </div>
            </div>

            <div className="pt-0.5 text-xs text-emerald-400 flex items-center justify-between font-semibold">
              <span>Detaylı grafik için tıklayın</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
