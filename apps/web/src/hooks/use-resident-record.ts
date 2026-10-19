'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { unitMemberKeys } from './use-unit-members';

/** MOVE-11 — the resident record behind a register's Edit / View. */

export interface ResidentRecordMember {
  id: string;
  unit_id: string;
  user_id: string | null;
  member_type: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  is_current: boolean;
  is_primary_contact: boolean;
  lives_here: boolean;
  is_association_member: boolean;
  alternate_address: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  lease_end_date: string | null;
  birthdate: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  last_login_at: string | null;
  app_status: 'active' | 'never' | 'no_account';
}

export interface ResidentRecordLease {
  id: string;
  status: string;
  lease_start_date: string;
  lease_end_date: string;
  agreement_document_url: string | null;
  police_verification_status: 'not_started' | 'submitted' | 'verified' | 'rejected' | null;
  police_verification_ref: string | null;
}

export interface ResidentRecord {
  member: ResidentRecordMember;
  unit: { id: string; unit_number: string; block: string | null; intercom: string | null };
  lease: ResidentRecordLease | null;
  kyc: { id: string; status: string; id_type: string; submitted_at: string } | null;
}

export const residentRecordKeys = {
  record: (memberId: string) => ['resident-record', memberId] as const,
};

/** `null` while the API has no record route (an older server answers 404). */
export function useResidentRecord(memberId: string) {
  return useQuery({
    queryKey: residentRecordKeys.record(memberId),
    enabled: memberId !== '',
    meta: { suppressToast: true },
    retry: false,
    queryFn: async function fetchRecord({ signal }): Promise<ResidentRecord | null> {
      try {
        const res = await api.get<{ data: ResidentRecord }>(`/units/members/${memberId}/record`, { signal });
        return res.data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404 && error.code !== 'member_not_found') return null;
        throw error;
      }
    },
  });
}

export interface LeaseAgreementInput {
  leaseId: string;
  memberId: string;
  lease_start_date?: string;
  lease_end_date?: string;
  agreement_document_url?: string | null;
  agreement_document_key?: string | null;
}

/** The current lease's dates and agreement copy (PATCH …/onboardings/:id/agreement). */
export function useUpdateLeaseAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function updateAgreement({ leaseId, memberId: _memberId, ...body }: LeaseAgreementInput) {
      return api.patch(`/tenant-lifecycle/onboardings/${leaseId}/agreement`, body);
    },
    onSuccess: function refresh(_data, variables) {
      queryClient.invalidateQueries({ queryKey: residentRecordKeys.record(variables.memberId) });
      queryClient.invalidateQueries({ queryKey: unitMemberKeys.directory() });
    },
  });
}
