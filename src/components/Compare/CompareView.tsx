import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StockQuote, Candle } from '../../types/stock';
import { Plus, X, Scale, LineChart, Table, Layers, ArrowUpRight } from 'lucide-react';

const COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#a855f7', '#f43f5e'];

export const CompareView: React.FC = () => {
  const { language, formatNumber, selectStock, compareSymbols, setCompareSymbols } = useApp();
  const [inputSymbol, setInputSymbol] = useState('');
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [charts, setCharts] = useState<Record<string, Candle[]>>({});
  const [timeframe, setTimeframe] = useState<'1M' | '6M' | '1Y'>('1M');
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchCompareData = async () => {
    setLoading(true);
    const quoteMap: Record<string, StockQuote> = {};
    const chartMap: Record<string, Candle[]> = {};

    const range = timeframe === '1M' ? '1mo' : timeframe === '6M' ? '6mo' : '1y';

    await Promise.all(
      compareSymbols.map(async (sym) => {
        try {
          const q = await api.getStockQuote(sym);
          quoteMap[sym] = q;
          const c = await api.getChartData(sym, range, '1d');
          if (c && c.candles && c.candles.length > 0) {
            chartMap[sym] = c.candles;
          }
        } catch (e) {
          console.warn('Compare fetch error for', sym, e);
        }
      })
    );

    setQuotes(quoteMap);
    setCharts(chartMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompareData();
  }, [compareSymbols, timeframe]);

  const addSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (clean && !compareSymbols.includes(clean) && compareSymbols.length < 5) {
      setCompareSymbols([...compareSymbols, clean]);
      setInputSymbol('');
    }
  };

  const removeSymbol = (sym: string) => {
    if (compareSymbols.length > 1) {
      setCompareSymbols(compareSymbols.filter(s => s !== sym));
    }
  };

  // Build a true Unified Date Timeline for perfect synchronization across US and BIST stocks
  const unifiedData = useMemo(() => {
    // 1. Gather all unique timestamps across all stocks
    const timestampSet = new Set<number>();
    compareSymbols.forEach((sym) => {
      const list = charts[sym] || [];
      list.forEach(c => timestampSet.add(c.time));
    });

    const timestamps = Array.from(timestampSet).sort((a, b) => a - b);
    if (timestamps.length < 2) {
      return { timestamps: [], series: [], minPct: -5, maxPct: 5 };
    }

    // 2. Build map of time -> close for each stock
    const stockPriceMaps: Record<string, Map<number, number>> = {};
    compareSymbols.forEach((sym) => {
      const list = charts[sym] || [];
      const map = new Map<number, number>();
      list.forEach(c => map.set(c.time, c.close));
      stockPriceMaps[sym] = map;
    });

    // 3. For each stock, fill in prices for all timestamps (forward fill missing days) and normalize %
    let minPct = 0;
    let maxPct = 0;

    const series = compareSymbols.map((sym, idx) => {
      const map = stockPriceMaps[sym];
      const candleList = charts[sym] || [];
      const basePrice = candleList.length > 0 ? candleList[0].close : 1;

      let lastPrice = basePrice;
      const normalizedPoints: { time: number; pct: number; price: number }[] = [];

      timestamps.forEach(t => {
        if (map.has(t)) {
          lastPrice = map.get(t)!;
        }
        const pct = basePrice > 0 ? ((lastPrice - basePrice) / basePrice) * 100 : 0;
        if (pct < minPct) minPct = pct;
        if (pct > maxPct) maxPct = pct;
        normalizedPoints.push({ time: t, pct, price: lastPrice });
      });

      const totalReturnPct = normalizedPoints.length > 0 ? normalizedPoints[normalizedPoints.length - 1].pct : 0;

      return {
        symbol: sym,
        color: COLORS[idx % COLORS.length],
        points: normalizedPoints,
        totalReturnPct,
      };
    });

    const range = (maxPct - minPct) || 1;
    minPct -= range * 0.1;
    maxPct += range * 0.1;

    return { timestamps, series, minPct, maxPct };
  }, [charts, compareSymbols]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
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
    const padding = { top: 25, right: 65, bottom: 35, left: 15 };

    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, width, height);

    const { timestamps, series, minPct, maxPct } = unifiedData;
    if (timestamps.length < 2 || series.length === 0) return;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getY = (pct: number) => {
      return padding.top + (1 - (pct - minPct) / (maxPct - minPct)) * chartH;
    };

    const getX = (idx: number) => {
      return padding.left + (idx / (timestamps.length - 1)) * chartW;
    };

    // Horizontal Grid Lines & Percentage Axis
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const pctVal = minPct + (i / gridSteps) * (maxPct - minPct);
      const y = getY(pctVal);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${pctVal >= 0 ? '+' : ''}${pctVal.toFixed(1)}%`, width - padding.right + 8, y + 4);
    }

    // Zero Line Highlight
    const zeroY = getY(0);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('0.0%', width - padding.right + 8, zeroY + 4);

    // Date Axis Labels (X Axis)
    const dateStep = Math.max(1, Math.floor(timestamps.length / 6));
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    for (let i = 0; i < timestamps.length; i += dateStep) {
      const x = getX(i);
      const dateStr = new Date(timestamps[i] * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      ctx.fillText(dateStr, x, height - 10);
    }

    // Draw Smooth Normalized Return Lines for each stock
    series.forEach(({ color, points }) => {
      if (points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.moveTo(getX(0), getY(points[0].pct));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(getX(i), getY(points[i].pct));
      }
      ctx.stroke();
    });

    // Crosshair on Hover
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < timestamps.length) {
      const crossX = getX(hoverIndex);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(crossX, padding.top);
      ctx.lineTo(crossX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw dot on each stock line at hover position
      series.forEach(({ color, points }) => {
        if (points[hoverIndex]) {
          const ptY = getY(points[hoverIndex].pct);
          ctx.beginPath();
          ctx.arc(crossX, ptY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

  }, [unifiedData, hoverIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { timestamps } = unifiedData;
    if (timestamps.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const paddingLeft = 15;
    const paddingRight = 65;
    const chartW = rect.width - paddingLeft - paddingRight;

    const x = e.clientX - rect.left - paddingLeft;
    const ratio = Math.max(0, Math.min(1, x / chartW));
    const idx = Math.round(ratio * (timestamps.length - 1));

    setHoverIndex(idx);
  };

  const activeDateString = hoverIndex !== null && unifiedData.timestamps[hoverIndex]
    ? new Date(unifiedData.timestamps[hoverIndex] * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
              {language === 'tr' ? 'Hisse Karşılaştırma Laboratuvarı' : 'Stock Comparison'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-tight">
              {language === 'tr' ? 'Hisselerin normalize getiri eğrilerini ortak zaman ekseninde karşılaştırın' : 'Compare normalized return curves on a unified timeline'}
            </p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-[#161d2c] p-1 rounded-xl text-xs sm:text-sm font-mono font-bold">
          {(['1M', '6M', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                timeframe === tf ? 'bg-[#222c3f] text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Stock Badges & Add Stock Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#101520] px-4 py-2.5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Hisseler:</span>
          </div>

          {compareSymbols.map((sym, idx) => {
            const seriesItem = unifiedData.series.find(s => s.symbol === sym);
            const isPos = seriesItem ? seriesItem.totalReturnPct >= 0 : true;

            return (
              <div
                key={sym}
                onClick={() => selectStock(sym)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectStock(sym);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141b27] hover:bg-[#182130] hover:border-emerald-500/40 border border-transparent transition shadow-xs group cursor-pointer"
                title={`${sym} detay sayfasına git`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="font-mono font-black text-xs text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                  {sym.replace('.IS', '')}
                  <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-slate-400 group-hover:text-emerald-400" />
                </span>
                {seriesItem && (
                  <span className={`font-mono font-bold text-xs ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? '+' : ''}{seriesItem.totalReturnPct.toFixed(2)}%
                  </span>
                )}
                {compareSymbols.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSymbol(sym);
                    }}
                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-0.5 rounded transition ml-0.5"
                    title={language === 'tr' ? 'Karşılaştırmadan Kaldır' : 'Remove'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Input */}
        {compareSymbols.length < 5 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSymbol(inputSymbol);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              placeholder={language === 'tr' ? 'Hisse / Fon Kodu' : 'Ticker / Fund'}
              className="bg-[#141b27] hover:bg-[#182130] focus:bg-[#1c273a] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-36 font-mono font-semibold transition-colors"
            />
            <button type="submit" className="p-2 bg-[#141b27] hover:bg-[#1f293d] text-slate-300 hover:text-white rounded-xl transition">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Chart Section */}
      <div className="bg-[#101520] rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
        
        {/* HUD Info Bar on Hover */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm pb-3">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-sky-400 shrink-0" />
            <span className="font-bold text-white">Normalize Getiri (%)</span>
            <span className="text-xs font-mono text-slate-400">Başlangıç = 0.0%</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {activeDateString ? (
              <span className="text-slate-300 font-bold bg-[#141b27] px-2.5 py-1 rounded-lg">
                {activeDateString}
              </span>
            ) : (
              <span className="text-slate-400 font-sans">
                Grafiğin üzerine gelerek tarihe göre getiri farklarını inceleyebilirsiniz.
              </span>
            )}
          </div>
        </div>

        {/* Live Hover Stock Scoreboard */}
        {hoverIndex !== null && (
          <div className="flex flex-wrap items-center gap-2 bg-[#141b27] p-2 rounded-xl font-mono text-xs">
            {unifiedData.series.map((s) => {
              const pt = s.points[hoverIndex];
              const isPos = pt ? pt.pct >= 0 : true;
              return (
                <div
                  key={s.symbol}
                  onClick={() => selectStock(s.symbol)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectStock(s.symbol);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1420] hover:bg-[#182130] hover:border-emerald-500/40 border border-transparent transition cursor-pointer group"
                  title={`${s.symbol} detay sayfasına git`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: s.color }} />
                  <span className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-0.5">
                    {s.symbol}:
                    <ArrowUpRight className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-slate-400 group-hover:text-emerald-400" />
                  </span>
                  <span className={`font-black ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pt ? `${isPos ? '+' : ''}${pt.pct.toFixed(2)}%` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Canvas */}
        <div className="relative w-full h-[440px] bg-[#0c1018] rounded-xl overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Grafikler senkronize ediliyor...
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
              className="w-full h-full cursor-crosshair block"
            />
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Metric Table */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 bg-[#0e131d] flex items-center gap-2.5">
          <Table className="w-5 h-5 text-emerald-400 shrink-0" />
          <h3 className="font-bold text-base text-white">
            Detaylı Finansal Metrik Karşılaştırması
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-[#0e131d] text-slate-300 text-xs uppercase font-bold select-none">
              <tr>
                <th className="py-4 px-5 font-sans">Finansal Metrik</th>
                {compareSymbols.map((sym, idx) => (
                  <th key={sym} className="py-4 px-5 font-bold">
                    <button
                      type="button"
                      onClick={() => selectStock(sym)}
                      className="inline-flex items-center gap-2 cursor-pointer group hover:text-emerald-400 transition-colors text-left"
                      title={`${sym} detay sayfasına git`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-white font-mono group-hover:text-emerald-400 transition-colors flex items-center gap-1">
                        {sym}
                        <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-slate-400 group-hover:text-emerald-400" />
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              <tr>
                <td className="py-4 px-5 text-slate-300 font-sans font-medium">Dönem Getirisi ({timeframe})</td>
                {compareSymbols.map((sym) => {
                  const s = unifiedData.series.find(item => item.symbol === sym);
                  const isPos = s ? s.totalReturnPct >= 0 : true;
                  return (
                    <td key={sym} className={`py-4 px-5 font-black text-base ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s ? `${isPos ? '+' : ''}${s.totalReturnPct.toFixed(2)}%` : '-'}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-4 px-5 text-slate-300 font-sans font-medium">Anlık Fiyat</td>
                {compareSymbols.map((sym) => {
                  const q = quotes[sym];
                  const isBist = sym.endsWith('.IS');
                  return (
                    <td key={sym} className="py-4 px-5 font-bold text-white text-base">
                      {q ? `${isBist ? '₺' : '$'}${q.price.toFixed(2)}` : '-'}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-4 px-5 text-slate-300 font-sans font-medium">Günlük Değişim %</td>
                {compareSymbols.map((sym) => {
                  const q = quotes[sym];
                  const isPos = q ? q.changePercent >= 0 : true;
                  return (
                    <td key={sym} className={`py-4 px-5 font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {q ? `${isPos ? '+' : ''}${q.changePercent.toFixed(2)}%` : '-'}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-4 px-5 text-slate-300 font-sans font-medium">Piyasa Değeri</td>
                {compareSymbols.map((sym) => {
                  const q = quotes[sym];
                  return (
                    <td key={sym} className="py-4 px-5 text-slate-200 font-semibold">
                      {q ? formatNumber(q.marketCap) : '-'}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-4 px-5 text-slate-300 font-sans font-medium">52 Haftalık Aralık</td>
                {compareSymbols.map((sym) => {
                  const q = quotes[sym];
                  return (
                    <td key={sym} className="py-4 px-5 text-slate-200">
                      {q ? `${q.fiftyTwoWeekLow} - ${q.fiftyTwoWeekHigh}` : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
