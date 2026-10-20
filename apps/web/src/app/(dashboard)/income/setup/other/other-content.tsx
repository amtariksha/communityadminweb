'use client';

import { useMemo, type ReactNode } from 'react';
import { useDocumentSettings } from '@/hooks/use-billing-documents';
import { friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { canChangeSettings } from '../../../settings/settings-access';
import { DocumentOptionsCard } from './document-options-card';
import { LetterheadCard } from './letterhead-card';
import { NumberingCard } from './numbering-card';

function DocumentCards({ canWrite }: { canWrite: boolean }): ReactNode {
  const query = useDocumentSettings();
  if (isNotDeployed(query.error)) {
    return <p className="text-sm text-muted-foreground">Document options are not available yet on this server.</p>;
  }
  if (query.error) return <p role="alert" className="text-sm text-destructive">{friendlyError(query.error)}</p>;
  if (!query.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <>
      <DocumentOptionsCard view={query.data} canWrite={canWrite} />
      <LetterheadCard view={query.data} canWrite={canWrite} />
    </>
  );
}

/**
 * Income Tracker › Setup › Other (INC-S9): document options, the letter
 * head and the numbering of each series. The community admin changes them;
 * other finance roles see them.
 */
export function OtherContent(): ReactNode {
  const canWrite = useMemo(() => canChangeSettings(), []);
  return (
    <>
      <DocumentCards canWrite={canWrite} />
      <NumberingCard canWrite={canWrite} />
    </>
  );
}
