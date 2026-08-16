'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TextSize = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'ps-text-size';
/** Migrate from shop-only control if present. */
const LEGACY_SHOP_KEY = 'ps-shop-text-size';

type TextSizeContextValue = {
  size: TextSize;
  setSize: (next: TextSize) => void;
};

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

function applyTextSize(size: TextSize) {
  document.documentElement.dataset.textSize = size;
}

function readStored(): TextSize {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'sm' || v === 'md' || v === 'lg') return v;
    const legacy = localStorage.getItem(LEGACY_SHOP_KEY);
    if (legacy === 'sm' || legacy === 'md' || legacy === 'lg') {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return 'md';
}

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSizeState] = useState<TextSize>('md');

  useEffect(() => {
    const next = readStored();
    setSizeState(next);
    applyTextSize(next);
  }, []);

  const setSize = useCallback((next: TextSize) => {
    setSizeState(next);
    applyTextSize(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ size, setSize }), [size, setSize]);

  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
  const ctx = useContext(TextSizeContext);
  if (!ctx) {
    throw new Error('useTextSize must be used within TextSizeProvider');
  }
  return ctx;
}
