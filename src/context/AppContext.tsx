import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAssetUrl } from '../utils/assetUrl';
import {
  PortfolioPosition,
  TradeHistoryItem,
  StockAlert,
  AppNotification,
  WatchlistGroup,
  AlertType
} from '../types/stock';
import { api } from '../services/api';
import { playAlertChime } from '../utils/sound';
import {
  registerServiceWorker,
  requestWebPushPermission,
  sendWebPushNotification,
  getWebPushPermission,
  isWebPushSupported
} from '../utils/webPush';

export type Language = 'tr' | 'en';
export type AppTab = 'heatmap' | 'macro' | 'funds' | 'screener' | 'compare' | 'portfolio' | 'stock-detail';
export type ChartType = 'candlestick' | 'line' | 'area';

export interface ChartIndicators {
  showSMA20: boolean;
  showSMA50: boolean;
  showSMA200: boolean;
  showBollinger: boolean;
  showRSI: boolean;
  showVolume: boolean;
}

const DEFAULT_INDICATORS: ChartIndicators = {
  showSMA20: true,
  showSMA50: true,
  showSMA200: false,
  showBollinger: false,
  showRSI: true,
  showVolume: true,
};

const DEFAULT_WATCHLIST_GROUPS: WatchlistGroup[] = [
  {
    id: 'wl_default',
    name: 'Ana Takip Listesi',
    icon: 'star',
    color: '#10b981',
    symbols: ['NVDA', 'THYAO.IS', 'AAPL', 'ASELS.IS', 'TSLA', 'GARAN.IS', 'PLTR'],
    createdAt: '2026-01-01',
    isDefault: true
  },
  {
    id: 'wl_dividend',
    name: 'Temettü Hisselerim',
    icon: 'coins',
    color: '#38bdf8',
    symbols: ['EREGL.IS', 'FROTO.IS', 'TUPRS.IS', 'KOZAL.IS', 'DOAS.IS', 'JNJ', 'KO'],
    createdAt: '2026-01-02'
  },
  {
    id: 'wl_growth',
    name: 'Yüksek Büyüme & AI',
    icon: 'rocket',
    color: '#a855f7',
    symbols: ['NVDA', 'PLTR', 'AMD', 'MSFT', 'ASTOR.IS', 'MIATK.IS'],
    createdAt: '2026-01-03'
  },
  {
    id: 'wl_bist',
    name: 'BIST Favorilerim',
    icon: 'landmark',
    color: '#f59e0b',
    symbols: ['THYAO.IS', 'GARAN.IS', 'AKBNK.IS', 'BIMAS.IS', 'KCHOL.IS', 'SISE.IS', 'ASELS.IS'],
    createdAt: '2026-01-04'
  },
  {
    id: 'wl_global',
    name: 'Global & Teknoloji',
    icon: 'globe',
    color: '#06b6d4',
    symbols: ['AAPL', 'GOOGL', 'AMZN', 'META', 'TSLA', 'MSFT'],
    createdAt: '2026-01-05'
  }
];

