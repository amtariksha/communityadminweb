'use client';

import type { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AnnouncementRightsRow } from '@/hooks';
import { ROLE_LABELS } from '@/lib/role-catalogue';

export interface RightsGridProps {
  rows: readonly AnnouncementRightsRow[];
  /** user_id → Set Expiry, as edited. */
  expiry: Readonly<Record<string, boolean>>;
  /** user_id → level on the approver grid as saved there (fresher than `rows`). */
  levels?: Readonly<Record<string, number>>;
  canEdit: boolean;
  onExpiry: (userId: string, on: boolean) => void;
}

/**
 * ANN-S1 block 1 — Name · Approval · Set Expiry. Approval is the person's
 * place on the announcement approver grid (shown, set in the grid above);
 * Set Expiry is ticked here.
 */
export function RightsGrid({ rows, expiry, levels, canEdit, onExpiry }: RightsGridProps): ReactNode {
  return (
    <Table aria-label="Approval and expiry rights">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="text-center">Approval</TableHead>
          <TableHead className="text-center">Set Expiry</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const level = levels?.[row.user_id] ?? row.approval_level;
          return (
          <TableRow key={row.user_id}>
            <TableCell>
              <div className="font-medium">{row.name ?? 'Unnamed user'}</div>
              <div className="text-xs text-muted-foreground">{row.roles.map((slug) => ROLE_LABELS[slug] ?? slug).join(', ')}</div>
            </TableCell>
            <TableCell className="text-center">
              <input
                type="checkbox"
                aria-label={`${row.name ?? 'User'}: Approval`}
                checked={level > 0}
                disabled
                readOnly
              />
              {level > 0 && <span className="ml-1 text-xs text-muted-foreground">Level {level}</span>}
            </TableCell>
            <TableCell className="text-center">
              <input
                type="checkbox"
                aria-label={`${row.name ?? 'User'}: Set Expiry`}
                checked={expiry[row.user_id] ?? row.can_set_expiry}
                disabled={!canEdit}
                onChange={(event) => onExpiry(row.user_id, event.target.checked)}
              />
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
