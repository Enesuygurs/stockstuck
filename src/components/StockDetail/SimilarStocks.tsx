import React, { useEffect, useState } from 'react';
import { StockQuote } from '../../types/stock';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Sparkles, TrendingUp, TrendingDown, Star, ArrowUpRight } from 'lucide-react';

interface SimilarStocksProps {
  currentSymbol: string;
}

export const SimilarStocks: React.FC<SimilarStocksProps> = ({ currentSymbol }) => {
  const { language, selectStock, toggleWatchlist, isInWatchlist } = useApp();
  const [peers, setPeers] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getSimilarStocks(currentSymbol)
      .then((data: StockQuote[]) => {
        if (isMounted) {
          setPeers(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentSymbol]);

  if (loading) {
    return (
      <div className="bg-[#101520] rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
          <div className="flex flex-col">
            <h3 className="font-bold text-base text-white">
              {language === 'tr' ? 'Benzer Sektör Varlıkları & Birlikte İncelenenler' : 'Similar Sector Peers & Co-Viewed Assets'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'tr' ? 'Sektör ve hacim korelasyonu olan varlıklar yükleniyor...' : 'Loading correlated sector peers...'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[#141b27] p-4 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (peers.length === 0) return null;

  return (
    <div className="bg-[#101520] rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.08]">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="flex flex-col justify-center">
          <h3 className="font-bold text-base text-white leading-tight">
            {language === 'tr' ? 'Benzer Sektör Varlıkları & Birlikte İncelenenler' : 'Similar Sector Peers & Co-Viewed Assets'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-tight">
            {language === 'tr'
              ? 'Bu hisseyi inceleyen yatırımcıların en çok takip ettiği diğer sektör hisseleri'
              : 'Most correlated sector companies and assets tracked by investors'}
          </p>
        </div>
      </div>

      {/* Soft Flat Grid of Similar Stock Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {peers.map((peer) => {
          const isTRY = peer.currency === 'TRY';
          const isPos = peer.changePercent >= 0;
          const isFav = isInWatchlist(peer.symbol);

          return (
            <div
              key={peer.symbol}
              onClick={() => {
                selectStock(peer.symbol);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-[#141b27] hover:bg-[#182030] p-4 rounded-xl flex flex-col justify-between gap-3 cursor-pointer transition shadow-sm group"
            >
              {/* Top Row: Symbol, Star & Sector Badge */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/[0.08] group-hover:border-white/[0.12] transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#222d42] flex items-center justify-center font-mono font-black text-xs text-slate-100 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition">
                    {peer.symbol.replace('.IS', '').substring(0, 3)}
                  </div>
                  <div>
                    <span className="font-mono font-black text-base text-white group-hover:text-emerald-400 transition block leading-none">
                      {peer.symbol.replace('.IS', '')}
                    </span>
                    <span className="text-xs text-slate-400 font-sans font-medium truncate max-w-[120px] block mt-1">
                      {peer.trName || peer.shortName || peer.longName || peer.symbol.replace('.IS', '')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist(peer.symbol);
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    isFav ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={isFav ? 'İzleme listesinden çıkar' : 'İzleme listesine ekle'}
                >
                  <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                </button>
              </div>

              {/* Bottom Row: Price & 24h Return */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {language === 'tr' ? 'Son Fiyat' : 'Price'}
                  </span>
                  <span className="font-mono font-black text-white text-base">
                    {isTRY ? '₺' : '$'}{peer.price.toFixed(peer.price < 10 ? 4 : 2)}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                    isPos ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                  }`}>
                    {isPos ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {isPos ? '+' : ''}{peer.changePercent.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-1 group-hover:text-emerald-400 transition font-medium">
                    <span>{language === 'tr' ? 'İncele' : 'View'}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
