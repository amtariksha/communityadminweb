'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useBulkImportMembers } from '@/hooks/use-units';
import { useResidentSettings } from '@/hooks/use-resident-settings';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { useUnitChoices } from '../../helpdesk/new/use-unit-choices';
import { blockUnitLabel } from '../approved/unit-labels';
import { AddUsersGrid, type UnitOption } from './add-users-grid';
import { MassUpload } from './mass-upload';
import {
  applyImportResult,
  applyRequestErrors,
  blankRows,
  isBlankRow,
  prepareImport,
  ROWS_PER_BATCH,
  type AddUserRow,
} from './add-users-rows';

// The roles POST /units/import-members admits.
const CREATE_ROLES = new Set(['super_admin', 'community_admin', 'accountant']);

function useRows() {
  const [rows, setRows] = useState<AddUserRow[]>(() => blankRows());
  const update = (key: string, patch: Partial<AddUserRow>) =>
    // Editing a row clears its last result.
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch, result: undefined } : row)));
  const addBatch = () => setRows((current) => [...current, ...blankRows(ROWS_PER_BATCH)]);
  const clearAll = () => setRows((current) => blankRows(Math.max(ROWS_PER_BATCH, current.length)));
  return { rows, setRows, update, addBatch, clearAll };
}

function useUnitOptions(): UnitOption[] {
  const units = useUnitChoices();
  return useMemo(
    () => (units.data ?? []).map((unit) => ({ id: unit.id, label: blockUnitLabel({ block: unit.block ?? null, unit_number: unit.unit_number }) })),
    [units.data],
  );
}

/**
 * Units & Users › Add Users (UNIT-14, screen UNIT-S3): residents typed into
 * numbered rows; Create User Accounts sends every filled row in one
 * request and writes each row's outcome into its Result cell. Below it the
 * Mass Upload of the same columns from a spreadsheet (UNIT-29).
 */
export function AddUsersContent(): ReactNode {
  const { addToast } = useToast();
  const grid = useRows();
  const units = useUnitOptions();
  const importMembers = useBulkImportMembers();
  const canCreate = CREATE_ROLES.has(currentRole() ?? '');
  const filled = grid.rows.some((row) => !isBlankRow(row));
  // UNIT-20 — the invite choice, offered once the API has resident invites.
  const residentSettings = useResidentSettings();
  const invitesOffered = Boolean(residentSettings.data);
  const [sendInvites, setSendInvites] = useState(false);

  async function createAccounts(): Promise<void> {
    const prepared = prepareImport(grid.rows);
    grid.setRows(prepared.rows);
    if (prepared.members.length === 0) return;
    try {
      const response = await importMembers.mutateAsync({ members: prepared.members, ...(invitesOffered ? { send_invites: sendInvites } : {}) });
      grid.setRows((current) => applyImportResult(current, prepared.sentKeys, response.data));
      const invites = response.data.invites;
      const invited = invites ? ` · invites: ${invites.sent} sent, ${invites.skipped} not sent` : '';
      addToast({ title: `${response.data.imported} added, ${response.data.skipped} not added${invited}`, variant: response.data.skipped ? 'default' : 'success' });
    } catch (error) {
      const marked = applyRequestErrors(prepared.rows, prepared.sentKeys, error);
      if (marked) grid.setRows(marked);
      else addToast({ title: 'Could not create the user accounts', description: friendlyError(error), variant: 'destructive' });
    }
  }

  function deleteAll(): void {
    if (window.confirm('Clear every row of this form? Nothing has been saved from them.')) grid.clearAll();
  }

  return (
    <div className="space-y-4">
      {!canCreate && (
        <p className="text-sm text-muted-foreground">Only the community admin and the accountant can create user accounts.</p>
      )}
      <AddUsersGrid rows={grid.rows} units={units} disabled={!canCreate || importMembers.isPending} onChange={grid.update} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="link" className="px-0" onClick={grid.addBatch}>
          Add {ROWS_PER_BATCH} more rows
        </Button>
      </div>
      {invitesOffered && (
        <fieldset className="flex flex-wrap items-center gap-4 text-sm">
          <legend className="sr-only">Invites</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="send-invites" checked={sendInvites} onChange={() => setSendInvites(true)} />
            Also Send Invites
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="send-invites" checked={!sendInvites} onChange={() => setSendInvites(false)} />
            Do not Send Invites
          </label>
          <Link href="/units/add-users/invite-message" className="text-primary hover:underline">
            Customize Invite Email
          </Link>
          {sendInvites && !residentSettings.data?.invite_email_enabled && (
            <span className="text-xs text-muted-foreground">Invite e-mails are off: switch them on in Customize Invite Email.</span>
          )}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={!canCreate || !filled || importMembers.isPending} onClick={() => void createAccounts()}>
          {importMembers.isPending ? 'Creating…' : 'Create User Accounts'}
        </Button>
        <Button type="button" variant="outline" disabled={!filled} onClick={deleteAll}>
          Delete all of the above records
        </Button>
        <Link href="/units/blocks" className="text-sm text-primary hover:underline">
          Add More Blocks / Edit Blocks
        </Link>
      </div>
      <MassUpload allowed={canCreate} invitesOffered={invitesOffered} invitesEnabled={Boolean(residentSettings.data?.invite_email_enabled)} />
      <p className="text-sm text-muted-foreground">
        New units with their owners and tenants: <Link href="/units/import" className="text-primary hover:underline">import units</Link>.
      </p>
    </div>
  );
}
