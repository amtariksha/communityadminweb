'use client';

import { useEffect, useState } from 'react';
import { currentRole } from '@/lib/current-role';
import { financeAccessFor, type FinanceAccess } from '@/lib/finance-roles';

/**
 * The signed-in user's finance access in the current society. Read after
 * mount: the role lives in localStorage, which the server render cannot see,
 * so the first render answers "neither".
 */
export function useFinanceAccess(): FinanceAccess {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    setRole(currentRole());
  }, []);
  return financeAccessFor(role);
}
