'use client';

import { useEffect } from 'react';

/** Warn on tab close / refresh when there are unsaved changes. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/**
 * Ctrl/Cmd+S triggers save when dirty (or always if `requireDirty` is false).
 * Ignores the shortcut while focus is in a contenteditable without modifier handling.
 */
export function useSaveShortcut(
  save: () => void | Promise<void>,
  options: { enabled?: boolean; requireDirty?: boolean; dirty?: boolean } = {},
) {
  const { enabled = true, requireDirty = true, dirty = true } = options;

  useEffect(() => {
    if (!enabled) return;
    if (requireDirty && !dirty) return;

    function onKeyDown(e: KeyboardEvent) {
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
      if (!isSave) return;
      e.preventDefault();
      void save();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save, enabled, requireDirty, dirty]);
}
