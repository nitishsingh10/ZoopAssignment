'use client';

import { useState, useCallback } from 'react';
import type { Toast } from '@/types/agent';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface UseToastReturn {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  ToastContainer: React.FC;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer: React.FC = () => (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' && <CheckCircle size={16} color="var(--green)" />}
            {t.type === 'error' && <XCircle size={16} color="var(--red)" />}
            {t.type === 'info' && <Info size={16} color="var(--accent)" />}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  return { toasts, addToast, removeToast, ToastContainer };
}
