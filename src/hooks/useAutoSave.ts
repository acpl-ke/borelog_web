import { useEffect, useRef, useState } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Calls `saveFn(value)` 600ms after the last change to `value`.
 * Returns the current save state for UI feedback.
 */
export function useAutoSave<T>(
  value: T,
  saveFn: (v: T) => Promise<void>,
  delayMs = 600,
  enabled = true
) {
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // skip the first run so we don't auto-save on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!enabled) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        setState('saving');
        await saveFn(value);
        setState('saved');
        // Hide "Saved" indicator after 3s
        window.setTimeout(() => setState('idle'), 3000);
      } catch {
        setState('error');
      }
    }, delayMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled]);

  return state;
}
