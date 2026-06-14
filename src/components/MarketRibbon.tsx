import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MarketIndexItem } from '../types/stock';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const MarketRibbon: React.FC = () => {
  const [indices, setIndices] = useState<MarketIndexItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { selectStock } = useApp();

  const fetchIndices = async () => {
    try {
      const data = await api.getMarketOverview();
      if (data && data.length > 0) {
        setIndices(data);
      }
    } catch (e) {
      console.warn('Market overview ribbon error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderTickerList = (list: MarketIndexItem[], prefix: string) => (
    list.map((idx, i) => {
      const isPositive = idx.changePercent >= 0;
      return (
        <button
          key={`${prefix}-${idx.symbol}-${i}`}
          onClick={() => {
            if (!idx.symbol.startsWith('^') && idx.symbol !== 'USDTRY=X' && idx.symbol !== 'EURTRY=X') {
              selectStock(idx.symbol);
            }
          }}
          className="flex items-center gap-2.5 hover:bg-white/[0.08] px-4 py-2 rounded-lg transition whitespace-nowrap text-left group"
        >
          <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{idx.displayName || idx.shortName}</span>
          </span>
          <span className="font-mono font-bold text-sm text-white">
            {idx.price ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
          </span>
          <span
            className={`text-xs font-mono font-bold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}{idx.changePercent ? idx.changePercent.toFixed(2) : '0.00'}%
          </span>
        </button>
      );
    })
  );

  return (
    <div className="w-full bg-[#080b10] py-1 overflow-hidden flex items-center select-none">
      {loading && indices.length === 0 ? (
        <div className="w-full flex justify-center py-2 text-slate-400 text-sm">
          <span>Endeks verileri alınıyor...</span>
        </div>
      ) : (
        <div className="ticker-marquee">
          {/* First Loop */}
          <div className="flex items-center gap-3 pr-3">
            {renderTickerList(indices, 'loop1')}
          </div>
          {/* Second Loop */}
          <div className="flex items-center gap-3 pr-3" aria-hidden="true">
            {renderTickerList(indices, 'loop2')}
          </div>
        </div>
      )}
    </div>
  );
};
