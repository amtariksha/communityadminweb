'use client';

import { useState } from 'react';
import type { FetchCriteria } from './fetch-criteria';

/**
 * The criteria a fetch-mode register was last fetched with (SB-09); null
 * until the first Fetch. The page builds its query from it and passes
 * `fetched: criteria !== null` to the table. Each Fetch starts at page 1.
 */
export function useFetchCriteria(onFetch?: () => void): {
  criteria: FetchCriteria | null;
  fetch: (criteria: FetchCriteria) => void;
} {
  const [criteria, setCriteria] = useState<FetchCriteria | null>(null);
  return {
    criteria,
    fetch: (next) => {
      setCriteria(next);
      onFetch?.();
    },
  };
}
