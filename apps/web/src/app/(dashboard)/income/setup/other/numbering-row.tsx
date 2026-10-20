'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import type { NumberingRow } from '@/hooks/use-billing-documents';
import { canShare, draftOf, formatNext, isShared, ownDraft, type NumberingDraft } from './numbering';

interface NumberingRowViewProps {
  row: NumberingRow;
  draft: NumberingDraft;
  /** Label of the member series a shared row numbers on. */
  sharesLabel: string | null;
  canWrite: boolean;
  error: string | null;
  change: (draft: NumberingDraft) => void;
}

function SharedCells({ row, sharesLabel }: Pick<NumberingRowViewProps, 'row' | 'sharesLabel'>): ReactNode {
  return (
    <>
      <TableCell colSpan={2} className="text-sm text-muted-foreground">
        Shares the {sharesLabel ?? 'member'} series ({row.prefix})
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.last_issued}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatNext(draftOf(row))}</TableCell>
    </>
  );
}

function OwnCells({ row, draft, canWrite, change }: Omit<NumberingRowViewProps, 'sharesLabel' | 'error'>): ReactNode {
  const preview = formatNext(draft);
  return (
    <>
      <TableCell>
        <Input aria-label={`Prefix, ${row.label}`} maxLength={12} value={draft.prefix} disabled={!canWrite} onChange={(e) => change({ ...draft, prefix: e.target.value })} />
      </TableCell>
      <TableCell className="w-20">
        <Input aria-label={`Digits, ${row.label}`} inputMode="numeric" maxLength={1} value={draft.pad} disabled={!canWrite} onChange={(e) => change({ ...draft, pad: e.target.value.replace(/\D/g, '') })} />
      </TableCell>
      <TableCell className="text-right tabular-nums">{isShared(row) ? '—' : row.last_issued}</TableCell>
      <TableCell className="w-44">
        <Input
          aria-label={`Next number, ${row.label}`}
          inputMode="numeric"
          placeholder={isShared(row) ? 'Continue' : undefined}
          value={draft.next}
          disabled={!canWrite}
          onChange={(e) => change({ ...draft, next: e.target.value.replace(/\D/g, '').slice(0, 8) })}
        />
        {preview && <p className="mt-1 text-xs text-muted-foreground">Next: {preview}</p>}
      </TableCell>
    </>
  );
}

function Action({ row, draft, canWrite, change }: Omit<NumberingRowViewProps, 'sharesLabel' | 'error'>): ReactNode {
  if (!canWrite || !canShare(row)) return null;
  if (!draft.own) {
    return <Button type="button" variant="outline" size="sm" onClick={() => change(ownDraft(row))}>Use its own series</Button>;
  }
  const label = isShared(row) ? 'Keep sharing' : 'Share the member series';
  return <Button type="button" variant="ghost" size="sm" onClick={() => change({ ...draftOf(row), own: false })}>{label}</Button>;
}

/** One series of the Numbering card: label, prefix, digits, last issued, next number. */
export function NumberingRowView(props: NumberingRowViewProps): ReactNode {
  const { row, draft, error } = props;
  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{row.label}</TableCell>
        {draft.own ? <OwnCells {...props} /> : <SharedCells row={row} sharesLabel={props.sharesLabel} />}
        <TableCell className="text-right">
          <Action {...props} />
        </TableCell>
      </TableRow>
      {error && (
        <TableRow>
          <TableCell colSpan={6} className="py-1 text-xs text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
