'use client';

import { useState, type ReactNode } from 'react';
import { ApproverGridEditor } from '@/components/approver-grid';
import { Select } from '@/components/ui/select';
import type { ApproverGridPerson } from '@/hooks/use-approver-grid';
import { canChangeSettings } from '../../../settings/settings-access';
import { FormsPage } from '../../_parts/forms-page';
import { MemberNotifications } from './member-notifications';

/** FORM-S1's people select: a display filter of the grid only. */
export type ApproverPool = 'all' | 'committee' | 'office';

export function inPool(pool: ApproverPool, person: Pick<ApproverGridPerson, 'roles'>): boolean {
  const committee = person.roles.includes('committee_member');
  if (pool === 'committee') return committee;
  if (pool === 'office') return !committee;
  return true;
}

/**
 * Community Forms › Setup › Approvers Setup (FORM-S1): the form-response
 * approver grid (SB-11) with three levels, No Access by default; any one
 * person on a level approves at it. Changes apply to responses submitted
 * afterwards. Only the community admin changes it.
 */
export function FormApproversContent(): ReactNode {
  const canEdit = canChangeSettings();
  const [pool, setPool] = useState<ApproverPool>('all');
  return (
    <FormsPage title="Approvers Setup" logs={['community_form_approvers', 'tenant_settings']}>
      <p className="text-sm text-muted-foreground">People given a level here approve form responses at that level.</p>
      <Select aria-label="People" className="w-80" value={pool} onChange={(event) => setPool(event.target.value as ApproverPool)}>
        <option value="all">Management Committee &amp; Office Staff</option>
        <option value="committee">Management Committee</option>
        <option value="office">Office Staff</option>
      </Select>
      <ApproverGridEditor
        type="community_form_response"
        peopleHeader="Approvers"
        canEdit={canEdit}
        showMinimums={false}
        showPerson={(person) => inPool(pool, person)}
        emptyText="No one to list."
      />
      <MemberNotifications canEdit={canEdit} />
    </FormsPage>
  );
}
