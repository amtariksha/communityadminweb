'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types — mirror the backend RoleDelegationService shape
// ---------------------------------------------------------------------------

export type ExpiryEnforcement =
  | 'disabled'
  | 'log_only'
  | 'filter_only'
  | 'hybrid';

export interface SecuritySupervisorPermissions {
  guard_staff_crud: boolean;
  non_guard_staff_crud: boolean;
  manage_shifts: boolean;
  clock_in_override: boolean;
  view_attendance: boolean;
  leave_approve_own_team: boolean;
  leave_approve_all_staff: boolean;
  approvals_face_enrollment: boolean;
  approvals_visitor_override: boolean;
  approvals_clock_in_override: boolean;
  approvals_new_guard_onboarding: boolean;
  member_directory_with_contact: boolean;
  unit_directory_names_only: boolean;
  visitor_pass_override: boolean;
  parcel_management: boolean;
  anpr_logs: boolean;
  unrecognized_vehicles: boolean;
  camera_list_view: boolean;
  security_tickets_crud: boolean;
}

export interface FacilitySupervisorPermissions {
  non_guard_staff_crud: boolean;
  guard_staff_crud: boolean;
  manage_shifts_all: boolean;
  view_attendance: boolean;
  leave_approve_non_guard: boolean;
  leave_approve_all_staff: boolean;
  maintenance_tickets_crud: boolean;
  amenity_bookings_manage: boolean;
  utility_readings_record: boolean;
  assets_amc_view_and_service_log: boolean;
  gate_non_guard_checkin_logs: boolean;
  member_directory_with_contact: boolean;
}

export interface RoleDelegation {
  security_supervisor: SecuritySupervisorPermissions;
  facility_supervisor: FacilitySupervisorPermissions;
  expiry_enforcement: ExpiryEnforcement;
}

export interface RoleDelegationUpdate {
  security_supervisor?: Partial<SecuritySupervisorPermissions>;
  facility_supervisor?: Partial<FacilitySupervisorPermissions>;
  expiry_enforcement?: ExpiryEnforcement;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const roleDelegationKeys = {
  all: ['rbac', 'role-delegation'] as const,
};

// ---------------------------------------------------------------------------
// Read — GET /rbac/role-delegation
// ---------------------------------------------------------------------------

export function useRoleDelegation() {
  return useQuery({
    queryKey: roleDelegationKeys.all,
    queryFn: async (): Promise<RoleDelegation> => {
      const res = await api.get<{ data: RoleDelegation }>(
        '/rbac/role-delegation',
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // match the backend 5-min cache TTL
  });
}

// ---------------------------------------------------------------------------
// Write — PATCH /rbac/role-delegation
// ---------------------------------------------------------------------------

export function useUpdateRoleDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RoleDelegationUpdate): Promise<RoleDelegation> => {
      const res = await api.patch<{ data: RoleDelegation }>(
        '/rbac/role-delegation',
        input,
      );
      return res.data;
    },
    onSuccess: (data) => {
      // Update the cache synchronously so the UI doesn't flash back to
      // the old value while React Query re-fetches. The backend cache
      // is also invalidated server-side.
      queryClient.setQueryData(roleDelegationKeys.all, data);
    },
  });
}
