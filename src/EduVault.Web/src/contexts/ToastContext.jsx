import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return;
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast = { id, message, type };

    setToasts(prev => [...prev.slice(-4), newToast]); // keep max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 4500),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur || 4000),
  };

  // Expose global window helper for easy fallback
  if (typeof window !== 'undefined') {
    window.appToast = toast;
  }

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />;
    }
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-white/95 text-emerald-900 shadow-emerald-500/10';
      case 'error':
        return 'border-rose-200 bg-white/95 text-rose-900 shadow-rose-500/10';
      case 'warning':
        return 'border-amber-200 bg-white/95 text-amber-900 shadow-amber-500/10';
      default:
        return 'border-sky-200 bg-white/95 text-sky-900 shadow-sky-500/10';
    }
  };

  return (
    <ToastContext.Provider value={{ toast, showToast: addToast, removeToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div 
        aria-live="polite" 
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-3 fade-in ${getToastStyles(t.type)}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 text-xs font-medium leading-relaxed select-text">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-md shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      toast: {
        success: (m) => console.log('[Toast Success]:', m),
        error: (m) => console.error('[Toast Error]:', m),
        info: (m) => console.log('[Toast Info]:', m),
        warning: (m) => console.warn('[Toast Warning]:', m),
      },
      showToast: (m) => console.log('[Toast]:', m),
      removeToast: () => {}
    };
  }
  return ctx;
};