const DEFAULT_ALERTS: StockAlert[] = [
  {
    id: 'alert_1',
    symbol: 'THYAO.IS',
    name: 'Türk Hava Yolları',
    type: 'PRICE_TARGET',
    targetValue: 350,
    initialPrice: 312,
    frequency: 'ONCE',
    isActive: true,
    soundEnabled: true,
    notes: '350 TL direnç hedefi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'alert_2',
    symbol: 'GARAN.IS',
    name: 'Garanti BBVA',
    type: 'PRICE_TARGET',
    targetValue: 140,
    initialPrice: 118,
    frequency: 'DAILY',
    isActive: true,
    soundEnabled: true,
    notes: '140 TL hedef fiyat',
    createdAt: new Date().toISOString()
  },
  {
    id: 'alert_3',
    symbol: 'NVDA',
    name: 'NVIDIA Corp',
    type: 'PRICE_TARGET',
    targetValue: 260,
    initialPrice: 225,
    frequency: 'HOURLY',
    isActive: true,
    soundEnabled: true,
    notes: '260 $ hedefi',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_init_1',
    symbol: 'GARAN.IS',
    title: 'RSI Alarmı Tetiklendi',
    message: 'GARAN.IS RSI değeri 29.2 seviyesine inerek aşırı satım bölgesine girdi (Hedef: 30.0).',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    type: 'ALERT',
    severity: 'warning',
    targetValue: 30,
    currentValue: 29.2
  },
  {
    id: 'notif_init_2',
    symbol: 'THYAO.IS',
    title: 'Yüksek Hacimli Para Girişi',
    message: 'THYAO.IS gün içi %3.8 artışla +₺412M net kurumsal para girişi kaydetti.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    type: 'INFO',
    severity: 'success'
  }
];

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  selectedStockSymbol: string;
  selectStock: (symbol: string) => void;

  // Multiple Watchlists
  watchlists: WatchlistGroup[];
  activeWatchlistId: string;
  setActiveWatchlistId: (id: string) => void;
  activeWatchlist: WatchlistGroup;
  createWatchlist: (name: string, icon?: string, initialSymbols?: string[]) => string;
  renameWatchlist: (id: string, newName: string) => void;
  deleteWatchlist: (id: string) => void;
  addToWatchlist: (symbol: string, watchlistId?: string) => void;
  removeFromWatchlist: (symbol: string, watchlistId?: string) => void;
  toggleWatchlist: (symbol: string, watchlistId?: string) => void;
  isInWatchlist: (symbol: string, watchlistId?: string) => boolean;
  watchlist: string[]; // Legacy compatibility (returns active watchlist's symbols)

  // Portfolio & Trades
  portfolio: PortfolioPosition[];
  tradeHistory: TradeHistoryItem[];
  addPosition: (pos: PortfolioPosition) => void;
  sellPosition: (symbol: string, sharesToSell: number, sellPrice: number) => { success: boolean; realizedPnl: number; remainingShares: number };
  removePosition: (symbol: string) => void;
  getPosition: (symbol: string) => PortfolioPosition | undefined;

  // Chart settings
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  indicators: ChartIndicators;
  toggleIndicator: (key: keyof ChartIndicators) => void;

  // Search
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Compare
  compareSymbols: string[];
  setCompareSymbols: React.Dispatch<React.SetStateAction<string[]>>;
  addCompareStock: (symbol: string) => void;

  // Alarms & Notifications
  alerts: StockAlert[];
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  isNotificationsDrawerOpen: boolean;
  setIsNotificationsDrawerOpen: (open: boolean) => void;
  notificationsDrawerTab: 'notifications' | 'alerts' | 'create';
  setNotificationsDrawerTab: (tab: 'notifications' | 'alerts' | 'create') => void;
  openAlerts: (symbol?: string) => void;
  addAlert: (alertData: Omit<StockAlert, 'id' | 'createdAt' | 'isActive'>) => void;
  updateAlert: (id: string, updatedData: Partial<StockAlert>) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  triggerManualTestNotification: (symbol?: string) => void;
  requestDesktopNotificationPermission: () => Promise<boolean>;
  webPushPermission: NotificationPermission | 'unsupported';
  isWebPushActive: boolean;

  // Formatting helpers
  formatPrice: (price: number, originalCurrency?: string) => string;
  formatNumber: (num: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getTabFromPathname = (pathname: string): AppTab => {
  const assetPrefixes = ['/fund', '/commodity', '/forex', '/crypto', '/index', '/stock', '/asset', '/fon', '/emtia', '/doviz', '/kripto', '/endeks', '/hisse', '/varlik'];
  if (assetPrefixes.some(p => pathname.startsWith(p))) return 'stock-detail';
  if (pathname === '/macro') return 'macro';
  if (pathname === '/funds' || pathname === '/fonlar') return 'funds';
  if (pathname === '/screener' || pathname === '/tarama') return 'screener';
  if (pathname === '/compare' || pathname === '/karsilastir') return 'compare';
  if (pathname === '/portfolio' || pathname === '/portfoy') return 'portfolio';
  return 'heatmap';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('stockstuck_lang') as Language) || 'tr';
  });

  const [activeTab, setActiveTabState] = useState<AppTab>(() => getTabFromPathname(window.location.pathname));
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>(() => {
    const path = window.location.pathname;
    const assetPrefixes = ['/fund/', '/commodity/', '/forex/', '/crypto/', '/index/', '/stock/', '/asset/', '/fon/', '/emtia/', '/doviz/', '/kripto/', '/endeks/', '/hisse/', '/varlik/'];
    for (const p of assetPrefixes) {
      if (path.startsWith(p)) {
        const sym = path.split('/')[2];
        if (sym) return decodeURIComponent(sym).toUpperCase();
      }
    }
    return 'NVDA';
  });

  // Keep state synchronized with URL (handles direct hits, back/forward buttons)
  useEffect(() => {
    const tab = getTabFromPathname(location.pathname);
    setActiveTabState(tab);

    const assetPrefixes = ['/fund/', '/commodity/', '/forex/', '/crypto/', '/index/', '/stock/', '/asset/', '/fon/', '/emtia/', '/doviz/', '/kripto/', '/endeks/', '/hisse/', '/varlik/'];
    for (const p of assetPrefixes) {
      if (location.pathname.startsWith(p)) {
        const parts = location.pathname.split('/');
        if (parts[2]) {
          const decoded = decodeURIComponent(parts[2]).toUpperCase();
          setSelectedStockSymbol(decoded);
          break;
        }
      }
    }
  }, [location.pathname]);

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    if (tab === 'stock-detail') {
      navigate(getAssetUrl(selectedStockSymbol || 'NVDA'));
    } else if (tab === 'heatmap') {
      navigate('/');
    } else {
      navigate(`/${tab}`);
    }
  };

  const [chartType, setChartType] = useState<ChartType>(() => {
    return (localStorage.getItem('stockstuck_chart_type') as ChartType) || 'candlestick';
  });

  const [indicators, setIndicators] = useState<ChartIndicators>(() => {
    try {
      const saved = localStorage.getItem('stockstuck_chart_indicators');
      return saved ? JSON.parse(saved) : DEFAULT_INDICATORS;
    } catch {
      return DEFAULT_INDICATORS;
    }
  });

  const toggleIndicator = (key: keyof ChartIndicators) => {
    setIndicators(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('stockstuck_chart_indicators', JSON.stringify(updated));
      return updated;
    });
  };

  // ==========================================
  // MULTIPLE WATCHLISTS STATE (Sanitized against emojis)
  // ==========================================
  const stripEmojis = (str: string) =>
    str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2B50}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();

  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>(() => {
    try {
      const cleanGroup = (g: WatchlistGroup): WatchlistGroup => ({
        ...g,
        name: stripEmojis(g.name) || g.name
      });

      const saved = localStorage.getItem('stockstuck_watchlists_groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(cleanGroup);
          localStorage.setItem('stockstuck_watchlists_groups', JSON.stringify(cleaned));
          return cleaned;
        }
      }
      // Migrate old flat watchlist if present
      const oldFlat = localStorage.getItem('stockstuck_watchlist');
      if (oldFlat) {
        const parsed = JSON.parse(oldFlat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaults = [...DEFAULT_WATCHLIST_GROUPS];
          defaults[0].symbols = parsed;
          localStorage.setItem('stockstuck_watchlists_groups', JSON.stringify(defaults));
          return defaults;
        }
      }
      return DEFAULT_WATCHLIST_GROUPS;
    } catch {
      return DEFAULT_WATCHLIST_GROUPS;
    }
  });

  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(() => {
    return localStorage.getItem('stockstuck_active_watchlist_id') || 'wl_default';
  });

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0] || DEFAULT_WATCHLIST_GROUPS[0];
  const watchlist = activeWatchlist?.symbols || [];

  const createWatchlist = (name: string, icon = 'bookmark', initialSymbols: string[] = []): string => {
    const cleanName = stripEmojis(name.trim());
    if (!cleanName) return '';
    const newId = `wl_${Date.now()}`;
    const newGroup: WatchlistGroup = {
      id: newId,
      name: cleanName,
      icon,
      color: '#3b82f6',
      symbols: initialSymbols,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setWatchlists(prev => [...prev, newGroup]);
    setActiveWatchlistId(newId);
    return newId;
  };

  const renameWatchlist = (id: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setWatchlists(prev => prev.map(w => w.id === id ? { ...w, name: clean } : w));
  };

  const deleteWatchlist = (id: string) => {
    setWatchlists(prev => {
      if (prev.length <= 1) return prev; // Keep at least one
      const filtered = prev.filter(w => w.id !== id);
      if (activeWatchlistId === id) {
        setActiveWatchlistId(filtered[0]?.id || 'wl_default');
      }
      return filtered;
    });
  };

  const addToWatchlist = (symbol: string, targetId?: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;
    const listId = targetId || activeWatchlistId;
    setWatchlists(prev => prev.map(w => {
      if (w.id === listId) {
        if (w.symbols.includes(sym)) return w;
        return { ...w, symbols: [...w.symbols, sym] };
      }
      return w;
    }));
  };

  const removeFromWatchlist = (symbol: string, targetId?: string) => {
    const sym = symbol.toUpperCase().trim();
    const listId = targetId || activeWatchlistId;
    setWatchlists(prev => prev.map(w => {
      if (w.id === listId) {
        return { ...w, symbols: w.symbols.filter(s => s !== sym) };
      }
      return w;
    }));
  };

  const toggleWatchlist = (symbol: string, targetId?: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;
    const listId = targetId || activeWatchlistId;
    const targetGroup = watchlists.find(w => w.id === listId) || activeWatchlist;
    if (targetGroup?.symbols.includes(sym)) {
      removeFromWatchlist(sym, listId);
    } else {
      addToWatchlist(sym, listId);
    }
  };

  const isInWatchlist = (symbol: string, targetId?: string): boolean => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return false;
    if (targetId) {
      const g = watchlists.find(w => w.id === targetId);
      return !!g?.symbols.includes(sym);
    }
    // Check if in active watchlist or any watchlist
    return !!activeWatchlist?.symbols.includes(sym);
  };

  // ==========================================
  // ALARMS & NOTIFICATIONS STATE
  // ==========================================
  const [alerts, setAlerts] = useState<StockAlert[]>(() => {
    try {
      const saved = localStorage.getItem('stockstuck_alerts');
      if (saved) {
        const parsed: StockAlert[] = JSON.parse(saved);
        // Sanitize legacy demo alerts if any had old target prices
        return parsed.map(a => {
          if (a.id === 'alert_3' && a.symbol === 'NVDA' && a.targetValue < 240) {
            return { ...a, targetValue: 260, initialPrice: 225, frequency: 'HOURLY' as const };
          }
          if (a.id === 'alert_1' && a.symbol === 'THYAO.IS' && a.targetValue <= 325) {
            return { ...a, targetValue: 350, initialPrice: 312, frequency: 'ONCE' as const };
          }
          if (a.id === 'alert_2' && a.symbol === 'GARAN.IS' && a.targetValue <= 130) {
            return { ...a, targetValue: 140, initialPrice: 118, frequency: 'DAILY' as const };
          }
          return a;
        });
      }
      return DEFAULT_ALERTS;
    } catch {
      return DEFAULT_ALERTS;
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('stockstuck_notifications');
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  // Sync alerts and notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stockstuck_alerts', JSON.stringify(alerts));
    } catch (err) {
      console.warn('Failed to save alerts to localStorage:', err);
    }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem('stockstuck_notifications', JSON.stringify(notifications));
    } catch (err) {
      console.warn('Failed to save notifications to localStorage:', err);
    }
  }, [notifications]);

  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isNotificationsDrawerOpen, setIsNotificationsDrawerOpen] = useState<boolean>(false);
  const [notificationsDrawerTab, setNotificationsDrawerTab] = useState<'notifications' | 'alerts' | 'create'>('notifications');
  const toastTimeoutRef = useRef<number | null>(null);

  const openAlerts = (symbol?: string) => {
    if (symbol) {
      setSelectedStockSymbol(symbol);
    }
    setNotificationsDrawerTab('create');
    setIsNotificationsDrawerOpen(true);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const dismissToast = () => {
    setActiveToast(null);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  };

  const triggerToast = (notif: AppNotification) => {
    if (isNotificationsDrawerOpen) return;
    setActiveToast(notif);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  };

  const addAlert = (alertData: Omit<StockAlert, 'id' | 'createdAt' | 'isActive'>) => {
    const cleanSym = alertData.symbol.trim().toUpperCase();
    const existingCount = alerts.filter(a => a.symbol.trim().toUpperCase() === cleanSym).length;
    
    if (existingCount >= 2) {
      const limitNotif: AppNotification = {
        id: `notif_limit_${Date.now()}`,
        symbol: cleanSym,
        title: language === 'tr' ? 'Maksimum Alarm Sınırı (2/2)' : 'Max Alert Limit (2/2)',
        message: language === 'tr'
          ? `${cleanSym} için en fazla 2 alarm oluşturabilirsiniz. Yeni alarm eklemek için mevcut alarmlardan birini silmeli veya düzenlemelisiniz.`
          : `Maximum 2 alerts allowed for ${cleanSym}. Please delete or edit an existing alert.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'ALERT',
        severity: 'warning'
      };
      setNotifications(prev => [limitNotif, ...prev]);
      triggerToast(limitNotif);
      return;
    }

    const freq = alertData.frequency || 'ONCE';
    const newAlert: StockAlert = {
      ...alertData,
      symbol: cleanSym,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isActive: true,
      frequency: freq,
      type: alertData.type || 'PRICE_TARGET'
    };
    setAlerts(prev => [newAlert, ...prev]);

    const freqLabels: Record<string, string> = {
      ONCE: language === 'tr' ? 'Tek Seferlik' : 'Once',
      HOURLY: language === 'tr' ? 'Saatte Bir' : 'Hourly',
      DAILY: language === 'tr' ? 'Günlük' : 'Daily',
      ALWAYS: language === 'tr' ? 'Her Geçişte' : 'Always'
    };
    const freqText = freqLabels[freq] || (language === 'tr' ? 'Tek Seferlik' : 'Once');

    // Send brief confirmation notification
    const confirmNotif: AppNotification = {
      id: `notif_create_${Date.now()}`,
      alertId: newAlert.id,
      symbol: newAlert.symbol,
      title: language === 'tr' ? 'Alarm Kuruldu' : 'Alert Created',
      message: language === 'tr'
        ? `${newAlert.symbol} için hedef fiyat ${newAlert.targetValue} (${freqText}) kaydedildi.`
        : `Alert for ${newAlert.symbol} target price ${newAlert.targetValue} (${freqText}) saved.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'ALERT',
      severity: 'info'
    };
    setNotifications(prev => [confirmNotif, ...prev]);
    triggerToast(confirmNotif);
    playAlertChime('SUCCESS');
  };

  const updateAlert = (id: string, updatedData: Partial<StockAlert>) => {
    if (updatedData.symbol) {
      const cleanSym = updatedData.symbol.trim().toUpperCase();
      const existingCount = alerts.filter(a => a.id !== id && a.symbol.trim().toUpperCase() === cleanSym).length;
      if (existingCount >= 2) {
        const limitNotif: AppNotification = {
          id: `notif_limit_${Date.now()}`,
          symbol: cleanSym,
          title: language === 'tr' ? 'Maksimum Alarm Sınırı (2/2)' : 'Max Alert Limit (2/2)',
          message: language === 'tr'
            ? `${cleanSym} için en fazla 2 alarm oluşturabilirsiniz.`
            : `Maximum 2 alerts allowed for ${cleanSym}.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'ALERT',
          severity: 'warning'
        };
        setNotifications(prev => [limitNotif, ...prev]);
        triggerToast(limitNotif);
        return;
      }
    }

    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...updatedData,
        };
      }
      return a;
    }));

    const sym = updatedData.symbol || '';
    const target = updatedData.targetValue;
    const confirmNotif: AppNotification = {
      id: `notif_update_${Date.now()}`,
      alertId: id,
      symbol: sym,
      title: language === 'tr' ? 'Alarm Güncellendi' : 'Alert Updated',
      message: language === 'tr'
        ? `${sym ? sym + ' ' : ''}alarmı (Hedef: ${target ?? ''}) başarıyla güncellendi.`
        : `${sym ? sym + ' ' : ''}alert (Target: ${target ?? ''}) updated successfully.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'ALERT',
      severity: 'info'
    };
    setNotifications(prev => [confirmNotif, ...prev]);
    triggerToast(confirmNotif);
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const [webPushPermission, setWebPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    return getWebPushPermission();
  });

  // Initialize Service Worker and Listen for Notification Clicks
  useEffect(() => {
    registerServiceWorker();
    setWebPushPermission(getWebPushPermission());

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SELECT_STOCK' && event.data.symbol) {
          setSelectedStockSymbol(event.data.symbol.toUpperCase());
          setActiveTab('stock-detail');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  const requestDesktopNotificationPermission = async (): Promise<boolean> => {
    const granted = await requestWebPushPermission();
    setWebPushPermission(getWebPushPermission());
    return granted;
  };

  const triggerManualTestNotification = (symbol = 'THYAO.IS') => {
    const testNotif: AppNotification = {
      id: `test_${Date.now()}`,
      symbol,
      title: `Web Push & Fiyat Alarmı: ${symbol}`,
      message: `${symbol} test sinyali başarıyla çalıştı. Web push bildirimleri ve sesli uyarılar aktif.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'ALERT',
      severity: 'success',
      targetValue: 320,
      currentValue: 324.5
    };
    setNotifications(prev => [testNotif, ...prev]);
    triggerToast(testNotif);
    playAlertChime('ALERT');

    sendWebPushNotification(testNotif.title, {
      body: testNotif.message,
      symbol: testNotif.symbol
    });
  };

  // ==========================================
  // LIVE ALERT EVALUATION ENGINE (Interval Loop)
  // ==========================================
  const lastTriggerTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkAlerts = async () => {
      const activeAlerts = alerts.filter(a => a.isActive);
      if (activeAlerts.length === 0) return;

      for (const alert of activeAlerts) {
        try {
          // Determine cooldown based on frequency
          let cooldownMs = 60 * 1000; // Default 1 min
          if (alert.frequency === 'HOURLY') cooldownMs = 60 * 60 * 1000;
          else if (alert.frequency === 'DAILY') cooldownMs = 24 * 60 * 60 * 1000;
          else if (alert.frequency === 'ALWAYS') cooldownMs = 5 * 60 * 1000;

          const lastMemory = lastTriggerTimesRef.current[alert.id] || 0;
          const lastPersisted = alert.lastTriggered ? new Date(alert.lastTriggered).getTime() : 0;
          const lastTriggerTime = Math.max(lastMemory, lastPersisted);

          if (Date.now() - lastTriggerTime < cooldownMs) {
            continue;
          }

          const quote = await api.getStockQuote(alert.symbol);
          if (!quote || !quote.price) continue;

          let isTriggered = false;
          let triggerMsg = '';
          let severity: 'success' | 'warning' | 'info' | 'error' = 'success';

          const isTRY = alert.symbol.endsWith('.IS');
          const currencySymbol = isTRY ? '₺' : '$';

          if (alert.initialPrice) {
            if (alert.initialPrice < alert.targetValue && quote.price >= alert.targetValue) {
              isTriggered = true;
              triggerMsg = `${alert.symbol} hedef fiyata ulaştı! Fiyat ${currencySymbol}${quote.price} seviyesine çıkarak ${currencySymbol}${alert.targetValue} hedefini gördü.`;
              severity = 'success';
            } else if (alert.initialPrice > alert.targetValue && quote.price <= alert.targetValue) {
              isTriggered = true;
              triggerMsg = `${alert.symbol} hedef fiyata indi! Fiyat ${currencySymbol}${quote.price} seviyesine gerileyerek ${currencySymbol}${alert.targetValue} hedefini gördü.`;
              severity = 'warning';
            } else if (alert.initialPrice === alert.targetValue && quote.price === alert.targetValue) {
              isTriggered = true;
              triggerMsg = `${alert.symbol} hedef seviyesi ${currencySymbol}${alert.targetValue} değerinde!`;
              severity = 'info';
            }
          } else {
            // Standard target check
            if (alert.type === 'PRICE_BELOW' ? quote.price <= alert.targetValue : quote.price >= alert.targetValue) {
              isTriggered = true;
              triggerMsg = `${alert.symbol} fiyatı ${currencySymbol}${quote.price} seviyesine ulaşarak hedef ${currencySymbol}${alert.targetValue} değerini gördü!`;
              severity = 'success';
            }
          }

          if (isTriggered) {
            lastTriggerTimesRef.current[alert.id] = Date.now();

            // If frequency is ONCE, deactivate alert
            if (alert.frequency === 'ONCE') {
              setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isActive: false, lastTriggered: new Date().toISOString() } : a));
            } else {
              setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, lastTriggered: new Date().toISOString() } : a));
            }

            const newNotif: AppNotification = {
              id: `trig_${alert.id}_${Date.now()}`,
              alertId: alert.id,
              symbol: alert.symbol,
              title: `Hedef Fiyat Alarmı: ${alert.symbol}`,
              message: triggerMsg,
              timestamp: new Date().toISOString(),
              read: false,
              type: 'ALERT',
              severity,
              targetValue: alert.targetValue,
              currentValue: quote.price
            };

            setNotifications(prev => [newNotif, ...prev]);
            triggerToast(newNotif);

            if (alert.soundEnabled) {
              playAlertChime(severity === 'warning' ? 'WARNING' : 'ALERT');
            }

            // Trigger Web Push Notification
            sendWebPushNotification(newNotif.title, {
              body: newNotif.message,
              symbol: newNotif.symbol
            });
          }
        } catch (err) {
          console.warn('Alert evaluation error:', alert.symbol, err);
        }
      }
    };

    // Initial check after 3 seconds, then every 20 seconds
    const initialTimer = setTimeout(checkAlerts, 3000);
    const interval = setInterval(checkAlerts, 20000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [alerts]);

  // ==========================================
  // PORTFOLIO STATE (Clean initial slate)
  // ==========================================
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>(() => {
    try {
      if (!localStorage.getItem('stockstuck_cleared_mock_v3')) {
        localStorage.removeItem('stockstuck_portfolio');
        localStorage.removeItem('stockstuck_trades');
        localStorage.setItem('stockstuck_cleared_mock_v3', 'true');
        return [];
      }
      const saved = localStorage.getItem('stockstuck_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>(() => {
    try {
      if (localStorage.getItem('stockstuck_cleared_mock_v3') !== 'true') {
        return [];
      }
      const saved = localStorage.getItem('stockstuck_trades');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const [compareSymbols, setCompareSymbols] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('stockstuck_compare_symbols');
      return saved ? JSON.parse(saved) : ['NVDA', 'AAPL', 'THYAO.IS', 'GARAN.IS'];
    } catch {
      return ['NVDA', 'AAPL', 'THYAO.IS', 'GARAN.IS'];
    }
  });

  const addCompareStock = (symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setCompareSymbols(prev => {
      let next: string[];
      if (prev.includes(clean)) {
        next = [clean, ...prev.filter(s => s !== clean)];
      } else {
        next = [clean, ...prev].slice(0, 5);
      }
      try {
        localStorage.setItem('stockstuck_compare_symbols', JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveTab('compare');
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('stockstuck_watchlists_groups', JSON.stringify(watchlists));
    // also save active watchlist symbols to legacy key
    localStorage.setItem('stockstuck_watchlist', JSON.stringify(activeWatchlist?.symbols || []));
  }, [watchlists, activeWatchlist]);

  useEffect(() => {
    localStorage.setItem('stockstuck_active_watchlist_id', activeWatchlistId);
  }, [activeWatchlistId]);

  useEffect(() => {
    localStorage.setItem('stockstuck_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('stockstuck_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('stockstuck_compare_symbols', JSON.stringify(compareSymbols));
  }, [compareSymbols]);

  useEffect(() => {
    localStorage.setItem('stockstuck_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('stockstuck_chart_type', chartType);
  }, [chartType]);

  useEffect(() => {
    localStorage.setItem('stockstuck_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('stockstuck_trades', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  const selectStock = (symbol: string) => {
    const clean = symbol.toUpperCase();
    setSelectedStockSymbol(clean);
    setActiveTabState('stock-detail');
    navigate(getAssetUrl(clean));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPosition = (symbol: string): PortfolioPosition | undefined => {
    const s = symbol.toUpperCase();
    return portfolio.find(p => p.symbol.toUpperCase() === s || p.symbol.toUpperCase().replace('.IS', '') === s.replace('.IS', ''));
  };

  const addPosition = (pos: PortfolioPosition) => {
    const rawShares = Number(pos.shares);
    if (isNaN(rawShares) || rawShares <= 0) return;

    setPortfolio(prev => {
      const idx = prev.findIndex(p => p.symbol.toUpperCase() === pos.symbol.toUpperCase());
      if (idx >= 0) {
        const existing = prev[idx];
        const totalShares = Number((existing.shares + rawShares).toFixed(6));
        const newAvg = ((existing.shares * existing.avgBuyPrice) + (rawShares * pos.avgBuyPrice)) / totalShares;
        const updated = [...prev];
        updated[idx] = { ...existing, shares: totalShares, avgBuyPrice: Number(newAvg.toFixed(4)) };
        return updated;
      }
      return [...prev, { ...pos, shares: Number(rawShares.toFixed(6)) }];
    });

    // Record trade history
    setTradeHistory(prev => [
      {
        id: Date.now().toString(),
        symbol: pos.symbol.toUpperCase(),
        type: 'BUY',
        shares: Number(rawShares.toFixed(6)),
        price: pos.avgBuyPrice,
        date: pos.buyDate || new Date().toISOString().split('T')[0],
        currency: pos.currency,
      },
      ...prev,
    ]);
  };

  const sellPosition = (symbol: string, sharesToSell: number, sellPrice: number): { success: boolean; realizedPnl: number; remainingShares: number } => {
    const pos = getPosition(symbol);
    const numSell = Number(sharesToSell);
    if (!pos || isNaN(numSell) || numSell <= 0) {
      return { success: false, realizedPnl: 0, remainingShares: 0 };
    }

    const actualSellShares = Math.min(numSell, pos.shares);
    const realizedPnl = (sellPrice - pos.avgBuyPrice) * actualSellShares;
    const remainingShares = Number((pos.shares - actualSellShares).toFixed(6));

    setPortfolio(prev => {
      if (remainingShares <= 0.0000001) {
        return prev.filter(p => p.symbol.toUpperCase() !== pos.symbol.toUpperCase());
      }
      return prev.map(p => {
        if (p.symbol.toUpperCase() === pos.symbol.toUpperCase()) {
          return { ...p, shares: remainingShares };
        }
        return p;
      });
    });

    // Record trade history
    setTradeHistory(prev => [
      {
        id: Date.now().toString(),
        symbol: pos.symbol.toUpperCase(),
        type: 'SELL',
        shares: Number(actualSellShares.toFixed(6)),
        price: sellPrice,
        date: new Date().toISOString().split('T')[0],
        realizedPnl: Number(realizedPnl.toFixed(2)),
        currency: pos.currency,
      },
      ...prev,
    ]);

    return { success: true, realizedPnl: Number(realizedPnl.toFixed(2)), remainingShares };
  };

  const removePosition = (symbol: string) => {
    setPortfolio(prev => prev.filter(p => p.symbol.toUpperCase() !== symbol.toUpperCase()));
  };

  const formatPrice = (price: number, originalCurrency?: string): string => {
    if (price === undefined || price === null || isNaN(price)) return '-';
    const isTRY = originalCurrency === 'TRY' || selectedStockSymbol.endsWith('.IS');
    
    // Automatically detect extended precision (e.g. TEFAS NAV 2.912217, Forex, sub-10 assets)
    const priceStr = price.toString();
    const fracLength = priceStr.includes('.') ? priceStr.split('.')[1].length : 0;
    const maxDigits = (price < 10 && fracLength > 2) ? Math.min(6, fracLength) : (fracLength > 2 ? Math.min(4, fracLength) : 2);
    const minDigits = Math.min(2, maxDigits);

    if (isTRY) {
      return `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}`;
    } else {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}`;
    }
  };

  const formatNumber = (num: number): string => {
    if (!num || isNaN(num)) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + (language === 'tr' ? ' Trilyon' : 'T');
    if (num >= 1e9) return (num / 1e9).toFixed(2) + (language === 'tr' ? ' Milyar' : 'B');
    if (num >= 1e6) return (num / 1e6).toFixed(2) + (language === 'tr' ? ' Milyon' : 'M');
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        activeTab,
        setActiveTab,
        selectedStockSymbol,
        selectStock,

        // Watchlists
        watchlists,
        activeWatchlistId,
        setActiveWatchlistId,
        activeWatchlist,
        createWatchlist,
        renameWatchlist,
        deleteWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        toggleWatchlist,
        isInWatchlist,
        watchlist,

        // Portfolio
        portfolio,
        tradeHistory,
        addPosition,
        sellPosition,
        removePosition,
        getPosition,
        chartType,
        setChartType,
        indicators,
        toggleIndicator,
        isSearchOpen,
        setIsSearchOpen,
        compareSymbols,
        setCompareSymbols,
        addCompareStock,

        // Alarms & Notifications
        alerts,
        notifications,
        unreadNotificationsCount,
        activeToast,
        dismissToast,
        isNotificationsDrawerOpen,
        setIsNotificationsDrawerOpen,
        notificationsDrawerTab,
        setNotificationsDrawerTab,
        openAlerts,
        addAlert,
        updateAlert,
        toggleAlert,
        deleteAlert,
        deleteNotification,
        clearNotifications,
        markAllNotificationsRead,
        markNotificationRead,
        triggerManualTestNotification,
        requestDesktopNotificationPermission,
        webPushPermission,
        isWebPushActive: webPushPermission === 'granted',

        formatPrice,
        formatNumber,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
