import { useEffect, useState } from 'react';

/**
 * Stable debounced value — re-runs the timer only when `value` changes.
 *
 * Used by `UserSearchSelect` (and any future search-as-you-type component)
 * to keep the in-flight `/users/search` calls under one per typing burst.
 * 300ms is the same window the existing react-query patterns elsewhere
 * in the app target.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(handle);
    };
  }, [value, delayMs]);

  return debounced;
}
