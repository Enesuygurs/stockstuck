import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { NewsItem } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import { Newspaper } from 'lucide-react';
import { getAssetType } from '../../utils/assetUrl';

interface NewsFeedProps {
  symbol: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ symbol }) => {
  const { language } = useApp();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isFund = getAssetType(symbol) === 'fund';

  useEffect(() => {
    if (isFund) {
      setLoading(false);
      setNews([]);
      return;
    }

    let isMounted = true;
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await api.getNews(symbol);
        if (isMounted) {
          setNews(res || []);
        }
      } catch (err) {
        console.warn('News error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchNews();

    return () => {
      isMounted = false;
    };
  }, [symbol, isFund]);

  // Never show news card if asset is a fund or if there is no news
  if (isFund || news.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#101520] rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-5 h-5 text-sky-400 shrink-0" />
          <h3 className="font-bold text-sm sm:text-base text-white">
            {language === 'tr' ? 'Haberler & Piyasa Gündemi' : 'Market News'}
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono font-bold">{symbol.replace('.IS', '')}</span>
      </div>

      {/* List with generous spacing */}
      <div className="flex flex-col gap-3.5">
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            Haberler taranıyor...
          </div>
        ) : news.length > 0 ? (
          news.slice(0, 5).map((item) => {
            const isBullish = item.sentiment === 'BULLISH';
            const isBearish = item.sentiment === 'BEARISH';
            return (
              <a
                key={item.id}
                href={item.link && item.link !== '#' ? item.link : `https://finance.yahoo.com/quote/${symbol}`}
                target="_blank"
                rel="noreferrer"
                className="p-4 bg-[#131a26] hover:bg-[#172030] rounded-xl flex items-start justify-between gap-4 transition text-left group shadow-sm"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-emerald-400">{item.publisher}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white transition leading-snug">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <span className={`text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold ${
                    isBullish ? 'text-emerald-400 bg-emerald-500/15' :
                    isBearish ? 'text-rose-400 bg-rose-500/15' :
                    'text-slate-300 bg-[#1a2333]'
                  }`}>
                    {isBullish ? 'POZİTİF' : isBearish ? 'NEGATİF' : 'NÖTR'}
                  </span>
                </div>
              </a>
            );
          })
        ) : (
          <div className="py-6 text-center text-slate-400 text-sm">
            Güncel haber bulunamadı.
          </div>
        )}
      </div>

    </div>
  );
};
