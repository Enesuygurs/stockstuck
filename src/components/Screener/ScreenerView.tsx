import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { StockQuote } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronRight,
  Star,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  Globe,
  Building2
} from 'lucide-react';

type ScreenerFilterPreset = 'ALL' | 'GAINERS' | 'LOSERS' | 'VOLUME';

export const ScreenerView: React.FC = () => {
  const { language, selectStock, formatNumber, isInWatchlist, toggleWatchlist } = useApp();
  const [market, setMarket] = useState<'ALL' | 'US' | 'BIST'>('ALL');
  const [filterPreset, setFilterPreset] = useState<ScreenerFilterPreset>('ALL');
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof StockQuote>('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchScreener = async () => {
    setLoading(true);
    try {
      const data = await api.getScreener(market, filterPreset);
      setStocks(data);
    } catch (err) {
      console.warn('Screener error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreener();
    const interval = setInterval(fetchScreener, 15000);
    return () => clearInterval(interval);
  }, [market, filterPreset]);

  const handleSort = (field: keyof StockQuote) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'symbol' || field === 'sector' || field === 'exchange' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: keyof StockQuote) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    );
  };

  const filteredStocks = useMemo(() => {
    return stocks
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(q) ||
          (s.shortName && s.shortName.toLowerCase().includes(q)) ||
          (s.trName && s.trName.toLowerCase().includes(q)) ||
          (s.sector && s.sector.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [stocks, searchQuery, sortField, sortOrder]);

  const presets: { id: ScreenerFilterPreset; labelTr: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'ALL', labelTr: 'Tüm Hisseler', labelEn: 'All Stocks', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'GAINERS', labelTr: 'En Çok Yükselenler', labelEn: 'Top Gainers', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'LOSERS', labelTr: 'En Çok Düşenler', labelEn: 'Top Losers', icon: <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'VOLUME', labelTr: 'Hacim Liderleri', labelEn: 'Volume Leaders', icon: <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> },
  ];

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
              {language === 'tr' ? 'Hisse Tarayıcı & Filtreleme' : 'Stock Screener'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-tight">
              {language === 'tr' ? 'Piyasadaki hisseleri performans ve hacim kriterlerine göre listeleyin' : 'Filter stocks by performance and volume'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-[#161d2c] p-1 rounded-xl text-xs sm:text-sm font-bold gap-1">
            <button
              onClick={() => setMarket('ALL')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${market === 'ALL' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Tümü</span>
            </button>
            <button
              onClick={() => setMarket('US')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${market === 'US' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>NASDAQ</span>
            </button>
            <button
              onClick={() => setMarket('BIST')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${market === 'BIST' ? 'bg-[#222c3f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>BIST 100</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Strategy Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#101520] p-1 rounded-xl text-xs sm:text-sm font-bold">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterPreset(p.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition ${
                filterPreset === p.id
                  ? 'bg-[#1e2738] text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.icon}
              <span>{language === 'tr' ? p.labelTr : p.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'tr' ? 'Tabloda hisse ara...' : 'Filter table...'}
            className="w-full bg-[#101520] hover:bg-[#141b27] focus:bg-[#182130] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-[#0e131d] text-slate-300 font-mono text-xs uppercase font-bold select-none">
              <tr>
                <th className="py-3.5 px-4 w-10"></th>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sembol / Şirket</span>
                    {renderSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fiyat</span>
                    {renderSortIcon('price')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Günlük Değişim</span>
                    {renderSortIcon('changePercent')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('dayHigh')}
                  className="py-3.5 px-4 hidden md:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Günlük Aralık</span>
                    {renderSortIcon('dayHigh')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('volume')}
                  className="py-3.5 px-4 hidden lg:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hacim</span>
                    {renderSortIcon('volume')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marketCap')}
                  className="py-3.5 px-4 hidden xl:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Piyasa Değeri</span>
                    {renderSortIcon('marketCap')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sector')}
                  className="py-3.5 px-4 hidden sm:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sektör</span>
                    {renderSortIcon('sector')}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {loading && stocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Hisseler taranıyor...
                  </td>
                </tr>
              ) : filteredStocks.map((stock) => {
                const isBist = stock.symbol.endsWith('.IS');
                const isPositive = stock.changePercent >= 0;

                return (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-white/[0.03] transition cursor-pointer"
                    onClick={() => selectStock(stock.symbol)}
                  >
                    <td className="py-4 px-4" onClick={(e) => { e.stopPropagation(); toggleWatchlist(stock.symbol); }}>
                      <button className="text-slate-500 hover:text-amber-400 transition">
                        <Star className={`w-4.5 h-4.5 ${isInWatchlist(stock.symbol) ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-white text-base">
                          {stock.symbol}
                        </span>
                        <span className="text-xs text-slate-300 font-medium truncate max-w-xs">
                          {stock.trName || stock.shortName}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-white text-base">
                      {isBist ? '₺' : '$'}{stock.price ? stock.price.toFixed(2) : '-'}
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-sm">
                      <span className={`px-2.5 py-1 rounded-lg ${isPositive ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
                        {isPositive ? '+' : ''}{stock.changePercent ? stock.changePercent.toFixed(2) : '0.00'}%
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300 text-sm hidden md:table-cell">
                      {stock.dayLow} - {stock.dayHigh}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300 text-sm hidden lg:table-cell">
                      {formatNumber(stock.volume)}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-300 text-sm hidden xl:table-cell">
                      {formatNumber(stock.marketCap)}
                    </td>

                    <td className="py-4 px-4 text-slate-300 text-sm hidden sm:table-cell">
                      {stock.sector || '-'}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => selectStock(stock.symbol)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
