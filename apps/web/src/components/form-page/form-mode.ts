'use client';

import type { AdminLayout } from '@/lib/admin-layout';
import { useAdminLayout } from '@/lib/layout-context';

/**
 * How a create/edit form is shown (requirements SB-07): the standard
 * layout keeps today's dialog; the classic layout gives every form its
 * own page under the module frame. The form itself is the same component,
 * with the same fields and validation, in both.
 */
export type FormMode = 'dialog' | 'page';

export function formModeFor(layout: AdminLayout): FormMode {
  return layout === 'classic' ? 'page' : 'dialog';
}

/** The presentation forms use in this society's layout. */
export function useFormMode(): FormMode {
  return formModeFor(useAdminLayout());
}
