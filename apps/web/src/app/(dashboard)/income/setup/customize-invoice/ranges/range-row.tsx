'use client';

import { type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import type { RangeKind } from '@/hooks/use-billing-documents';
import { isLocked, type RangeRowState } from './range-rows';
import { ValueCells } from './range-value-cells';

interface RangeRowProps {
  kind: RangeKind;
  row: RangeRowState;
  /** 1-based, for the accessible names. */
  index: number;
  numberLabel: string;
  current: number;
  canWrite: boolean;
  columns: number;
  error: string | undefined;
  change: (patch: Partial<RangeRowState>) => void;
  remove: () => void;
}

const digitsOnly = (text: string): string => text.replace(/\D/g, '').slice(0, 8);

/**
 * One range: From# · To# · value · Delete. A range already in use keeps its
 * start and value (old documents print with it) and shows no Delete.
 */
export function RangeRow({ kind, row, index, numberLabel, current, canWrite, columns, error, change, remove }: RangeRowProps): ReactNode {
  const locked = isLocked(row, current);
  return (
    <>
      <TableRow>
        <TableCell className="w-32">
          <Input
            aria-label={`From ${numberLabel}, row ${index}`}
            inputMode="numeric"
            value={row.from}
            disabled={!canWrite || locked}
            onChange={(e) => change({ from: digitsOnly(e.target.value) })}
          />
        </TableCell>
        <TableCell className="w-32">
          <Input
            aria-label={`To ${numberLabel}, row ${index}`}
            inputMode="numeric"
            placeholder="∞"
            value={row.to}
            disabled={!canWrite}
            onChange={(e) => change({ to: digitsOnly(e.target.value) })}
          />
        </TableCell>
        <ValueCells kind={kind} row={row} index={index} disabled={!canWrite || locked} change={change} />
        {canWrite && (
          <TableCell className="w-20 text-right">
            {locked ? (
              <span className="text-xs text-muted-foreground">In use</span>
            ) : (
              <Button type="button" variant="ghost" size="icon" aria-label={`Delete row ${index}`} onClick={remove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </TableCell>
        )}
      </TableRow>
      {error && (
        <TableRow>
          <TableCell colSpan={columns} className="py-1 text-xs text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
