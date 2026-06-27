import React from 'react';
import { TechnicalAnalysisData } from '../../types/stock';
import { useApp } from '../../context/AppContext';
import { Gauge, Activity, TrendingUp, SlidersHorizontal } from 'lucide-react';

interface TechnicalGaugeProps {
  data: TechnicalAnalysisData | null;
  loading: boolean;
}

export const TechnicalGauge: React.FC<TechnicalGaugeProps> = ({ data, loading }) => {
  const { language } = useApp();

  if (loading || !data) {
    return (
      <div className="bg-[#101520] rounded-2xl p-6 flex items-center justify-center min-h-[320px] text-slate-400 text-sm">
        Teknik indikatörler hesaplanıyor...
      </div>
    );
  }

  const { score, rating, ratingEn, indicators, movingAverages, oscillators, pivots } = data;

  const isBuy = score >= 58;
  const isSell = score <= 42;

  // Gauge Geometry & Math
  const cx = 140;
  const cy = 116;
  const r = 84;

  const clampedScore = Math.min(100, Math.max(0, score));
  const needleDeg = 180 - (clampedScore / 100) * 180;
  const rad = (needleDeg * Math.PI) / 180;
  const perpRad = rad + Math.PI / 2;
  const needleLength = 70;

  // Diamond-tapered chronograph pointer
  const tipX = cx + needleLength * Math.cos(rad);
  const tipY = cy - needleLength * Math.sin(rad);
  const tailX = cx - 14 * Math.cos(rad);
  const tailY = cy + 14 * Math.sin(rad);
  const baseL_X = cx + 5 * Math.cos(perpRad);
  const baseL_Y = cy - 5 * Math.sin(perpRad);
  const baseR_X = cx - 5 * Math.cos(perpRad);
  const baseR_Y = cy + 5 * Math.sin(perpRad);

  const needlePath = `M ${tailX} ${tailY} L ${baseL_X} ${baseL_Y} L ${tipX} ${tipY} L ${baseR_X} ${baseR_Y} Z`;

  // 5 TradingView-style Zones (Borderless)
  const zones = [
    { key: 'strong-sell', label: 'GÜÇLÜ SAT', activeClass: 'bg-rose-500/20 text-rose-400 font-black' },
    { key: 'sell', label: 'SAT', activeClass: 'bg-orange-500/20 text-orange-400 font-black' },
    { key: 'neutral', label: 'NÖTR', activeClass: 'bg-amber-500/20 text-amber-400 font-black' },
    { key: 'buy', label: 'AL', activeClass: 'bg-emerald-500/20 text-emerald-400 font-black' },
    { key: 'strong-buy', label: 'GÜÇLÜ AL', activeClass: 'bg-emerald-500/25 text-emerald-300 font-black' },
  ];

  const activeZoneIndex = 
    score < 20 ? 0 :
    score <= 42 ? 1 :
    score <= 57 ? 2 :
    score <= 79 ? 3 : 4;

  const activeColor = 
    isBuy ? '#10b981' : 
    isSell ? '#f43f5e' : '#f59e0b';

  return (
    <div className="bg-[#101520] rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <Gauge className="w-5 h-5 text-emerald-400 shrink-0" />
          <h3 className="font-bold text-sm sm:text-base text-white">
            {language === 'tr' ? 'Teknik Analiz Göstergesi' : 'Technical Consensus'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black ${
            isBuy ? 'bg-emerald-500/20 text-emerald-400' : 
            isSell ? 'bg-rose-500/20 text-rose-400' : 
            'bg-amber-500/20 text-amber-400'
          }`}>
            {language === 'tr' ? rating : ratingEn}
          </span>
          <span className="text-xs font-mono text-slate-400 font-bold">
            {score} / 100
          </span>
        </div>
      </div>

      {/* Speedometer Gauge Visual */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <div className="relative w-72 h-36 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 280 145">
            <defs>
              {/* Ultra-smooth continuous gradient track */}
              <linearGradient id="smoothGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="25%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="75%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              {/* Subtle drop shadow for needle */}
              <filter id="gaugeShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.7" />
              </filter>
            </defs>

            {/* Dark Track Foundation */}
            <path
              d="M 56 116 A 84 84 0 0 1 224 116"
              fill="none"
              stroke="#161e2c"
              strokeWidth="13"
              strokeLinecap="round"
            />

            {/* Continuous Smooth Gradient Arc */}
            <path
              d="M 56 116 A 84 84 0 0 1 224 116"
              fill="none"
              stroke="url(#smoothGaugeGrad)"
              strokeWidth="13"
              strokeLinecap="round"
            />

            {/* Precision Laser Slit Dividers between the 5 zones */}
            {[144, 108, 72, 36].map((deg) => {
              const slitRad = (deg * Math.PI) / 180;
              const x1 = cx + (r - 9) * Math.cos(slitRad);
              const y1 = cy - (r - 9) * Math.sin(slitRad);
              const x2 = cx + (r + 9) * Math.cos(slitRad);
              const y2 = cy - (r + 9) * Math.sin(slitRad);
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#101520"
                  strokeWidth="3.5"
                  strokeLinecap="butt"
                />
              );
            })}

            {/* Counter-weighted Chronograph Needle with Shadow */}
            <path
              d={needlePath}
              fill="#ffffff"
              filter="url(#gaugeShadow)"
            />

            {/* Center Chronograph Multi-Ring Pivot Hub */}
            <circle cx={cx} cy={cy} r="13" fill="#0c1018" stroke="#253248" strokeWidth="2.5" />
            <circle cx={cx} cy={cy} r="7" fill={activeColor} />
            <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
          </svg>
        </div>

        {/* Center Verdict & Score */}
        <div className="flex flex-col items-center justify-center -mt-2 mb-3">
          <span className={`text-xl sm:text-2xl font-black tracking-wider ${
            score >= 58 ? 'text-emerald-400' :
            score <= 42 ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {language === 'tr' ? rating : ratingEn}
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
            Konsensüs Skoru: <strong className="text-white font-black">{score}</strong> / 100
          </span>
        </div>

        {/* Unified Single Segmented Control Bar (Borderless) */}
        <div className="w-full max-w-sm bg-[#0c1018] p-1 rounded-xl grid grid-cols-5 gap-1 text-center text-[10px] font-mono font-bold shadow-inner">
          {zones.map((z, idx) => {
            const isActive = activeZoneIndex === idx;
            return (
              <div
                key={z.key}
                className={`py-1.5 px-0.5 rounded-lg transition-all flex items-center justify-center text-center ${
                  isActive
                    ? z.activeClass
                    : 'text-slate-400 hover:text-slate-200 bg-transparent'
                }`}
              >
                {z.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown: Oscillators & MAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Oscillators */}
        <div className="bg-[#141b27] p-3.5 rounded-xl flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs sm:text-sm pb-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-bold text-slate-200">
                {language === 'tr' ? 'Osilatörler' : 'Oscillators'}
              </span>
            </div>
            <div className="flex gap-2 text-xs font-mono font-bold">
              <span className="text-emerald-400">AL: {oscillators.summary.buy}</span>
              <span className="text-rose-400">SAT: {oscillators.summary.sell}</span>
              <span className="text-slate-400">NÖTR: {oscillators.summary.neutral}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-mono">
            {/* RSI */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">RSI (14)</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{indicators.rsi.value}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  indicators.rsi.value < 30 ? 'text-emerald-400 bg-emerald-500/20' :
                  indicators.rsi.value > 70 ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 bg-[#182030]'
                }`}>
                  {indicators.rsi.signal}
                </span>
              </div>
            </div>

            {/* MACD */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">MACD (12,26)</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{indicators.macd.histogram.toFixed(2)}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  indicators.macd.histogram >= 0 ? 'text-emerald-400 bg-emerald-500/20' : 'text-rose-400 bg-rose-500/20'
                }`}>
                  {indicators.macd.signal}
                </span>
              </div>
            </div>

            {/* Stochastic */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Stoch %K (14)</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{indicators.stochastic.k}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  indicators.stochastic.k < 20 ? 'text-emerald-400 bg-emerald-500/20' :
                  indicators.stochastic.k > 80 ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 bg-[#182030]'
                }`}>
                  {indicators.stochastic.signal || (indicators.stochastic.k < 20 ? 'AL' : indicators.stochastic.k > 80 ? 'SAT' : 'NÖTR')}
                </span>
              </div>
            </div>

            {/* Bollinger %B */}
            {indicators.bollingerBands && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Bollinger %B</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{indicators.bollingerBands.percentB.toFixed(2)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    indicators.bollingerBands.percentB < 0 ? 'text-emerald-400 bg-emerald-500/20' :
                    indicators.bollingerBands.percentB > 1 ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 bg-[#182030]'
                  }`}>
                    {indicators.bollingerBands.percentB < 0 ? 'AŞIRI SATIM' : indicators.bollingerBands.percentB > 1 ? 'AŞIRI ALIM' : 'BANT İÇİ'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Moving Averages */}
        <div className="bg-[#141b27] p-3.5 rounded-xl flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs sm:text-sm pb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-slate-200">
                {language === 'tr' ? 'Ortalamalar' : 'Moving Averages'}
              </span>
            </div>
            <div className="flex gap-2 text-xs font-mono font-bold">
              <span className="text-emerald-400">AL: {movingAverages.summary.buy}</span>
              <span className="text-rose-400">SAT: {movingAverages.summary.sell}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-mono max-h-[140px] overflow-y-auto pr-1">
            {movingAverages.list.map((ma) => (
              <div key={ma.name} className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">{ma.name}</span>
                <div className="flex items-center gap-2">
                  {ma.value !== null && <span className="text-slate-300 font-bold">{ma.value.toFixed(2)}</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    ma.signal === 'AL' ? 'text-emerald-400 bg-emerald-500/20' :
                    ma.signal === 'SAT' ? 'text-rose-400 bg-rose-500/20' : 'text-slate-300 bg-[#182030]'
                  }`}>
                    {ma.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Pivot Points */}
      {pivots && (
        <div className="bg-[#141b27] p-3.5 rounded-xl flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs sm:text-sm pb-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-slate-200">
                {language === 'tr' ? 'Klasik Pivot Seviyeleri' : 'Classic Pivot Points'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {language === 'tr' ? 'Destek & Direnç' : 'Support & Resistance'}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs">
            <div className="p-1.5 rounded-lg bg-[#101520] text-rose-400 font-semibold">
              <div className="text-[10px] text-slate-500">S2</div>
              <div>{pivots.s2}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#101520] text-rose-400 font-semibold">
              <div className="text-[10px] text-slate-500">S1</div>
              <div>{pivots.s1}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#1c2436] text-cyan-300 font-extrabold">
              <div className="text-[10px] text-slate-400">PIVOT</div>
              <div>{pivots.pivot}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#101520] text-emerald-400 font-semibold">
              <div className="text-[10px] text-slate-500">R1</div>
              <div>{pivots.r1}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-[#101520] text-emerald-400 font-semibold">
              <div className="text-[10px] text-slate-500">R2</div>
              <div>{pivots.r2}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
