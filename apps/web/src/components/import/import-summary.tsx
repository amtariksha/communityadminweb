'use client';

import { type ReactNode } from 'react';
import type { ImportCommitResult, ImportPreview } from '@/hooks/use-imports';

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** The line above the preview table: how many rows, how many fine, how many wrong, and whether the commit can go. */
export function PreviewSummary({ preview }: { preview: ImportPreview }): ReactNode {
  const parts = [`${plural(preview.total_rows, 'row')} read`, `${preview.valid_rows} ready`];
  if (preview.skip_rows > 0) parts.push(`${preview.skip_rows} left as they are`);
  if (preview.error_rows > 0) parts.push(`${plural(preview.error_rows, 'row')} with errors`);
  return (
    <div className="space-y-1 text-sm" role="status">
      <p className="font-medium">{parts.join(' · ')}</p>
      {preview.already_applied && (
        <p className="text-destructive">
          This file was already posted on {preview.already_applied.applied_at.slice(0, 10)}
          {preview.already_applied.applied_by_name ? ` by ${preview.already_applied.applied_by_name}` : ''}. It will not be posted again.
        </p>
      )}
      {!preview.already_applied && preview.error_rows > 0 && preview.invalid_rows === 'block' && (
        <p className="text-destructive">Nothing can be posted until every row is right: fix the rows below, or remove them, and upload again.</p>
      )}
      {!preview.already_applied && preview.error_rows > 0 && preview.invalid_rows === 'skip' && (
        <p className="text-muted-foreground">The rows with errors are left out; the others go ahead.</p>
      )}
    </div>
  );
}

const OUTCOMES: ReadonlyArray<[keyof Pick<ImportCommitResult, 'created' | 'updated' | 'posted' | 'skipped' | 'error_rows'>, string]> = [
  ['created', 'added'],
  ['updated', 'updated'],
  ['posted', 'posted'],
  ['skipped', 'left as they were'],
  ['error_rows', 'not imported (errors)'],
];

/** What the commit did. */
export function CommitSummary({ result }: { result: ImportCommitResult }): ReactNode {
  const parts = OUTCOMES.filter(([key]) => result[key] > 0).map(([key, word]) => `${result[key]} ${word}`);
  const skipped = result.rows.filter((row) => row.status === 'skipped' && row.message);
  const reasons = [...new Set(skipped.map((row) => row.message))];
  return (
    <div className="space-y-1 rounded-md border border-success/40 bg-success/10 p-3 text-sm" role="status">
      <p className="font-medium">Done: {parts.length > 0 ? parts.join(' · ') : 'nothing to change'}.</p>
      {reasons.length > 0 && <p className="text-muted-foreground">Left as they were: {reasons.join('; ')}.</p>}
    </div>
  );
}
