'use client';

import { type ReactNode } from 'react';
import { useTenant } from '@/hooks/use-tenants';
import { getCurrentTenant } from '@/lib/auth';

/**
 * PROF-42: where the files ticked Public are offered — the society's
 * logged-out page on the resident web. Nothing is public unless ticked.
 */
export function PublicPageNote(): ReactNode {
  const tenant = useTenant(getCurrentTenant() ?? '');
  const slug = tenant.data?.slug;
  return (
    <p className="text-xs text-muted-foreground" data-testid="public-page-note">
      Files are for signed-in residents only. A file ticked Public (on Upload File or Edit) is also listed on the society’s public
      page on the resident web{slug ? <>, at <span className="font-mono">/s/{slug}/files</span></> : null}.
    </p>
  );
}
