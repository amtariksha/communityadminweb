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
  /** The member series a shared row numbers on (or will, once saved). */
  memberRow: NumberingRow | null;
  canWrite: boolean;
  error: string | null;
  change: (draft: NumberingDraft) => void;
}

function SharedCells({ row, memberRow }: Pick<NumberingRowViewProps, 'row' | 'memberRow'>): ReactNode {
  // The member series' numbers, which this series takes (now, or once saved).
  const source = memberRow ?? row;
  return (
    <>
      <TableCell colSpan={2} className="text-sm text-muted-foreground">
        Shares the {memberRow?.label ?? 'member'} series ({source.prefix})
      </TableCell>
      <TableCell className="text-right tabular-nums">{source.last_issued}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatNext(draftOf(source))}</TableCell>
    </>
  );
}

function OwnCells({ row, draft, canWrite, change }: Omit<NumberingRowViewProps, 'memberRow' | 'error'>): ReactNode {
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

function Action({ row, draft, canWrite, change }: Omit<NumberingRowViewProps, 'memberRow' | 'error'>): ReactNode {
  if (!canWrite || !canShare(row)) return null;
  if (!draft.own) {
    // A series already on its own goes back to its saved prefix and counter.
    const own = isShared(row) ? ownDraft(row) : draftOf(row);
    return <Button type="button" variant="outline" size="sm" onClick={() => change(own)}>Use its own series</Button>;
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
        {draft.own ? <OwnCells {...props} /> : <SharedCells row={row} memberRow={props.memberRow} />}
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
