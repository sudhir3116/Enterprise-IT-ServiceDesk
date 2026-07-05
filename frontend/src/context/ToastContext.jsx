import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContext = createContext();

const toastConfig = {
  success: {
    icon: CheckCircle,
    borderColor: 'var(--ds-success)',
    iconColor: 'var(--ds-success)',
  },
  error: {
    icon: XCircle,
    borderColor: 'var(--ds-danger)',
    iconColor: 'var(--ds-danger)',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'var(--ds-warning)',
    iconColor: 'var(--ds-warning)',
  },
  info: {
    icon: Info,
    borderColor: 'var(--ds-info)',
    iconColor: 'var(--ds-info)',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const config = toastConfig[t.type] || toastConfig.success;
          const IconComp = config.icon;
          return (
            <div
              key={t.id}
              className="pointer-events-auto rounded-lg border animate-slide-in-down flex items-start gap-3 px-4 py-3"
              style={{
                backgroundColor: 'var(--ds-surface-overlay)',
                borderColor: 'var(--ds-border)',
                borderLeftWidth: '3px',
                borderLeftColor: config.borderColor,
                boxShadow: 'var(--ds-shadow-lg)',
              }}
            >
              <IconComp 
                className="w-4 h-4 mt-0.5 shrink-0" 
                style={{ color: config.iconColor }} 
              />
              <span 
                className="text-[13px] font-medium flex-1 leading-snug"
                style={{ color: 'var(--ds-text-primary)' }}
              >
                {t.message}
              </span>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 ml-1 transition-colors"
                style={{ color: 'var(--ds-text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ds-text-muted)'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
