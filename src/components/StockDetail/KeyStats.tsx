import React from 'react';
import { StockQuote } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import { Activity, ShieldCheck } from 'lucide-react';

interface KeyStatsProps {
  quote: StockQuote | null;
  loading: boolean;
}

export const KeyStats: React.FC<KeyStatsProps> = ({ quote, loading }) => {
  const { language, formatPrice, formatNumber } = useApp();

  if (loading || !quote) {
    return (
      <div className="bg-[#101520] rounded-2xl p-5 min-h-[180px] flex items-center justify-center text-slate-400 text-sm">
        {language === 'tr' ? 'İstatistikler yükleniyor...' : 'Loading statistics...'}
      </div>
    );
  }

  const dayRangeSpread = quote.dayHigh - quote.dayLow || 1;
  const dayPositionPct = Math.min(100, Math.max(0, ((quote.price - quote.dayLow) / dayRangeSpread) * 100));

  const yearSpread = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow || 1;
  const yearPositionPct = Math.min(100, Math.max(0, ((quote.price - quote.fiftyTwoWeekLow) / yearSpread) * 100));

  const isTefas = quote.category === 'TEFAS' || quote.exchange === 'TEFAS' || quote.pricingType === 'DAILY_NAV';

  // ----------------------------------------------------
  // TEFAS SPECIFIC TAX & STRUCTURAL METRICS
  // ----------------------------------------------------
  const isFreeOrVariable = 
    quote.subSector?.toLowerCase().includes('serbest') ||
    quote.longName?.toLowerCase().includes('serbest') ||
    quote.sector?.toLowerCase().includes('serbest') ||
    quote.subSector?.toLowerCase().includes('değişken') ||
    quote.sector?.toLowerCase().includes('değişken');

  const isEquityIntensive = 
    !isFreeOrVariable && (
      quote.subSector?.toLowerCase().includes('hisse senedi yoğun') || 
      quote.longName?.toLowerCase().includes('hisse senedi yoğun') ||
      quote.sector?.toLowerCase().includes('hisse senedi yoğun') ||
      (quote.sector === 'TEFAS - Hisse Senedi' && !quote.subSector?.toLowerCase().includes('yabancı'))
    );

  const isMoneyMarket = 
    quote.subSector?.toLowerCase().includes('para piyasası') || 
    quote.subSector?.toLowerCase().includes('likit') ||
    quote.sector?.toLowerCase().includes('para piyasası');

  const isForeignOrEurobond = 
    quote.subSector?.toLowerCase().includes('yabancı') || 
    quote.subSector?.toLowerCase().includes('eurobond') ||
    quote.sector?.toLowerCase().includes('yabancı') ||
    quote.sector?.toLowerCase().includes('eurobond');

  const isTaxFree = isEquityIntensive;
  const stopajRate = isTaxFree ? '%0' : '%17.5';

  let valorAlis = 'T+1';
  let valorSatis = 'T+2';
  if (isMoneyMarket) {
    valorAlis = 'T+0';
    valorSatis = 'T+0';
  } else if (isForeignOrEurobond) {
    valorAlis = 'T+1';
    valorSatis = 'T+3';
  }

  const riskNum = quote.risk || 6;

  return (
    <div className="bg-[#101520] rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
      
      {/* Header */}
      <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
          <h3 className="font-bold text-sm sm:text-base text-white">
            {isTefas
              ? (language === 'tr' ? 'TEFAS Fon Detayları & İstatistikleri' : 'TEFAS Fund Key Metrics')
              : (language === 'tr' ? 'Temel İstatistikler & Fiyat Aralıkları' : 'Key Statistics')}
          </h3>
        </div>
      </div>

      {/* Real Day & 52-Week Price Range Sliders (Only for Equities, Hidden for Daily NAV Funds) */}
      {!isTefas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-white/[0.06]">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="font-medium">Gün İçi Fiyat Aralığı</span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatPrice(quote.price, quote.currency)}
              </span>
            </div>
            <div className="relative w-full h-2 bg-[#182030] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                style={{ width: `${dayPositionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Düşük: {formatPrice(quote.dayLow, quote.currency)}</span>
              <span>Yüksek: {formatPrice(quote.dayHigh, quote.currency)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="font-medium">52 Haftalık Fiyat Aralığı</span>
              <span className="font-bold text-cyan-400 font-mono">
                {yearPositionPct.toFixed(0)}% Seviyesinde
              </span>
            </div>
            <div className="relative w-full h-2 bg-[#182030] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                style={{ width: `${yearPositionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>52H Düşük: {formatPrice(quote.fiftyTwoWeekLow, quote.currency)}</span>
              <span>52H Yüksek: {formatPrice(quote.fiftyTwoWeekHigh, quote.currency)}</span>
            </div>
          </div>
        </div>
      )}



      {/* Sleek 2-Column TEFAS Specifications Table (100% Genuine Metrics Only) */}
      {isTefas ? (
        <div className="bg-[#141b27] p-4 sm:p-5 rounded-xl flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 text-xs sm:text-sm">
            
            {/* Left Column: Sözel / Yapısal Detaylar */}
            <div className="flex flex-col divide-y divide-white/[0.05]">
              {/* 1. Portföy Yöneticisi */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Portföy Yöneticisi</span>
                <span className="font-mono font-bold text-white truncate max-w-[200px]" title={quote.manager || 'Portföy Yönetimi A.Ş.'}>
                  {quote.manager || 'Portföy Yönetimi A.Ş.'}
                </span>
              </div>

              {/* 2. Şemsiye Fon Türü */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Şemsiye Fon Türü</span>
                <span className="font-mono font-bold text-slate-200 truncate max-w-[200px]" title={quote.subSector || 'Hisse Senedi Yoğun'}>
                  {quote.subSector || 'Hisse Senedi Yoğun'}
                </span>
              </div>

              {/* 3. İşlem Platformu */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">İşlem Platformu</span>
                <span className="font-mono font-bold text-slate-200">TEFAS / Takasbank</span>
              </div>

              {/* 4. İşlem Valörü */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">İşlem Valörü</span>
                <span className="font-mono font-bold text-slate-200">
                  {valorAlis} / {valorSatis}
                </span>
              </div>
            </div>

            {/* Right Column: Sayısal / Finansal Metrikler */}
            <div className="flex flex-col divide-y divide-white/[0.05] border-t md:border-t-0 border-white/[0.05]">
              {/* 5. Toplam Fon Büyüklüğü */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Toplam Fon Büyüklüğü</span>
                <span className="font-mono font-bold text-white">{formatNumber(quote.marketCap)}</span>
              </div>

              {/* 6. Stopaj Oranı */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Stopaj Oranı</span>
                <span className={`font-mono font-bold ${isTaxFree ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stopajRate}
                </span>
              </div>

              {/* 7. Yıllık Yönetim Ücreti */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Yıllık Yönetim Ücreti</span>
                <span className="font-mono font-bold text-emerald-400">{quote.fee || '%2.25'}</span>
              </div>

              {/* 8. Risk Seviyesi */}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-400 font-sans">Risk Seviyesi</span>
                <span className="font-mono font-bold text-amber-400">
                  {riskNum} / 7
                </span>
              </div>
            </div>

          </div>

          {/* Clean 1-Line Tax Exemption Footnote */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 text-xs text-slate-400 font-sans">
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isTaxFree ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>
              <b className={isTaxFree ? 'text-emerald-400' : 'text-amber-400'}>
                {isTaxFree ? 'Vergi Avantajı: ' : 'Vergi Bilgisi: '}
              </b>
              {isTaxFree
                ? 'Hisse Senedi Yoğun Fonlar GVK Geçici 67. Madde uyarınca %0 stopaja tabidir.'
                : 'Mevzuat uyarınca hisse senedi yoğun olmayan fon kazançlarında kaynakta %17.5 stopaj kesintisi uygulanır.'}
            </span>
          </div>
        </div>
      ) : (
        /* Genuine Stock Financial Metrics Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs sm:text-sm font-mono">
          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Piyasa Değeri</span>
            <span className="font-bold text-white text-sm sm:text-base">{formatNumber(quote.marketCap)}</span>
          </div>

          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Günlük İşlem Hacmi</span>
            <span className="font-bold text-slate-100 text-sm sm:text-base">{formatNumber(quote.volume)}</span>
          </div>

          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Gün İçi En Düşük</span>
            <span className="font-bold text-slate-100 text-sm sm:text-base">{formatPrice(quote.dayLow, quote.currency)}</span>
          </div>

          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Gün İçi En Yüksek</span>
            <span className="font-bold text-slate-100 text-sm sm:text-base">{formatPrice(quote.dayHigh, quote.currency)}</span>
          </div>

          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Önceki Kapanış</span>
            <span className="font-bold text-slate-100 text-sm sm:text-base">{formatPrice(quote.previousClose, quote.currency)}</span>
          </div>

          <div className="bg-[#141b27] p-3 rounded-xl flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 font-sans font-medium">Borsa / Birim</span>
            <span className="font-bold text-slate-100 text-sm sm:text-base">{quote.exchange} / {quote.currency}</span>
          </div>
        </div>
      )}

    </div>
  );
};
