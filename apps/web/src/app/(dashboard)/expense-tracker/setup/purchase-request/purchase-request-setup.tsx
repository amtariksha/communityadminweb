'use client';

import { type ReactNode } from 'react';
import { ApproverGridEditor } from '@/components/approver-grid';
import { PageHeader } from '@/components/layout/page-header';
import { useApproverGrid } from '@/hooks/use-approver-grid';
import { useAdminLayout } from '@/lib/layout-context';
import { canChangeSettings } from '../../../settings/settings-access';
import { ThresholdField } from './threshold-field';

/**
 * Expense Tracker › Setup › Purchase Request (EXP-S2): who approves purchase
 * requests, by name and level (SB-11), and the auto-approve limit. Only the
 * community admin changes them.
 */
export function PurchaseRequestSetup(): ReactNode {
  const layout = useAdminLayout();
  const canEdit = canChangeSettings();
  const grid = useApproverGrid('purchase_request');

  return (
    <div className="space-y-6">
      {layout === 'standard' && <PageHeader title="Purchase request approvers" />}
      <h2 className="text-base font-semibold">Assign approver levels for purchase requests</h2>
      {grid.data && !grid.data.configured && (
        <p className="text-sm text-muted-foreground">
          Nobody is at a level yet, so requests follow the approval levels and roles saved before approvers could be named (shown
          in Settings › Purchase Request Approvals) until someone is placed at a level here.
        </p>
      )}
      <ApproverGridEditor type="purchase_request" peopleHeader="Purchase Request Approvers" canEdit={canEdit} />
      <ThresholdField canEdit={canEdit} />
    </div>
  );
}
