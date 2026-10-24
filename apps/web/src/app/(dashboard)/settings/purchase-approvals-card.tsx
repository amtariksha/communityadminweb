'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproverGrid } from '@/hooks/use-approver-grid';
import { ROLE_LABELS } from '@/lib/role-catalogue';

/** What the society saved before approvers could be named, with the API's defaults (1 level, community admin). */
export function earlierApprovalRule(settings: Record<string, unknown> | undefined): { levels: number; roles: string[] } {
  const levels = typeof settings?.pr_approval_levels === 'number' ? settings.pr_approval_levels : 1;
  const roles = Array.isArray(settings?.pr_approval_roles) ? (settings.pr_approval_roles as string[]) : ['community_admin'];
  return { levels, roles };
}

/** The API's own defaults for a level with no role saved (purchase-request-approvals.ts). */
const DEFAULT_LEVEL_ROLES = ['community_admin', 'accountant', 'committee_member'];

function describeRule({ levels, roles }: { levels: number; roles: string[] }): string {
  if (levels <= 0) return 'approved as soon as they are sent';
  const names = Array.from({ length: levels }, (_, index) => {
    const role = roles[index] ?? DEFAULT_LEVEL_ROLES[index] ?? 'community_admin';
    return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
  });
  return `approved in ${levels} level${levels === 1 ? '' : 's'}: ${names.join(', then ')}`;
}

/**
 * Settings › Purchase Request Approvals. Approvers are named by person and
 * level, with the auto-approve limit, in Expense Tracker › Setup › Purchase
 * Request (EXP-07, SB-11). The old levels and roles inputs here are gone:
 * they were kept only until that screen's API was live. While nobody is
 * named there, requests still follow the levels and roles saved earlier,
 * shown read-only.
 */
export function PurchaseApprovalsCard({ settings }: { settings: Record<string, unknown> | undefined }): ReactNode {
  const grid = useApproverGrid('purchase_request');
  const named = grid.data?.configured === true;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Request Approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Name approvers by person and level, with the minimum approvals per level and the auto-approve limit, in{' '}
          <Link className="underline" href="/expense-tracker/setup/purchase-request">
            Expense Tracker › Setup › Purchase Request
          </Link>
          .
        </p>
        <p className="text-muted-foreground">
          {named
            ? 'Approvers are named there, so they approve every request.'
            : `Nobody is named there yet, so requests are ${describeRule(earlierApprovalRule(settings))} (as saved earlier).`}
        </p>
      </CardContent>
    </Card>
  );
}
