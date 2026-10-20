'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AlertCandidate } from '@/hooks/use-inventory-setup';
import { ROLE_LABELS } from '@/lib/role-catalogue';

interface AlertRecipientsFormProps {
  candidates: readonly AlertCandidate[];
  readOnly: boolean;
  isSaving: boolean;
  save: (userIds: string[]) => Promise<unknown>;
}

const roleWords = (roles: readonly string[]): string => roles.map((role) => ROLE_LABELS[role] ?? role.replace(/_/g, ' ')).join(', ');

/**
 * Low-stock alert recipients (ASSET-S2 form 2): one tick per admin of the
 * society, and its own Save Changes. Ticked people are told in the app and
 * by push when an item falls below its re-order level (ASSET-17).
 */
export function AlertRecipientsForm({ candidates, readOnly, isSaving, save }: AlertRecipientsFormProps): ReactNode {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(candidates.filter((c) => c.ticked).map((c) => c.user_id)));
  const toggle = (userId: string): void =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <div className="space-y-3">
      {ticked.size === 0 && <p className="text-sm text-muted-foreground">Nobody will be told when stock runs low.</p>}
      <Table aria-label="Low-stock alert recipients">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Tell</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.user_id}>
              <TableCell>
                <input
                  type="checkbox"
                  aria-label={`Tell ${candidate.name ?? 'this admin'}`}
                  checked={ticked.has(candidate.user_id)}
                  disabled={readOnly}
                  onChange={() => toggle(candidate.user_id)}
                />
              </TableCell>
              <TableCell>{candidate.name ?? '—'}</TableCell>
              <TableCell>{roleWords(candidate.roles)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!readOnly && (
        <Button type="button" disabled={isSaving} onClick={() => void save([...ticked]).catch(() => undefined)}>
          {isSaving ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    </div>
  );
}
