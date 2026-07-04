import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp, AppTab } from '../context/AppContext';
import { getAssetUrl } from '../utils/assetUrl';
import {
  Flame,
  LineChart,
  Search,
  SlidersHorizontal,
  Scale,
  Briefcase,
  Globe,
  TrendingUp,
  Layers,
  Coins,
  Bell
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const {
    language,
    setLanguage,
    selectedStockSymbol,
    setIsSearchOpen,
    unreadNotificationsCount,
    setIsNotificationsDrawerOpen,
  } = useApp();

  const isMac = typeof window !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  const navItems: { id: AppTab; path: string; labelTr: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'heatmap', path: '/', labelTr: 'Isı Haritası', labelEn: 'Heatmap', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'macro', path: '/macro', labelTr: 'Makro & Kurlar', labelEn: 'Macro & FX', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'funds', path: '/funds', labelTr: 'Fonlar & ETF', labelEn: 'Funds & ETFs', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'stock-detail', path: getAssetUrl(selectedStockSymbol || 'NVDA'), labelTr: 'Varlık Analizi', labelEn: 'Asset Analysis', icon: <LineChart className="w-3.5 h-3.5" /> },
    { id: 'screener', path: '/screener', labelTr: 'Tarayıcı', labelEn: 'Screener', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'compare', path: '/compare', labelTr: 'Karşılaştırma', labelEn: 'Compare', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'portfolio', path: '/portfolio', labelTr: 'Portföy & Takip', labelEn: 'Portfolio', icon: <Briefcase className="w-3.5 h-3.5" /> },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (item.id === 'stock-detail') {
      const assetPrefixes = ['/fund', '/commodity', '/forex', '/crypto', '/index', '/stock', '/asset', '/fon', '/emtia', '/doviz', '/kripto', '/endeks', '/hisse', '/varlik'];
      return assetPrefixes.some(p => location.pathname.startsWith(p));
    }
    if (item.id === 'heatmap') {
      return location.pathname === '/' || location.pathname === '/heatmap';
    }
    return location.pathname === item.path;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d121c]/98 backdrop-blur-md shadow-sm">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-4">
        
        {/* Left & Center: Brand Logo + Navigation Group + Search Box */}
        <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 h-10 px-1 rounded-xl select-none transition shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
              Stock<span className="text-emerald-400">Stuck</span>
            </span>
          </Link>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden xl:flex items-center gap-0.5 h-10 bg-[#141b27] p-1 rounded-xl shrink-0">
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-[#222c3f] text-white shadow-md font-extrabold'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{language === 'tr' ? item.labelTr : item.labelEn}</span>
                </Link>
              );
            })}
          </nav>

          {/* Search Box - Expands all the way to Notifications Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center justify-between flex-1 min-w-[220px] h-10 bg-[#141b27] hover:bg-[#192334] text-slate-300 hover:text-white px-4 rounded-xl text-xs font-medium transition shadow-inner"
            aria-label="Hisse senedi ara"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200 text-xs truncate">
                {language === 'tr' ? 'Hisse senedi, şirket adı veya fon ara...' : 'Search ticker, company name or fund...'}
              </span>
            </div>
            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.1] text-slate-200 rounded font-bold shrink-0 ml-2">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>
        </div>

        {/* Notifications Button (Positioned immediately to the left of the far right group) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsNotificationsDrawerOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#141b27] hover:bg-[#192334] text-slate-200 hover:text-white transition"
            title={language === 'tr' ? 'Alarmlar & Canlı Bildirimler' : 'Alerts & Live Notifications'}
            aria-label="Alarmlar ve Bildirimler"
          >
            <Bell className="w-4 h-4 text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-mono font-bold text-slate-950 shadow-md">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Far Right: Language Switcher & Mobile Search */}
          <div className="flex items-center gap-2.5 shrink-0 ml-1">
            {/* Mobile search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#141b27] hover:bg-[#192334] text-slate-200 hover:text-white transition"
              aria-label="Ara"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              className="flex items-center justify-center gap-1.5 h-10 bg-[#141b27] hover:bg-[#192334] text-slate-200 px-3.5 rounded-xl text-xs font-bold transition"
              title="Dili Değiştir"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono">{language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sub-bar */}
      <div className="xl:hidden flex items-center justify-around bg-[#0c1017] px-2 py-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                isActive ? 'bg-[#182030] text-emerald-400 font-extrabold' : 'text-slate-300'
              }`}
            >
              {item.icon}
              <span>{language === 'tr' ? item.labelTr.split(' ')[0] : item.labelEn.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
