import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';

// Changes to self-signup requests are logged under the move-in row.
const RECORD_TYPES = ['tenant_onboarding'] as const;

/**
 * "Users Log" under the tables (UNIT-S1): edits, declines and approvals of
 * these requests. Requests are never deleted (a requester can only withdraw
 * one), so there is no Deleted Records log.
 */
export function UsersLogStrip(): ReactNode {
  return (
    <section aria-label="Users Log" className="space-y-2">
      <h3 className="text-sm font-semibold">Users Log</h3>
      <div className="flex flex-wrap gap-2">
        <ShowLogsButton recordTypes={RECORD_TYPES} action="update" label="Edited Records" />
        <ShowLogsButton recordTypes={RECORD_TYPES} action="reject" label="Declined Records" />
        <ShowLogsButton recordTypes={RECORD_TYPES} action="approve" label="Approval Records" />
      </div>
    </section>
  );
}
