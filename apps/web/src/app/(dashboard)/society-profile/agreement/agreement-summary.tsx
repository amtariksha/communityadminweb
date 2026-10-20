'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { agreementKeys, useAgreementStats, useAgreementVersions, type AgreementVersions } from '@/hooks/use-society-agreement';
import { useUpdateSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { formatDate } from '@/lib/utils';
import { AGREEMENT_EDITORS, ENABLE_QUESTION, NOT_AVAILABLE } from './agreement-access';
import { AgreementVersionsTable } from './agreement-versions-table';

function Notice({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }): ReactNode {
  return (
    <Card>
      <CardContent className={`pt-6 text-sm ${tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{children}</CardContent>
    </Card>
  );
}

function useToggle(enabled: boolean) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const update = useUpdateSocietyProfile();
  function toggle(): void {
    if (!enabled && !window.confirm(ENABLE_QUESTION)) return;
    update.mutate(
      { agreement_enabled: !enabled },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: agreementKeys.all });
          addToast({ title: enabled ? 'User agreement switched off' : 'User agreement switched on', variant: 'success' });
        },
        onError: (error) => addToast({ title: 'Could not change the user agreement', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }
  return { toggle, pending: update.isPending };
}

function Facts({ data, accepted, residents }: { data: AgreementVersions; accepted: number | null; residents: number | null }): ReactNode {
  const current = data.current;
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Current version</dt>
        <dd className="font-medium">{current ? `Version ${current.version}` : 'None published yet'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Published on</dt>
        <dd className="font-medium">{current?.published_at ? formatDate(current.published_at) : '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Accepted</dt>
        <dd className="font-medium" data-testid="agreement-acceptance">
          {current && accepted !== null && residents !== null ? `${accepted} of ${residents} residents have accepted` : '—'}
        </dd>
      </div>
    </dl>
  );
}

/**
 * User Agreement (PROF-S4): the switch (the button is the status), the
 * current version, its date and how many residents have accepted it, and
 * the versions so far. Read/Edit opens PROF-S5.
 */
export function AgreementSummary({ role }: { role: string | null }): ReactNode {
  const versions = useAgreementVersions();
  const stats = useAgreementStats();
  const enabled = versions.data?.enabled ?? false;
  const { toggle, pending } = useToggle(enabled);
  const canEdit = AGREEMENT_EDITORS.has(role ?? '');

  if (versions.isLoading) return <Skeleton className="h-48 w-full" />;
  if (isNotDeployed(versions.error)) return <Notice>{NOT_AVAILABLE}</Notice>;
  if (versions.error || !versions.data) return <Notice tone="error">Could not load the user agreement: {friendlyError(versions.error)}</Notice>;
  const data = versions.data;
  const published = data.current !== null;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          When it is on, residents are asked to accept the society&rsquo;s agreement after they sign in to the resident app or the
          resident web, and again after each new version you publish. Paying dues never waits for it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/society-profile/agreement/edit" className={buttonVariants({ variant: 'outline' })}>
            Read/Edit Default Agreement
          </Link>
          {canEdit && (
            <Button type="button" onClick={toggle} disabled={pending || (!enabled && !published)}>
              {enabled ? 'Disable User Agreement' : 'Enable User Agreement'}
            </Button>
          )}
          <Badge variant={enabled ? 'success' : 'secondary'}>{enabled ? 'On' : 'Off'}</Badge>
        </div>
        {!published && <p className="text-xs text-muted-foreground">Publish a version before switching the agreement on.</p>}
        <Facts data={data} accepted={stats.data?.accepted ?? null} residents={stats.data?.residents ?? null} />
        <AgreementVersionsTable versions={data.versions} />
      </CardContent>
    </Card>
  );
}
