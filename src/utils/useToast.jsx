import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Check, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const DISMISS_MS = 3000;

/**
 * Provider — wrap your app with this to enable useToast() anywhere.
 *
 * Renders a single auto-dismissing toast at the top of the viewport.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Sparat!');
 *   toast.error('Kunde inte spara');
 *   toast.info('Redan delad');
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null); // { message, type, key }
  const timerRef = useRef(null);

  const show = useCallback((message, type = 'info') => {
    setCurrent({ message, type, key: Date.now() });
  }, []);

  const api = useCallback({
    show,
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
  }, [show]);

  // Auto-dismiss
  useEffect(() => {
    if (current) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCurrent(null), DISMISS_MS);
      return () => clearTimeout(timerRef.current);
    }
  }, [current?.key]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast rendering */}
      {current && (
        <div
          key={current.key}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm flex items-center gap-3 transition-all max-w-[90vw] ${
            current.type === 'success' ? 'bg-green-500/90 text-white' :
            current.type === 'error'   ? 'bg-red-500/90 text-white' :
            'bg-gray-800/90 text-white border border-white/10'
          }`}
          style={{
            marginTop: 'env(safe-area-inset-top)',
            animation: 'toast-slide-in 0.3s ease-out',
          }}
          onClick={() => setCurrent(null)}
        >
          {current.type === 'success' && <Check size={18} className="flex-shrink-0" />}
          {current.type === 'error' && <AlertTriangle size={18} className="flex-shrink-0" />}
          {current.type === 'info' && <Info size={18} className="flex-shrink-0" />}
          <span className="text-sm font-medium">{current.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/**
 * Hook — returns { success, error, info, show }.
 *
 *   const toast = useToast();
 *   toast.error('Kunde inte spara!');
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
