'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useFormMode } from './form-mode';

/**
 * What a "Create …" button does: go to the form's page in classic, open
 * the dialog in standard (SB-07).
 */
export function useOpenForm(pageHref: string, openDialog: () => void): () => void {
  const mode = useFormMode();
  const router = useRouter();
  return useCallback(() => {
    if (mode === 'page') router.push(pageHref);
    else openDialog();
  }, [mode, router, pageHref, openDialog]);
}
