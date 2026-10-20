'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAmcContract } from '@/hooks/use-amc-contracts';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { AmcForm } from './amc-form';
import { AmcList, type AmcView } from './amc-list';

/** Vendor Master › AMCs (VEND-11): the lists and the contract form as pages. */
export const AMC_BASE = '/vendor-master/amc';

export function AmcListPage({ view }: { view: AmcView }): ReactNode {
  const router = useRouter();
  return (
    <AmcList
      view={view}
      onEdit={(row) => router.push(`${AMC_BASE}/${row.id}`)}
      onRenew={view === 'expired' ? (row) => router.push(`${AMC_BASE}/new?renew=${row.id}`) : undefined}
    />
  );
}

function Loading({ error }: { error: unknown }): ReactNode {
  if (isNotDeployed(error)) return <p className="text-sm text-muted-foreground">AMC contracts are not available here yet.</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">Could not load the contract: {friendlyError(error)}</p>;
  return <Skeleton className="h-64 w-full" />;
}

/** Create Contract, or Renew with `?renew=<id>` (VEND-S8, VEND-S6). */
export function AmcNewPage(): ReactNode {
  const router = useRouter();
  const renewId = useSearchParams().get('renew') ?? '';
  const renewFrom = useAmcContract(renewId);
  if (renewId && !renewFrom.data) return <Loading error={renewFrom.error} />;
  return (
    <AmcForm
      key={renewId || 'new'}
      mode="page"
      renewFrom={renewId ? renewFrom.data : null}
      onClose={() => router.push(`${AMC_BASE}/${renewId ? 'expired' : 'active'}`)}
      onSaved={() => router.push(`${AMC_BASE}/active`)}
    />
  );
}

/** Edit a contract (VEND-S8 in edit mode). */
export function AmcEditPage(): ReactNode {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const query = useAmcContract(id);
  if (!query.data) return <Loading error={query.error} />;
  const back = `${AMC_BASE}/${query.data.effective_status === 'active' || query.data.status === 'active' ? 'active' : 'expired'}`;
  return <AmcForm key={query.dataUpdatedAt} mode="page" contract={query.data} onClose={() => router.push(back)} onSaved={() => router.push(back)} />;
}
