import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  error:   <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
  info:    <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />,
};

const STYLES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error:   'border-rose-500/30 bg-rose-500/10 text-rose-300',
  info:    'border-violet-500/30 bg-violet-500/10 text-violet-300',
};

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const toast = useCallback(({ message, type = 'info', duration = 5000 }) => {
    const id = ++idCounter;
    setToasts(prev => [...prev.slice(-4), { id, message, type, leaving: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((msg, dur) => toast({ message: msg, type: 'success', duration: dur }), [toast]);
  const error   = useCallback((msg, dur) => toast({ message: msg, type: 'error',   duration: dur }), [toast]);
  const info    = useCallback((msg, dur) => toast({ message: msg, type: 'info',    duration: dur }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
        style={{ maxWidth: 'min(380px, calc(100vw - 2rem))' }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border
              backdrop-blur-xl shadow-2xl text-sm font-medium w-full
              transition-all duration-300
              ${STYLES[t.type]}
              ${t.leaving
                ? 'opacity-0 translate-y-2 scale-95'
                : 'opacity-100 translate-y-0 scale-100'}
            `}
          >
            {ICONS[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
