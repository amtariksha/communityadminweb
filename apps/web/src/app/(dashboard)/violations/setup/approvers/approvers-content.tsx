'use client';

import type { ReactNode } from 'react';
import { ApproverGridEditor } from '@/components/approver-grid';
import { canChangeSettings } from '../../../settings/settings-access';
import { ViolationsPage } from '../../_parts/violations-page';
import { ResidentNotifications } from './resident-notifications';

/**
 * Rules & Violations Set Up › Approvers Set Up (RULE-S1): the violation
 * approver grid (SB-11) with two levels; any one person on a level
 * approves. Steps are copied when a violation is raised, so changes apply
 * to violations raised afterwards. Only the community admin changes it.
 */
export function ApproversContent(): ReactNode {
  const canEdit = canChangeSettings();
  return (
    <ViolationsPage title="Approvers Set Up" logs={['violation_approvers', 'tenant_settings']}>
      <p className="text-sm text-muted-foreground">
        Level 1 approves first. If anyone is set at Level 2, a violation also needs a Level 2 approval.
      </p>
      <ApproverGridEditor
        type="violation"
        peopleHeader="Name"
        canEdit={canEdit}
        levels={[1, 2]}
        showMinimums={false}
        clearable
        levelLabel={(level) => `Level${level}`}
        emptyText="Give someone an admin role in Settings first."
      />
      <ResidentNotifications canEdit={canEdit} />
    </ViolationsPage>
  );
}
