'use client';

import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EscalationRow } from '@/hooks';

const BLANK = '—';

const hours = (value: number | null): string => (value == null ? BLANK : `${value} hrs`);
const person = (name: string | null): string => name ?? BLANK;

/** The columns of the screen and of the export, in the same order. */
export const EXPORT_COLUMNS = [
  { key: 'serial', label: 'Sl.No' },
  { key: 'category', label: 'Category' },
  { key: 'owner_l1', label: 'Owner L1' },
  { key: 'window_l1_l2', label: 'Escalation Window L1 to L2' },
  { key: 'owner_l2', label: 'Owner L2' },
  { key: 'window_l2_l3', label: 'Escalation Window L2 to L3' },
  { key: 'owner_l3', label: 'Owner L3' },
] as const;

/** Every row of the matrix as the export columns show it. */
export function toExportRows(rows: readonly EscalationRow[]): Record<string, unknown>[] {
  return rows.map((row, index) => ({
    serial: index + 1,
    category: row.category_name,
    owner_l1: person(row.owner_l1_name),
    window_l1_l2: hours(row.escalation_l1_l2_hours),
    owner_l2: person(row.owner_l2_name),
    window_l2_l3: hours(row.escalation_l2_l3_hours),
    owner_l3: person(row.owner_l3_name),
  }));
}

interface EscalationMatrixProps {
  rows: readonly EscalationRow[];
  onView: (row: EscalationRow) => void;
}

export function EscalationMatrix({ rows, onView }: EscalationMatrixProps): ReactNode {
  const shown = toExportRows(rows);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {EXPORT_COLUMNS.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Edit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.category_id}>
            {EXPORT_COLUMNS.map((column) => (
              <TableCell key={column.key}>{String(shown[index][column.key])}</TableCell>
            ))}
            <TableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`View ${row.category_name}`}
                onClick={() => onView(row)}
              >
                <Eye className="mr-1 h-4 w-4" /> View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
