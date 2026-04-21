'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
