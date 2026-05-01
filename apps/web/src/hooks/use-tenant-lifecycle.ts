'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateOnboardingInput {
  unit_id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email?: string | null;
  lease_start_date: string; // yyyy-mm-dd
  lease_end_date: string; // yyyy-mm-dd
  monthly_rent?: number | null;
  security_deposit?: number | null;
  agreement_document_url?: string | null;
  agreement_document_key?: string | null;
  parking_slots?: unknown[];
  ev_charging?: boolean;
  water_meter_id?: string | null;
  electricity_meter_id?: string | null;
}

export interface CreateOnboardingResult {
  id: string;
  tenant_id: string;
  unit_id: string;
  tenant_name: string;
  tenant_phone: string;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number | null;
  security_deposit: number | null;
  status: string;
  approval_request_id: string | null;
}

export interface RenewAgreementInput {
  unit_id: string;
  new_lease_start_date: string; // yyyy-mm-dd
  new_lease_end_date: string; // yyyy-mm-dd
  new_agreement_document_url?: string | null;
  new_agreement_document_key?: string | null;
  new_monthly_rent?: number | null;
  new_security_deposit?: number | null;
}

export interface RenewAgreementResult {
  id: string;
  tenant_id: string;
  unit_id: string;
  tenant_name: string;
  lease_start_date: string;
  lease_end_date: string;
  status: string;
  approval_request_id: string | null;
  agreement_document_url: string | null;
}

// ---------------------------------------------------------------------------
// Duplicate-onboard error detection — QA #13-2c (Round 12 #12-1d carry-over)
// ---------------------------------------------------------------------------
//
// Backend `tenant-lifecycle.service.ts#createOnboarding` throws three
// BadRequestException strings the admin form should treat as
// "the unit's already past the onboarding step, your view is stale":
//
//   1. "Unit already has an active tenant. Remove the current tenant first."
//        — `members` row already created (approval landed).
//   2. "A tenant onboarding request is already pending for this unit"
//        — second submit while approval is still queued.
//   3. "You must be an active owner of this unit to onboard a tenant"
//        — caller isn't the unit's owner; ALSO surfaces when an admin
//          re-submits after a successful approval (the caller hasn't
//          changed, the precondition has — the tenant slot is now
//          taken so the service falls through this earlier guard).
//
// Match on the message via `ApiError.userMessage` (which is what the
// admin's toast renders today). Looser substring match keeps the
// detector resilient to minor backend wording tweaks.
const DUPLICATE_ONBOARD_PATTERNS = [
  /already has an active tenant/i,
  /already pending for this unit/i,
  /must be an active owner/i,
];

export function isDuplicateOnboardError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  // 400 only — a 4xx outside that range (e.g. 403, 401) is a real
  // permission / auth issue and should keep its native toast copy.
  if (err.status !== 400) return false;
  const msg = err.userMessage ?? '';
  return DUPLICATE_ONBOARD_PATTERNS.some((re) => re.test(msg));
}

// ---------------------------------------------------------------------------
// POST /tenant-lifecycle/onboard — QA #219, #222
// ---------------------------------------------------------------------------

/**
 * Onboard a new tenant onto a unit with a fresh lease. The endpoint
 * accepts the full lease packet (start/end dates, rent, deposit) and
 * creates a `tenant_onboarding` record + approval request. After the
 * approval is granted, the service writes the `members` row and
 * activates the lease.
 */
export function useCreateOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOnboardingInput): Promise<CreateOnboardingResult> => {
      const res = await api.post<{ data: CreateOnboardingResult }>(
        '/tenant-lifecycle/onboard',
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      // Refresh approvals (new pending request shows up immediately)
      // and unit-members (admin sees status change once approved).
      // The `['unit-members']` prefix covers `unitMemberKeys.detail()`
      // via React Query's prefix matching, so the units page detail
      // panel re-fetches automatically after a successful submit —
      // important for the QA #13-2c carry-over where a stale view
      // would otherwise re-show the Onboard Tenant button after the
      // approval landed.
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['unit-members'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

// ---------------------------------------------------------------------------
// POST /tenant-lifecycle/renew
// ---------------------------------------------------------------------------

export function useRenewAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RenewAgreementInput): Promise<RenewAgreementResult> => {
      const res = await api.post<{ data: RenewAgreementResult }>(
        '/tenant-lifecycle/renew',
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      // Invalidate anything that might show the current lease state —
      // the actual update happens when the approval request is resolved,
      // but the approvals list needs to re-fetch so the new pending
      // request shows up immediately.
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['unit-members'] });
    },
  });
}
