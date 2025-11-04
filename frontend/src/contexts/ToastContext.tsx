import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AuthContext } from './AuthContext';

type Toast = {
  id: string;
  message: string;
  createdAt: number;
  variant?: 'default' | 'error' | 'success' | 'info';
};

type ToastContextType = {
  toasts: Toast[];
  addToast: (message: string, ms?: number, variant?: Toast['variant']) => string;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { socket } = useContext(AuthContext)!;

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback((message: string, ms = 5000, variant: Toast['variant'] = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, message, createdAt: Date.now(), variant };
  // Append new toasts so the newest toast appears nearest the bottom (container is bottom-anchored)
  setToasts((t) => [...t, toast]);
    if (ms > 0) {
      setTimeout(() => removeToast(id), ms);
    }
    return id;
  }, [removeToast]);

  // Subscribe to socket events and show global toasts
  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload: unknown) => {
      let text = 'New swap request received';
      try {
        const p = payload as Record<string, unknown> | undefined;
        if (p && typeof p.requester_name === 'string') text = `${p.requester_name} requested a swap`;
      } catch (e) {
        console.debug('onCreated payload parsing failed', e);
      }
      addToast(text);
    };

    const onUpdated = (payload: unknown) => {
      let text = 'Swap request updated';
      let variant: Toast['variant'] = 'default';
      try {
        const p = payload as Record<string, unknown> | undefined;
        if (p && p.id && p.status) {
          const statusStr = String(p.status).toLowerCase();
          text = `Request ${String(p.id)} ${String(p.status)}`;
          if (statusStr.includes('reject')) variant = 'error';
          else if (statusStr.includes('approve') || statusStr.includes('accepted') || statusStr.includes('approved')) variant = 'success';
        } else if (p) text = JSON.stringify(p);
      } catch (e) {
        console.debug('onUpdated payload parsing failed', e);
      }
      addToast(text, 5000, variant);
    };

    const onEventsChanged = () => {
      addToast('Your events were updated');
    };

    socket.on('swap_request_created', onCreated);
    socket.on('swap_request_updated', onUpdated);
    socket.on('events_changed', onEventsChanged);

    return () => {
      socket.off('swap_request_created', onCreated);
      socket.off('swap_request_updated', onUpdated);
      socket.off('events_changed', onEventsChanged);
    };
  }, [socket, addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm w-full shadow-lg rounded-lg overflow-hidden ${t.variant === 'error' ? 'bg-rose-500' : 'bg-emerald-400'}`}>
            <div className="p-3 flex items-start gap-3">
              <div className="flex-1 text-sm text-white">{t.message}</div>
              <button
                aria-label="close"
                onClick={() => removeToast(t.id)}
                className="text-white hover:text-gray-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
