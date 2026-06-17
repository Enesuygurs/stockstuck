import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, X, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { activeToast, dismissToast, selectStock, language, isNotificationsDrawerOpen } = useApp();

  if (!activeToast || isNotificationsDrawerOpen) return null;

  const getSeverityStyles = () => {
    switch (activeToast.severity) {
      case 'success':
        return {
          bg: 'bg-[#10231c]',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-[#251d10]',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          badgeBg: 'bg-amber-500/20 text-amber-400',
        };
      case 'error':
        return {
          bg: 'bg-[#281318]',
          icon: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
          badgeBg: 'bg-rose-500/20 text-rose-400',
        };
      default:
        return {
          bg: 'bg-[#121c2b]',
          icon: <Bell className="w-5 h-5 text-cyan-400 shrink-0" />,
          badgeBg: 'bg-cyan-500/20 text-cyan-400',
        };
    }
  };

  const style = getSeverityStyles();

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`p-4 rounded-2xl shadow-2xl ${style.bg} backdrop-blur-xl flex flex-col gap-2.5 text-white`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/[0.06]">
              {style.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">{activeToast.title}</span>
                {activeToast.symbol && (
                  <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md ${style.badgeBg}`}>
                    {activeToast.symbol}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date(activeToast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed pl-1">
          {activeToast.message}
        </p>

        {activeToast.symbol && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                selectStock(activeToast.symbol);
                dismissToast();
              }}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition py-1 px-2.5 rounded-lg hover:bg-emerald-500/10"
            >
              <span>{language === 'tr' ? 'Grafiğe Git' : 'View Stock'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
