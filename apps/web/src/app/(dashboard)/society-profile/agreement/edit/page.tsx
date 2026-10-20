'use client';

import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgreementVersions } from '@/hooks/use-society-agreement';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { isNotDeployed } from '@/lib/not-deployed';
import { AGREEMENT_EDITORS, NOT_AVAILABLE } from '../agreement-access';
import { AgreementEditor } from './agreement-editor';

/** Society Profile › User Agreement › Read/Edit Default Agreement (PROF-S5, PROF-40). */
export default function Page(): ReactNode {
  const versions = useAgreementVersions();
  if (versions.isLoading) return <Skeleton className="h-64 w-full" />;
  if (versions.error || !versions.data) {
    const message = isNotDeployed(versions.error) ? NOT_AVAILABLE : `Could not load the user agreement: ${friendlyError(versions.error)}`;
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">{message}</CardContent>
      </Card>
    );
  }
  const editable = versions.data.editable;
  return <AgreementEditor key={`${editable.id}:${editable.updated_at}`} editable={editable} canEdit={AGREEMENT_EDITORS.has(currentRole() ?? '')} />;
}
