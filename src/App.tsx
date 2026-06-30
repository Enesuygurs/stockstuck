import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { MarketRibbon } from './components/MarketRibbon';
import { SearchModal } from './components/SearchModal';
import { HeatmapView } from './components/Heatmap/HeatmapView';
import { StockDetailPage } from './components/StockDetail/StockDetailPage';
import { ScreenerView } from './components/Screener/ScreenerView';
import { CompareView } from './components/Compare/CompareView';
import { PortfolioView } from './components/Portfolio/PortfolioView';
import { FundsView } from './components/Funds/FundsView';
import { MacroView } from './components/Macro/MacroView';
import { NotificationToast } from './components/Notifications/NotificationToast';
import { NotificationsDrawer } from './components/Notifications/NotificationsDrawer';

const NotFoundView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-mono font-black text-2xl mb-4 shadow-lg">
        404
      </div>
      <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Sayfa Bulunamadı</h2>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        Aradığınız varlık veya sayfa mevcut değil ya da bağlantı adresi değişmiş olabilir.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-md shadow-emerald-500/20"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
};

export const App: React.FC = () => {
  const { language } = useApp();

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 flex flex-col font-sans">
      {/* 1. Market Index Ticker Ribbon */}
      <MarketRibbon />

      {/* 2. Navigation Bar */}
      <Navbar />

      {/* 3. Global Search Dialog & Notifications Drawer / Toast */}
      <SearchModal />
      <NotificationsDrawer />
      <NotificationToast />

      {/* 4. Tab Content via Declarative Routes */}
      <main className="flex-1 pb-10">
        <Routes>
          {/* Main Pages (English Routes) */}
          <Route path="/" element={<HeatmapView />} />
          <Route path="/heatmap" element={<HeatmapView />} />
          <Route path="/macro" element={<MacroView />} />
          <Route path="/funds" element={<FundsView />} />
          <Route path="/screener" element={<ScreenerView />} />
          <Route path="/compare" element={<CompareView />} />
          <Route path="/portfolio" element={<PortfolioView />} />

          {/* Dedicated Semantic Asset Routes (English) */}
          <Route path="/fund/:symbol" element={<StockDetailPage />} />
          <Route path="/commodity/:symbol" element={<StockDetailPage />} />
          <Route path="/forex/:symbol" element={<StockDetailPage />} />
          <Route path="/crypto/:symbol" element={<StockDetailPage />} />
          <Route path="/index/:symbol" element={<StockDetailPage />} />
          <Route path="/stock/:symbol" element={<StockDetailPage />} />
          <Route path="/asset/:symbol" element={<StockDetailPage />} />

          {/* Legacy / Fallback Aliases */}
          <Route path="/fonlar" element={<FundsView />} />
          <Route path="/tarama" element={<ScreenerView />} />
          <Route path="/karsilastir" element={<CompareView />} />
          <Route path="/portfoy" element={<PortfolioView />} />
          <Route path="/fon/:symbol" element={<StockDetailPage />} />
          <Route path="/emtia/:symbol" element={<StockDetailPage />} />
          <Route path="/doviz/:symbol" element={<StockDetailPage />} />
          <Route path="/kripto/:symbol" element={<StockDetailPage />} />
          <Route path="/endeks/:symbol" element={<StockDetailPage />} />
          <Route path="/hisse/:symbol" element={<StockDetailPage />} />
          <Route path="/varlik/:symbol" element={<StockDetailPage />} />

          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>


      {/* 5. Minimal Footer */}
      <footer className="w-full bg-[#080b10] py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">StockStuck Terminal</span>
            <span>•</span>
            <span>{language === 'tr' ? 'BIST & NASDAQ Canlı Borsa Analizi' : 'Live Market Analysis'}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-500">CANLI VERİ AKIŞI</span>
            <span>BIST 100 • NASDAQ 100 • S&P 500</span>
          </div>

          <div className="text-[11px]">
            <span>© 2026 StockStuck</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
