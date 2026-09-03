import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export interface ToastMessage {
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold pointer-events-auto transition-all ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : toast.type === 'info'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-200 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        console.log(`[Toast ${type}]: ${message}`);
      },
    };
  }
  return context;
};
