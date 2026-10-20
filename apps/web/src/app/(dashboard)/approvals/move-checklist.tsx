'use client';

import { type ReactNode } from 'react';
import { RequestChecklistPanel, canTickChecklists } from '@/components/move-checklist';
import type { ApprovalRequest } from '@/hooks';

// Move-ins name their tenant_onboarding row; an exit its tenant_exit_requests row.
const MOVE_IN_TYPES = new Set(['tenant_onboarding', 'tenant_self_onboard']);

/** MOVE-13 — the tick list of a move-in or move-out on the standard approvals detail. */
export function MoveChecklist({ request }: { request: Pick<ApprovalRequest, 'request_type' | 'entity_id'> }): ReactNode {
  const kind = MOVE_IN_TYPES.has(request.request_type) ? 'onboarding' : request.request_type === 'tenant_exit' ? 'exit' : null;
  if (!kind) return null;
  return <RequestChecklistPanel kind={kind} requestId={request.entity_id} canTick={canTickChecklists()} />;
}
