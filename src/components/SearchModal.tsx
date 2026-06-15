import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SearchResultItem } from '../types/stock';
import { Search, X, Sparkles, Building2, Globe2, Layers } from 'lucide-react';

const BIST_POPULAR = [
  { symbol: 'THYAO.IS', name: 'Türk Hava Yolları', sector: 'Havacılık' },
  { symbol: 'GARAN.IS', name: 'Garanti BBVA', sector: 'Bankacılık' },
  { symbol: 'ASELS.IS', name: 'ASELSAN', sector: 'Savunma' },
  { symbol: 'EREGL.IS', name: 'Erdemir', sector: 'Demir Çelik' },
  { symbol: 'TUPRS.IS', name: 'Tüpraş', sector: 'Enerji' },
  { symbol: 'ASTOR.IS', name: 'Astor Enerji', sector: 'Elektrik' },
];

const US_POPULAR = [
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Yapay Zeka & Çip' },
  { symbol: 'AAPL', name: 'Apple', sector: 'Teknoloji' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Bulut & AI' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Otomotiv & Enerji' },
  { symbol: 'PLTR', name: 'Palantir', sector: 'Yapay Zeka Yazılım' },
  { symbol: 'AMZN', name: 'Amazon', sector: 'E-Ticaret & Bulut' },
];

const FUNDS_POPULAR = [
  { symbol: 'SPY', name: 'S&P 500 ETF', sector: 'Geniş Piyasa' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF', sector: 'Teknoloji' },
  { symbol: 'SMH', name: 'Yarı İletken ETF', sector: 'Çip Sektörü' },
  { symbol: 'IBIT', name: 'Spot Bitcoin ETF', sector: 'Kripto Varlık' },
  { symbol: 'THF.IS', name: 'Tera Portföy Hisse Fonu', sector: 'TEFAS Hisse' },
  { symbol: 'AFT.IS', name: 'Ak Portföy Yeni Teknoloji', sector: 'Yabancı Hisse' },
];

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, selectStock, language } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    selectStock(symbol);
    setIsSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].symbol);
      } else if (query.trim()) {
        handleSelect(query.trim().toUpperCase());
      }
    }
  };

  if (!isSearchOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 md:pt-20 px-4 bg-black/80 backdrop-blur-xs transition-all"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="w-full max-w-4xl bg-[#121824] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-6 py-4 bg-[#0d131d]">
          <Search className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'tr' ? 'Hisse kodu, şirket adı veya fon arayın (Örn: NVDA, THYAO, MRVL, THF)...' : 'Search ticker symbol, company name or fund...'}
            className="w-full bg-transparent text-white placeholder-slate-500 text-base sm:text-lg outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-slate-400 hover:text-white mr-2 rounded-lg hover:bg-white/[0.04] transition"
              title="Temizle"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-[#1a2335] rounded-lg font-mono font-bold transition hover:bg-[#222e44]"
          >
            ESC
          </button>
        </div>

        {/* Quick Suggestions & Categories when input is empty */}
        {!query && (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            
            {/* Header intro */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{language === 'tr' ? 'Popüler & Hızlı Erişim Varlıkları' : 'Popular Assets & Quick Access'}</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">18 Seçkin Varlık</span>
            </div>

            {/* 3 Soft Flat Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: BIST 100 */}
              <div className="flex flex-col gap-2 bg-[#0e1420] p-4 rounded-xl">
                <div className="flex items-center justify-between pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">BIST 100</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">BIST</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {BIST_POPULAR.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelect(item.symbol)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b27] hover:bg-[#182030] text-slate-300 text-xs transition group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#222d42] flex items-center justify-center font-mono font-black text-xs text-slate-100 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition">
                          {item.symbol.replace('.IS', '').substring(0, 3)}
                        </div>
                        <div>
                          <span className="font-mono font-black text-white text-sm block leading-none group-hover:text-emerald-400 transition">
                            {item.symbol.replace('.IS', '')}
                          </span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[120px] block mt-0.5">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">{item.sector}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: NASDAQ & Global */}
              <div className="flex flex-col gap-2 bg-[#0e1420] p-4 rounded-xl">
                <div className="flex items-center justify-between pb-2.5">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">NASDAQ Devleri</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">US</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {US_POPULAR.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelect(item.symbol)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b27] hover:bg-[#182030] text-slate-300 text-xs transition group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#222d42] flex items-center justify-center font-mono font-black text-xs text-slate-100 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition">
                          {item.symbol.substring(0, 3)}
                        </div>
                        <div>
                          <span className="font-mono font-black text-white text-sm block leading-none group-hover:text-emerald-400 transition">
                            {item.symbol}
                          </span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[120px] block mt-0.5">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">{item.sector}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 3: Funds & ETFs */}
              <div className="flex flex-col gap-2 bg-[#0e1420] p-4 rounded-xl">
                <div className="flex items-center justify-between pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Fon & ETF'ler</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">TEFAS / ETF</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {FUNDS_POPULAR.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelect(item.symbol)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#141b27] hover:bg-[#182030] text-slate-300 text-xs transition group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#222d42] flex items-center justify-center font-mono font-black text-xs text-emerald-400 group-hover:bg-emerald-500/20 transition">
                          {item.symbol.replace('.IS', '').substring(0, 3)}
                        </div>
                        <div>
                          <span className="font-mono font-black text-white text-sm block leading-none group-hover:text-emerald-400 transition">
                            {item.symbol.replace('.IS', '')}
                          </span>
                          <span className="text-slate-400 text-[11px] truncate max-w-[120px] block mt-0.5">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">{item.sector}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Live Search Results List */}
        {query && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm animate-pulse flex flex-col items-center justify-center gap-3">
                <Search className="w-8 h-8 text-emerald-400 animate-spin" />
                <span>Piyasalar taranıyor...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isBist = item.symbol.endsWith('.IS');
                const isTefas = !isBist && (item.exchange === 'TEFAS' || item.symbol.length === 3);

                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#182030] text-white shadow-sm'
                        : 'hover:bg-[#141b27] text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-[#222d42] text-slate-100'
                      }`}>
                        {item.symbol.replace('.IS', '').substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-white text-base">
                            {item.symbol.replace('.IS', '')}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            isBist ? 'bg-amber-500/20 text-amber-300' :
                            isTefas ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                          }`}>
                            {item.exchange || (isBist ? 'BIST' : 'NASDAQ')}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-sans font-medium block mt-0.5">
                          {item.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
                      <span>Seç</span>
                      <span className="px-2 py-1 bg-[#121824] rounded-lg text-[11px]">↵</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                <Search className="w-8 h-8 text-slate-600 mb-1" />
                <span>"{query}" aramasına uygun hisse veya fon bulunamadı.</span>
                <span className="text-xs text-slate-500">Doğrudan Enter'a basarak grafiği açabilirsiniz.</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Bar with Shortcuts */}
        <div className="px-6 py-3 bg-[#0d131d] text-xs text-slate-400 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#182030] rounded text-[10px] font-mono text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#182030] rounded text-[10px] font-mono text-slate-300">↓</kbd>
              <span>Gezin</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 bg-[#182030] rounded text-[10px] font-mono text-slate-300">Enter</kbd>
              <span>Seç & Aç</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#182030] rounded text-[10px] font-mono text-slate-300">Esc</kbd>
              <span>Kapat</span>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-bold">BIST & NASDAQ Canlı Arama</span>
          </div>
        </div>
      </div>
    </div>
  );
};
