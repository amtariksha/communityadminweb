'use client';

import { useState, type ReactNode } from 'react';
import { ImportFlow } from '@/components/import/import-flow';
import { ImportLog } from '@/components/import/import-log';

const MEMBERS_TARGET = { endpoint: '/units/imports', type: 'members' } as const;

const PREVIEW_COLUMNS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'block', label: 'Block' },
  { key: 'unit_number', label: 'Unit No' },
  { key: 'phone', label: 'Phone/Mobile' },
  { key: 'member_type', label: 'Resident Type' },
] as const;

interface MassUploadProps {
  allowed: boolean;
  /** The society has resident invites (UNIT-20); the choice is offered only then. */
  invitesOffered: boolean;
  invitesEnabled: boolean;
}

/**
 * Units & Users › Add Users › Mass Upload (UNIT-29, screen UNIT-S3): the
 * Add Users grid as a spreadsheet. Rows with errors are listed and left
 * out; the others are added as Create User Accounts adds them. Invites go
 * only when asked for here and switched on for the society. "Upload
 * Membership Status" waits for decision UNIT-D23 and is not shown.
 */
export function MassUpload({ allowed, invitesOffered, invitesEnabled }: MassUploadProps): ReactNode {
  const [sendInvites, setSendInvites] = useState(false);
  return (
    <section aria-label="Mass Upload" className="space-y-3">
      <h2 className="text-base font-semibold">Mass Upload</h2>
      <ImportFlow
        target={MEMBERS_TARGET}
        title="Upload members data"
        description="One row per resident of a unit that already exists: First Name, Block, Unit No, Phone/Mobile and Resident Type (Owner, Owner Family, Tenant, Tenant Family). A resident already on the unit is left as they are."
        columns={PREVIEW_COLUMNS}
        options={invitesOffered ? { send_invites: sendInvites } : undefined}
        applyLabel="Create accounts for"
        allowed={allowed}
      >
        {invitesOffered && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sendInvites} onChange={(event) => setSendInvites(event.target.checked)} />
            Also send invites to the members added
            {sendInvites && !invitesEnabled && <span className="text-xs text-muted-foreground">(invite e-mails are off: switch them on in Customize Invite Email)</span>}
          </label>
        )}
      </ImportFlow>
      <ImportLog endpoint={MEMBERS_TARGET.endpoint} type={MEMBERS_TARGET.type} labels={{ members: 'Members' }} />
    </section>
  );
}
