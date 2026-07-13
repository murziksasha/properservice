'use client';

import { useCallback, useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

type Listener = (toast: Omit<ToastMessage, 'id'>) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/** Imperative toast API for admin editors. */
export function showToast(text: string, kind: ToastKind = 'info') {
  listeners.forEach((fn) => fn({ text, kind }));
}

export function AdminToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    listeners.add(push);
    return () => {
      listeners.delete(push);
    };
  }, [push]);

  if (!toasts.length) return null;

  return (
    <div className='admin-toast-host' role='status' aria-live='polite'>
      {toasts.map((t) => (
        <div key={t.id} className={`admin-toast admin-toast--${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
