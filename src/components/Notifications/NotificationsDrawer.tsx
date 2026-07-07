import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { StockAlert, AlertType, AlertFrequency, AppNotification } from '../../types/stock';
import { api } from '../../services/api';
import {
  Bell,
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  Volume2,
  Sparkles,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeft,
  RotateCw,
  Zap,
  Calendar,
  Pencil
} from 'lucide-react';

export const NotificationsDrawer: React.FC = () => {
  const {
    language,
    isNotificationsDrawerOpen,
    setIsNotificationsDrawerOpen,
    notificationsDrawerTab: activeTab,
    setNotificationsDrawerTab: setActiveTab,
    alerts,
    notifications,
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
    isWebPushActive,
    webPushPermission,
    selectStock,
    selectedStockSymbol,
    formatPrice
  } = useApp();

  // New Alert / Edit Form State
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [formSymbol, setFormSymbol] = useState(selectedStockSymbol || 'THYAO.IS');
  const [formFrequency, setFormFrequency] = useState<AlertFrequency>('ONCE');
  const [formTarget, setFormTarget] = useState<string>('320');
  const [formNotes, setFormNotes] = useState('');
  const [formSound, setFormSound] = useState(true);
  const [currentQuotePrice, setCurrentQuotePrice] = useState<number | null>(null);
  const [desktopPermitted, setDesktopPermitted] = useState(false);

  // Validation & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidatingSymbol, setIsValidatingSymbol] = useState(false);
  const [symbolValidated, setSymbolValidated] = useState<boolean | null>(true);
  const [validatedStockInfo, setValidatedStockInfo] = useState<{ symbol: string; name: string; price: number; currency: string } | null>({
    symbol: 'THYAO.IS',
    name: 'Türk Hava Yolları',
    price: 312.5,
    currency: 'TRY'
  });
  const [formError, setFormError] = useState<string | null>(null);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Maximum 2 alerts per symbol helper
  const currentSymbolAlerts = formSymbol
    ? alerts.filter(a => a.symbol.trim().toUpperCase() === formSymbol.trim().toUpperCase() && a.id !== editingAlertId)
    : [];
  const symbolAlertsCount = currentSymbolAlerts.length;
  const isMaxAlertsReached = symbolAlertsCount >= 2;

  // Lock body & document scrollbars when drawer is open to prevent double scrollbars
  useEffect(() => {
    if (isNotificationsDrawerOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isNotificationsDrawerOpen]);

  useEffect(() => {
    if (isNotificationsDrawerOpen && !editingAlertId && selectedStockSymbol) {
      setFormSymbol(selectedStockSymbol);
      validateSymbol(selectedStockSymbol);
    }
  }, [isNotificationsDrawerOpen, selectedStockSymbol]);

  useEffect(() => {
    if ('Notification' in window) {
      setDesktopPermitted(Notification.permission === 'granted');
    }
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate symbol & fetch quick quote when form symbol changes
  const validateSymbol = async (sym: string) => {
    const cleanSym = sym.trim().toUpperCase();
    if (!cleanSym) {
      setSymbolValidated(null);
      setValidatedStockInfo(null);
      setCurrentQuotePrice(null);
      setFormError(null);
      return;
    }

    setIsValidatingSymbol(true);
    setFormError(null);

    try {
      const q = await api.getStockQuote(cleanSym);
      if (q && q.price && q.price > 0) {
        setSymbolValidated(true);
        setCurrentQuotePrice(q.price);
        setValidatedStockInfo({
          symbol: q.symbol,
          name: q.trName || q.shortName || q.longName || q.symbol,
          price: q.price,
          currency: q.currency || (cleanSym.endsWith('.IS') ? 'TRY' : 'USD')
        });

        if (!formTarget || formTarget === '320' || formTarget === '70') {
          setFormTarget((q.price * 1.05).toFixed(2));
        }
      } else {
        setSymbolValidated(false);
        setValidatedStockInfo(null);
        setCurrentQuotePrice(null);
      }
    } catch {
      setSymbolValidated(false);
      setValidatedStockInfo(null);
      setCurrentQuotePrice(null);
    } finally {
      setIsValidatingSymbol(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formSymbol) {
        validateSymbol(formSymbol);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formSymbol]);

  // Handle symbol live search in form
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      api.search(searchQuery)
        .then(res => {
          setSearchResults(res.slice(0, 6));
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setIsSearching(false);
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isNotificationsDrawerOpen) return null;

  const handleSelectStock = (stock: { symbol: string; name: string }) => {
    setFormSymbol(stock.symbol);
    setSearchQuery('');
    setSearchResults([]);
    validateSymbol(stock.symbol);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSym = formSymbol.trim().toUpperCase();
    if (!cleanSym) {
      setFormError('Lütfen geçerli bir hisse kodu girin.');
      return;
    }

    const val = parseFloat(formTarget);
    if (isNaN(val) || val <= 0) {
      setFormError('Lütfen geçerli ve pozitif bir hedef değer girin.');
      return;
    }

    // Strict validation check against backend
    let validInfo = validatedStockInfo;
    if (!symbolValidated || !validInfo || validInfo.symbol !== cleanSym) {
      setIsValidatingSymbol(true);
      try {
        const q = await api.getStockQuote(cleanSym);
        if (q && q.price && q.price > 0) {
          validInfo = {
            symbol: q.symbol,
            name: q.trName || q.shortName || q.longName || q.symbol,
            price: q.price,
            currency: q.currency || (cleanSym.endsWith('.IS') ? 'TRY' : 'USD')
          };
          setSymbolValidated(true);
          setValidatedStockInfo(validInfo);
        } else {
          setSymbolValidated(false);
          setFormError(`"${cleanSym}" geçerli bir hisse veya varlık kodu değil! Lütfen listeden kayıtlı bir varlık seçin.`);
          setIsValidatingSymbol(false);
          return;
        }
      } catch {
        setSymbolValidated(false);
        setFormError(`"${cleanSym}" varlığı doğrulanamadı! Lütfen geçerli bir hisse kodu girin.`);
        setIsValidatingSymbol(false);
        return;
      }
      setIsValidatingSymbol(false);
    }

    if (!validInfo) {
      setFormError('Geçersiz hisse kodu. Lütfen listeden geçerli bir varlık seçin.');
      return;
    }

    // Limit check: Maximum 2 alerts per symbol
    const existingAlertsForSymbol = alerts.filter(
      a => a.symbol.trim().toUpperCase() === validInfo.symbol.trim().toUpperCase() && a.id !== editingAlertId
    );
    if (existingAlertsForSymbol.length >= 2) {
      setFormError(
        language === 'tr'
          ? `"${validInfo.symbol}" hissesi için maksimum 2 alarm sınırına ulaşıldı. Yeni bir alarm eklemek için mevcut alarmlardan birini silmeli veya düzenlemelisiniz.`
          : `Maximum 2 alerts reached for "${validInfo.symbol}". Please delete or edit an existing alert.`
      );
      return;
    }

    if (editingAlertId) {
      updateAlert(editingAlertId, {
        symbol: validInfo.symbol,
        name: validInfo.name,
        type: 'PRICE_TARGET',
        targetValue: val,
        initialPrice: validInfo.price || currentQuotePrice || undefined,
        frequency: formFrequency,
        soundEnabled: formSound,
        notes: formNotes.trim() || undefined,
      });
      setEditingAlertId(null);
    } else {
      addAlert({
        symbol: validInfo.symbol,
        name: validInfo.name,
        type: 'PRICE_TARGET',
        targetValue: val,
        initialPrice: validInfo.price || currentQuotePrice || undefined,
        frequency: formFrequency,
        soundEnabled: formSound,
        notes: formNotes.trim() || undefined,
      });
    }

    setFormNotes('');
    setFormError(null);
    setActiveTab('alerts');
  };

  const startEditingAlert = (al: StockAlert) => {
    setEditingAlertId(al.id);
    setFormSymbol(al.symbol);
    setFormTarget(al.targetValue.toString());
    setFormFrequency(al.frequency || 'ONCE');
    setFormNotes(al.notes || '');
    setFormSound(al.soundEnabled);
    setFormError(null);
    validateSymbol(al.symbol);
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    setEditingAlertId(null);
    setFormNotes('');
    setFormError(null);
    setActiveTab('alerts');
  };

  const handleRequestPermission = async () => {
    const granted = await requestDesktopNotificationPermission();
    setDesktopPermitted(granted);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-drawer-backdrop"
        onClick={() => setIsNotificationsDrawerOpen(false)}
      />

      {/* Slide-over Container with Smooth Animation */}
      <div className="relative w-full max-w-lg bg-[#0e131d] text-white flex flex-col h-full shadow-2xl z-10 animate-drawer-slide">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#121824]">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-bold text-base text-white">
                {language === 'tr' ? 'Alarmlar & Bildirimler' : 'Alerts & Notifications'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'tr' ? 'Canlı Fiyat, RSI ve Piyasa Uyarıları' : 'Live Price & Technical Signals'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNotificationsDrawerOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-[#0a0e16]">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'notifications'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Bildirimler' : 'History'}</span>
            {notifications.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                {notifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'alerts' || activeTab === 'create'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Alarmlarım' : 'My Alerts'}</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500/25 text-cyan-200">
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: NOTIFICATIONS HISTORY */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  {notifications.length} {language === 'tr' ? 'bildirim kayıtlı' : 'notifications'}
                </span>
                <div className="flex items-center gap-3">
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      {language === 'tr' ? 'Okundu Yap' : 'Mark Read'}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-slate-500 hover:text-rose-400 transition"
                    >
                      {language === 'tr' ? 'Temizle' : 'Clear All'}
                    </button>
                  )}
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="py-14 text-center text-slate-500 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-600">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    {language === 'tr' ? 'Henüz tetiklenen bir bildirim yok' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    {language === 'tr'
                      ? 'Fiyat hedefleriniz veya RSI indikatörünüz tetiklendiğinde burada listelenecektir.'
                      : 'Alerts will appear here when price or indicator targets are met.'}
                  </p>
                  <button
                    onClick={() => triggerManualTestNotification('THYAO.IS')}
                    className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{language === 'tr' ? 'Test Sinyali Gönder' : 'Send Test Alert'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((notif) => {
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.symbol) {
                            selectStock(notif.symbol);
                            setIsNotificationsDrawerOpen(false);
                          }
                        }}
                        className={`p-3.5 rounded-xl transition cursor-pointer flex flex-col gap-2 ${
                          notif.read
                            ? 'bg-[#121824]/50 hover:bg-[#161f2e]'
                            : 'bg-[#162230] hover:bg-[#1a283a]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {notif.symbol && (
                              <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                {notif.symbol}
                              </span>
                            )}
                            <span className="font-bold text-xs text-white tracking-tight">{notif.title}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title={language === 'tr' ? 'Bildirimi Sil' : 'Delete Notification'}
                              aria-label={language === 'tr' ? 'Bildirimi Sil' : 'Delete Notification'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                          <span className="text-[10px] text-slate-500">
                            {new Date(notif.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold">
                            <span>{language === 'tr' ? 'Hisse Detayı' : 'View'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY CONFIGURED ALERTS */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>{alerts.length} {language === 'tr' ? 'aktif alarm kurulu' : 'alerts configured'}</span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'tr' ? 'Alarm Ekle' : 'Add Alert'}</span>
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="py-14 text-center text-slate-500 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    {language === 'tr' ? 'Tanımlı alarmınız bulunmuyor' : 'No active alerts'}
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-600/20"
                  >
                    {language === 'tr' ? 'İlk Alarmınızı Kurun' : 'Create First Alert'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((al) => {
                    return (
                      <div
                        key={al.id}
                        onClick={() => {
                          if (al.symbol) {
                            selectStock(al.symbol);
                            setIsNotificationsDrawerOpen(false);
                          }
                        }}
                        className={`p-4 rounded-xl transition cursor-pointer flex flex-col gap-2.5 ${
                          al.isActive
                            ? 'bg-[#141b27] hover:bg-[#182130]'
                            : 'bg-[#10141e]/60 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-sm text-white px-2 py-0.5 rounded bg-white/[0.08]">
                              {al.symbol}
                            </span>
                            <span className="text-xs text-slate-400">
                              {al.name && al.name !== al.symbol ? al.name : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {al.soundEnabled && (
                              <span title="Sesli uyarı açık" className="text-slate-400 flex items-center">
                                <Volume2 className="w-3.5 h-3.5" />
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAlert(al.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                                al.isActive
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-white/[0.06] text-slate-400'
                              }`}
                            >
                              {al.isActive ? (language === 'tr' ? 'AKTİF' : 'ACTIVE') : (language === 'tr' ? 'DURAKLATILDI' : 'PAUSED')}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingAlert(al);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition"
                              title={language === 'tr' ? 'Düzenle' : 'Edit'}
                              aria-label={language === 'tr' ? 'Düzenle' : 'Edit'}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAlert(al.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Target Price & Frequency Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold">
                              <span className="text-slate-400 text-[11px] font-normal">{language === 'tr' ? 'Hedef Fiyat:' : 'Target Price:'}</span>
                              <span className="font-mono">{formatPrice(al.targetValue, al.symbol.endsWith('.IS') ? 'TRY' : 'USD')}</span>
                            </div>

                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.05] text-slate-300 font-medium text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {al.frequency === 'HOURLY' && (language === 'tr' ? 'Saatte Bir' : 'Hourly')}
                                {al.frequency === 'DAILY' && (language === 'tr' ? 'Günlük' : 'Daily')}
                                {al.frequency === 'ALWAYS' && (language === 'tr' ? 'Her Geçişte' : 'Every Cross')}
                                {(!al.frequency || al.frequency === 'ONCE') && (language === 'tr' ? 'Tek Seferlik' : 'Once')}
                              </span>
                            </div>

                            {al.initialPrice && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                (Giriş: {formatPrice(al.initialPrice, al.symbol.endsWith('.IS') ? 'TRY' : 'USD')})
                              </span>
                            )}
                          </div>

                          {!al.notes && (
                            <span className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold text-[11px] ml-auto">
                              <span>{language === 'tr' ? 'Hisse Detayı' : 'View'}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* Description / Notes aligned inline with Asset Detail link */}
                        {al.notes && (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <p className="text-[11px] text-slate-400 italic truncate min-w-0 flex-1" title={al.notes}>
                              "{al.notes}"
                            </p>
                            <span className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold text-[11px] shrink-0 ml-auto">
                              <span>{language === 'tr' ? 'Hisse Detayı' : 'View'}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE / EDIT ALERT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateAlert} className="space-y-4">
              {/* Back to list navigation row */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>
                    {editingAlertId
                      ? (language === 'tr' ? 'Vazgeç' : 'Cancel')
                      : (language === 'tr' ? 'Alarmlarıma Dön' : 'Back to Alerts')}
                  </span>
                </button>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  {editingAlertId
                    ? (language === 'tr' ? `Alarmı Düzenle (${formSymbol})` : `Edit Alert (${formSymbol})`)
                    : (language === 'tr' ? 'Yeni Alarm Kur' : 'Create Alert')}
                </span>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div className="p-3.5 bg-rose-500/15 rounded-xl flex items-center gap-2.5 text-xs text-rose-300 font-bold animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Symbol Input & Quick Picker with Verification */}
              <div ref={searchBoxRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {language === 'tr' ? 'Hisse Kodu / Varlık' : 'Stock Ticker'}
                  </label>
                  {isValidatingSymbol ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Doğrulanıyor...
                    </span>
                  ) : isMaxAlertsReached ? (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono font-bold bg-amber-500/15 px-2 py-0.5 rounded-md">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {language === 'tr' ? '2/2 Alarm Sınırında' : '2/2 Alerts Limit'}
                    </span>
                  ) : symbolValidated === true && validatedStockInfo ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {symbolAlertsCount > 0 ? `(${symbolAlertsCount}/2 Alarm Kuruldu)` : 'Doğrulandı (0/2 Alarm)'}
                    </span>
                  ) : symbolValidated === false ? (
                    <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Geçersiz Varlık Kodu
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => {
                      setFormSymbol(e.target.value.toUpperCase());
                      setSearchQuery(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="Örn: THYAO.IS, GARAN.IS, NVDA, AAPL"
                    className={`w-full bg-[#141b27] rounded-xl pl-3.5 pr-24 py-2.5 text-sm font-mono font-bold text-white placeholder-slate-500 outline-none transition hover:bg-[#182130] focus:bg-[#1a2436] ${
                      symbolValidated === false ? 'text-rose-300' : ''
                    }`}
                    required
                  />

                  {currentQuotePrice !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-400 font-bold bg-[#0e1420] px-2 py-0.5 rounded-lg">
                      {formatPrice(currentQuotePrice, formSymbol.endsWith('.IS') ? 'TRY' : 'USD')}
                    </div>
                  )}

                  {/* Autocomplete Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 bg-[#161d2b] rounded-xl mt-1.5 shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
                      {searchResults.map((r) => (
                        <div
                          key={r.symbol}
                          onClick={() => handleSelectStock(r)}
                          className="p-2.5 hover:bg-[#1f2a3d] cursor-pointer flex items-center justify-between transition text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-white">{r.symbol}</span>
                            <span className="text-slate-400 truncate max-w-[180px]">{r.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                            {r.exchange || (r.symbol.endsWith('.IS') ? 'BIST' : 'US')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Warning box if max limit is reached for this symbol */}
                {isMaxAlertsReached && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-amber-300">
                        {language === 'tr'
                          ? `"${formSymbol}" için maksimum 2 alarm sınırına ulaşıldı.`
                          : `Maximum 2 alerts limit reached for "${formSymbol}".`}
                      </span>
                      <p className="text-slate-300 text-[11px] leading-tight">
                        {language === 'tr'
                          ? 'Bir hisse için en fazla 2 alarm eklenebilir. Yeni alarm eklemek için mevcut alarmlarınızdan birini silebilir veya düzenleyebilirsiniz.'
                          : 'A maximum of 2 alerts are allowed per stock symbol. You can delete or edit an existing alert.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('alerts')}
                        className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 mt-1 text-left w-fit"
                      >
                        <span>{language === 'tr' ? 'Alarmlarıma Git ve Yönet →' : 'Go to Alerts & Manage →'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick select pills */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  {['THYAO.IS', 'GARAN.IS', 'ASELS.IS', 'EREGL.IS', 'NVDA', 'AAPL', 'TSLA'].map(sym => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => {
                        setFormSymbol(sym);
                        setSearchQuery('');
                        setSearchResults([]);
                        validateSymbol(sym);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                        formSymbol === sym
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Value Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {language === 'tr' ? 'Hedef Fiyat Değeri' : 'Target Price'}
                  </label>
                  {currentQuotePrice !== null && (
                    <span className="text-[11px] text-slate-400">
                      {language === 'tr' ? 'Mevcut:' : 'Current:'}{' '}
                      <strong className="text-emerald-400 font-mono">
                        {formatPrice(currentQuotePrice, formSymbol.endsWith('.IS') ? 'TRY' : 'USD')}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="320.00"
                    className="w-full bg-[#141b27] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder-slate-500 outline-none transition hover:bg-[#182130] focus:bg-[#1a2436]"
                    required
                  />
                </div>

                {/* Quick Presets for Target Price */}
                {currentQuotePrice !== null && (
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                    {[
                      { label: '-5%', factor: 0.95 },
                      { label: '-2%', factor: 0.98 },
                      { label: '+2%', factor: 1.02 },
                      { label: '+5%', factor: 1.05 },
                      { label: '+10%', factor: 1.10 },
                    ].map(p => {
                      const calculated = (currentQuotePrice * p.factor).toFixed(2);
                      return (
                        <button
                          type="button"
                          key={p.label}
                          onClick={() => setFormTarget(calculated)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                            formTarget === calculated
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-white/[0.06] text-slate-400 hover:text-white'
                          }`}
                        >
                          {p.label} ({calculated})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Repetition Frequency Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'tr' ? 'Tekrarlama Sıklığı' : 'Repeat Frequency'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'ONCE',
                      label: language === 'tr' ? 'Tek Seferlik' : 'Once',
                      desc: language === 'tr' ? 'Hedefe ulaşınca kapanır' : 'Triggers once',
                      icon: <Clock className="w-3.5 h-3.5 text-slate-400" />
                    },
                    {
                      id: 'HOURLY',
                      label: language === 'tr' ? 'Saatte Bir' : 'Hourly',
                      desc: language === 'tr' ? 'Hedefteyken saatte 1' : 'Max 1/hour',
                      icon: <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                    },
                    {
                      id: 'DAILY',
                      label: language === 'tr' ? 'Günlük' : 'Daily',
                      desc: language === 'tr' ? 'Hedefteyken günde 1' : 'Max 1/day',
                      icon: <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    },
                    {
                      id: 'ALWAYS',
                      label: language === 'tr' ? 'Her Geçişte' : 'Continuous',
                      desc: language === 'tr' ? 'Her test edişinde' : 'Every test',
                      icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    }
                  ].map(f => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setFormFrequency(f.id as AlertFrequency)}
                      className={`flex flex-col items-start p-2.5 rounded-xl text-left transition ${
                        formFrequency === f.id
                          ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                          : 'bg-[#141b27] text-slate-300 hover:bg-[#182130]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {f.icon}
                        <span className="text-xs font-bold">{f.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal leading-tight mt-1">
                        {f.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'tr' ? 'Alarm Notu / Açıklama (İsteğe bağlı)' : 'Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Örn: 320 TL direnç kırılımı alım yap"
                  className="w-full bg-[#141b27] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition hover:bg-[#182130] focus:bg-[#1a2436]"
                />
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#141b27]">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'tr' ? 'Sesli Uyarı Çal' : 'Play Sound Alert'}</span>
                </div>
                <input
                  type="checkbox"
                  checked={formSound}
                  onChange={(e) => setFormSound(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isMaxAlertsReached}
                className={`w-full py-3 font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                  isMaxAlertsReached
                    ? 'bg-[#182030] text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                }`}
              >
                {editingAlertId ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                <span>
                  {isMaxAlertsReached
                    ? (language === 'tr' ? 'Maksimum 2 Alarm Sınırı Dolu' : 'Max 2 Alerts Limit Reached')
                    : editingAlertId
                    ? (language === 'tr' ? 'Değişiklikleri Kaydet' : 'Save Changes')
                    : (language === 'tr' ? 'Alarmı Oluştur ve Başlat' : 'Create & Activate Alert')}
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Drawer Footer with Web Push Status & Controls */}
        <div className="p-4 bg-[#0c1018] flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleRequestPermission}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition flex-1 ${
                isWebPushActive
                  ? 'text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/20'
                  : 'text-slate-200 bg-[#162030] hover:bg-[#1d2a40]'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${isWebPushActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <div className="flex flex-col items-start leading-tight text-left">
                <span className="font-bold">
                  {isWebPushActive
                    ? (language === 'tr' ? 'Web Push Aktif' : 'Web Push Active')
                    : (language === 'tr' ? 'Web Push Bildirimlerini Aç' : 'Enable Web Push')}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {isWebPushActive
                    ? (language === 'tr' ? 'Arka planda anlık masaüstü uyarısı' : 'Background desktop alerts enabled')
                    : (language === 'tr' ? 'Tarayıcı izni vererek anlık bildirim alın' : 'Click to grant browser permission')}
                </span>
              </div>
            </button>

            <button
              onClick={() => triggerManualTestNotification(formSymbol || 'THYAO.IS')}
              className="px-3 py-2 bg-[#162030] hover:bg-[#1f2d44] text-emerald-400 font-bold rounded-xl text-xs transition shrink-0 flex items-center gap-1.5"
              title="Test Push Gönder"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Test Push' : 'Test'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
