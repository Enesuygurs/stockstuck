import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { FundItem } from '../../types/stock';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Star,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldAlert,
  Layers,
  Sparkles,
  DollarSign,
  Globe,
  Cpu,
  Coins,
  Banknote,
  Building2
} from 'lucide-react';

export const FundsView: React.FC = () => {
  const { language, selectStock, toggleWatchlist, isInWatchlist, formatNumber } = useApp();
  const [funds, setFunds] = useState<FundItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof FundItem>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [visibleCount, setVisibleCount] = useState<number>(60);

  const fetchFunds = async () => {
    setLoading(true);
    try {
      const data = await api.getFunds();
      setFunds(data);
    } catch (err) {
      console.warn('Failed to load funds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds();
  }, []);

  const categories = [
    { id: 'ALL', label: "Tüm Fonlar & ETF'ler", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'TEFAS', label: 'Tüm TEFAS Fonları', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'Hisse Senedi', label: 'TEFAS Hisse Senedi', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'Yabancı', label: 'TEFAS Yabancı Teknoloji', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'Kıymetli Maden', label: 'Altın & Kıymetli Maden', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'Değişken', label: 'Değişken & Karma', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'Döviz', label: 'Eurobond & Döviz', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'Para Piyasası', label: 'Para Piyasası & Likit', icon: <Banknote className="w-3.5 h-3.5" /> },
    { id: 'ETF', label: 'Global Endeks ETF', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'CRYPTO', label: 'Spot Kripto ETF', icon: <Coins className="w-3.5 h-3.5" /> },
  ];

  const filteredFunds = useMemo(() => {
    return funds
      .filter((f) => {
        if (activeCategory !== 'ALL') {
          if (activeCategory === 'TEFAS' && f.category !== 'TEFAS') return false;
          if (activeCategory === 'GLOBAL_ETF' && f.category !== 'ETF') return false;
          if (activeCategory === 'CRYPTO' && f.category !== 'CRYPTO') return false;
          if (activeCategory === 'COMMODITY' && f.category !== 'COMMODITY') return false;
          if (activeCategory === 'TECH' && !f.sector?.toLowerCase().includes('teknoloji')) return false;
          if (activeCategory === 'DIVIDEND' && !f.subSector?.toLowerCase().includes('temettü')) return false;
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          f.symbol.toLowerCase().includes(q) ||
          (f.name && f.name.toLowerCase().includes(q)) ||
          (f.trName && f.trName.toLowerCase().includes(q)) ||
          (f.manager && f.manager.toLowerCase().includes(q)) ||
          (f.sector && f.sector.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let valA: any = a[sortField] ?? 0;
        let valB: any = b[sortField] ?? 0;

        if (sortField === 'fee') {
          valA = parseFloat(String(valA).replace('%', '')) || 0;
          valB = parseFloat(String(valB).replace('%', '')) || 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
      });
  }, [funds, searchQuery, activeCategory, sortField, sortOrder]);

  const handleSort = (field: keyof FundItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'symbol' || field === 'name' || field === 'manager' || field === 'category' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: keyof FundItem) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 transition shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400 font-black shrink-0" />
    );
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 bg-[#101520] px-5 py-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                {language === 'tr' ? 'Yatırım Fonları & Global ETF Terminali' : 'Mutual Funds & Global ETFs'}
              </h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400">
                Canlı NAV
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium leading-tight">
              {language === 'tr'
                ? 'S&P 500, NASDAQ 100, Teknoloji, Emtia, Spot Kripto ETF\'leri ve Türkiye TEFAS yatırım fonlarını canlı analiz edin'
                : 'Analyze Global Index ETFs, Sector funds, Spot Crypto ETFs and TEFAS Mutual Funds'}
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center bg-[#161d2c] p-1 rounded-xl text-xs sm:text-sm font-bold gap-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[#222c3f] text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={activeCategory === cat.id ? 'text-emerald-400' : 'text-slate-500'}>
                {cat.icon}
              </span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Fund Highlights (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 font-mono">
        
        {/* Card 1: S&P 500 / Global Index */}
        <div
          onClick={() => selectStock('SPY')}
          className="bg-[#101520] hover:bg-[#141b27] p-5 rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                En Büyük Global ETF
              </span>
            </div>
            <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md">SPDR</span>
          </div>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-400 transition flex items-center justify-between leading-none">
              <span>SPY</span>
              <span className="text-sm font-bold text-slate-300">S&P 500</span>
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              Dünyanın en likit hisse senedi fonu
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Yönetici:</span>
            <span className="font-bold text-slate-200">State Street</span>
          </div>
        </div>

        {/* Card 2: NASDAQ 100 Tech */}
        <div
          onClick={() => selectStock('QQQ')}
          className="bg-[#101520] hover:bg-[#141b27] p-5 rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                Teknoloji & Büyüme
              </span>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md">Invesco</span>
          </div>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-400 transition flex items-center justify-between leading-none">
              <span>QQQ</span>
              <span className="text-sm font-bold text-slate-300">NASDAQ 100</span>
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              NVDA, Apple, Microsoft, Amazon ağırlıklı
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Yönetici:</span>
            <span className="font-bold text-slate-200">Invesco Trust</span>
          </div>
        </div>

        {/* Card 3: Spot Bitcoin ETF */}
        <div
          onClick={() => selectStock('IBIT')}
          className="bg-[#101520] hover:bg-[#141b27] p-5 rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                Lider Kripto ETF
              </span>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md">iShares</span>
          </div>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-400 transition flex items-center justify-between leading-none">
              <span>IBIT</span>
              <span className="text-sm font-bold text-slate-300">Bitcoin Trust</span>
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              BlackRock Spot Bitcoin ETF Fonu
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Yönetici:</span>
            <span className="font-bold text-slate-200">BlackRock</span>
          </div>
        </div>

        {/* Card 4: Ak Portföy Yeni Teknolojiler (AFT) */}
        <div
          onClick={() => selectStock('AFT.IS')}
          className="bg-[#101520] hover:bg-[#141b27] p-5 rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider">
                Popüler TEFAS Fonu
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">Ak Portföy</span>
          </div>

          <div className="my-3">
            <div className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-400 transition flex items-center justify-between leading-none">
              <span>AFT</span>
              <span className="text-sm font-bold text-slate-300">Yeni Teknolojiler</span>
            </div>
            <div className="text-xs text-slate-400 font-sans mt-1.5 leading-tight">
              Global yabancı teknoloji hisseleri
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08] text-xs">
            <span className="font-sans text-slate-400">Yönetici:</span>
            <span className="font-bold text-slate-200">Ak Portföy</span>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#101520] p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fon Kodu, İsim veya Yönetici Ara..."
            className="w-full bg-[#141b27] hover:bg-[#182130] focus:bg-[#1c273a] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none font-medium transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="font-bold text-slate-200">{filteredFunds.length}</span> adet fon listeleniyor
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-[#101520] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-[#0e131d] text-slate-300 text-xs uppercase font-bold select-none">
              <tr>
                <th
                  onClick={() => handleSort('symbol')}
                  className="py-4 px-4 font-sans cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fon Kodu & Adı</span>
                    {renderSortIcon('symbol')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('manager')}
                  className="py-4 px-4 font-sans cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Yönetici Kurum</span>
                    {renderSortIcon('manager')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-4 px-4 font-sans cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori & Tür</span>
                    {renderSortIcon('category')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pay Fiyatı</span>
                    {renderSortIcon('price')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Günlük Değişim</span>
                    {renderSortIcon('changePercent')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('marketCap')}
                  className="py-4 px-4 cursor-pointer hover:text-white transition hidden md:table-cell group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Toplam Fon Büyüklüğü</span>
                    {renderSortIcon('marketCap')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fee')}
                  className="py-4 px-4 hidden lg:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Yıllık Ücret</span>
                    {renderSortIcon('fee')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('risk')}
                  className="py-4 px-4 hidden xl:table-cell cursor-pointer hover:text-white transition group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Risk Derecesi</span>
                    {renderSortIcon('risk')}
                  </div>
                </th>
                <th className="py-4 px-4 text-right font-sans">İşlem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans text-sm animate-pulse">
                    Fon ve ETF verileri yükleniyor...
                  </td>
                </tr>
              ) : filteredFunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans text-sm">
                    Aramanıza uygun fon bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredFunds.slice(0, visibleCount).map((fund) => {
                  const isPositive = (fund.changePercent || 0) >= 0;
                  const isBIST = fund.symbol.endsWith('.IS');
                  const inWatch = isInWatchlist(fund.symbol);

                  return (
                    <tr
                      key={fund.symbol}
                      onClick={() => selectStock(fund.symbol)}
                      className="hover:bg-white/[0.03] transition cursor-pointer group"
                    >
                      {/* Fund Symbol & Name */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#222d42] flex items-center justify-center font-mono font-black text-slate-100 text-xs transition">
                            {fund.symbol.replace('.IS', '').substring(0, 3)}
                          </div>
                          <div className="flex flex-col justify-center">
                            <span className="font-mono font-black text-white text-base block leading-none group-hover:text-emerald-400 transition">
                              {fund.symbol.replace('.IS', '')}
                            </span>
                            <span className="text-xs text-slate-400 font-sans font-medium truncate max-w-[200px] block mt-0.5 leading-tight">
                              {fund.trName || fund.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Manager */}
                      <td className="py-4 px-4 text-slate-200 font-sans font-medium">
                        {fund.manager || (isBIST ? 'Portföy Yönetimi' : 'Global Asset Mgmt')}
                      </td>

                      {/* Sector / Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-[#141b27] text-slate-300">
                          {fund.subSector || fund.sector}
                        </span>
                      </td>

                      {/* NAV / Price */}
                      <td className="py-4 px-4 text-white font-black text-base">
                        {isBIST ? '₺' : '$'}{fund.price ? fund.price.toFixed(2) : '-'}
                      </td>

                      {/* 24h Change */}
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs inline-flex items-center gap-1 ${
                          isPositive ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                        }`}>
                          {isPositive ? '+' : ''}{fund.changePercent ? fund.changePercent.toFixed(2) : '0.00'}%
                        </span>
                      </td>

                      {/* Total AUM / Market Cap */}
                      <td className="py-4 px-4 text-slate-200 font-semibold hidden md:table-cell">
                        {formatNumber(fund.marketCap)}
                      </td>

                      {/* Management Fee */}
                      <td className="py-4 px-4 text-slate-300 hidden lg:table-cell">
                        {fund.fee || (isBIST ? '%2.50' : '%0.15')}
                      </td>

                      {/* Risk Rating 1-7 */}
                      <td className="py-4 px-4 hidden xl:table-cell">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                            <div
                              key={lvl}
                              className={`w-2 h-3.5 rounded-xs ${
                                lvl <= (fund.risk || 5)
                                  ? (fund.risk || 5) >= 6
                                    ? 'bg-rose-500'
                                    : (fund.risk || 5) >= 4
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                  : 'bg-[#182030]'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-slate-400 ml-1 font-bold">
                            {fund.risk || 5}/7
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleWatchlist(fund.symbol)}
                            className={`p-2 rounded-lg transition ${
                              inWatch ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white bg-[#141b27]'
                            }`}
                            title="Takip Listesine Ekle / Çıkar"
                          >
                            <Star className={`w-4 h-4 ${inWatch ? 'fill-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={() => selectStock(fund.symbol)}
                            className="p-2 rounded-lg bg-[#141b27] hover:bg-emerald-600 text-slate-300 hover:text-white transition"
                          >
                            <ExternalLink className="w-4 h-4" />
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

        {/* Load More Pagination Bar */}
        {visibleCount < filteredFunds.length && (
          <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0c1017]">
            <span className="text-xs font-mono text-slate-400">
              Gösterilen: <span className="text-white font-bold">{Math.min(visibleCount, filteredFunds.length)}</span> / {filteredFunds.length} Fon
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setVisibleCount((prev) => prev + 60)}
                className="px-5 py-2.5 rounded-xl bg-[#182030] hover:bg-[#222c3f] text-white text-xs font-bold transition shadow-sm"
              >
                +60 Fon Daha Göster
              </button>
              <button
                onClick={() => setVisibleCount(filteredFunds.length)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition"
              >
                Tümünü Göster ({filteredFunds.length})
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
