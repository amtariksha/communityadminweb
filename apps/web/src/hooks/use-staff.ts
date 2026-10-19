'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Staff {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  // Must match society_staff.staff_type CHECK (migration 018).
  staff_type:
    | 'security_guard'
    | 'watchman'
    | 'housekeeping'
    | 'gardener'
    | 'plumber'
    | 'electrician'
    | 'manager'
    | 'other';
  designation: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  photo_url: string | null;
  // society_staff.join_date / exit_date (DATE); salary is NUMERIC (a string from pg).
  join_date: string | null;
  exit_date: string | null;
  salary: string | number | null;
  // STAFF-20 (migration 215); absent from an older API.
  badge_no?: string | null;
  badge_issued_on?: string | null;
  badge_valid_until?: string | null;
  gender?: StaffGender | null;
  qualification?: string | null;
  skills?: string | null;
  languages?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StaffGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  // Migration 198 (STAFF-11): retired shifts stay for history. Absent from an
  // older API, where every shift is active.
  is_active?: boolean;
  created_at: string;
  // STAFF-22: the shift's length, worked out by the API (absent from an older one).
  hours?: number;
}

export interface ShiftAssignment {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name?: string;
  gate_id: string;
  gate_name?: string;
  shift_id: string;
  shift_name?: string;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name?: string;
  gate_id: string | null;
  gate_name?: string;
  shift_id: string | null;
  shift_name?: string;
  clock_in: string;
  clock_out: string | null;
  status: 'present' | 'late' | 'half_day' | 'absent';
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface Leave {
  id: string;
  tenant_id: string;
  staff_id: string;
  staff_name?: string;
  leave_type: 'casual' | 'sick' | 'earned' | 'unpaid' | 'emergency' | 'compensatory';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_by_name?: string;
  created_at: string;
}

export interface AttendanceSummary {
  staff_id: string;
  staff_name: string;
  month: number;
  year: number;
  total_days: number;
  present: number;
  late: number;
  half_day: number;
  absent: number;
  leaves: number;
  total_hours: number;
}

export interface Gate {
  id: string;
  tenant_id: string;
  name: string;
  location: string | null;
  // As stored (the API maps the form's `main` to vehicle_and_pedestrian).
  gate_type: 'vehicle_and_pedestrian' | 'vehicle_only' | 'pedestrian_only' | 'service';
  is_active: boolean;
  // GATE-20 (migration 214): In / Out. Absent from an older API, where every
  // gate is both.
  allows_entry?: boolean;
  allows_exit?: boolean;
  staff_count?: number;
  created_at: string;
}

export interface RbacPermission {
  id: string;
  tenant_id: string;
  role: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export type StaffSearchKey = 'any' | 'badge' | 'name' | 'category' | 'phone';

export interface StaffFilters {
  staff_type?: string;
  is_active?: boolean;
  // STAFF-10: the classic status lists and their search.
  status?: 'active' | 'retired';
  q?: string;
  search_by?: StaffSearchKey;
  page?: number;
  limit?: number;
}

export interface AttendanceFilters {
  staff_id?: string;
  gate_id?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface LeaveFilters {
  staff_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateEmployeeInput {
  name: string;
  phone: string;
  staff_type: string;
  designation?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  address?: string;
  emergency_contact?: string;
  join_date?: string;
  salary?: number;
  // STAFF-20: no badge = the next free number; validity 0 / 3 / 6 / 9 months.
  badge_no?: string | null;
  badge_issued_on?: string | null;
  badge_validity_months?: number;
  gender?: StaffGender | null;
  qualification?: string | null;
  skills?: string | null;
  languages?: string | null;
  notes?: string | null;
}

interface UpdateEmployeeInput {
  id: string;
  data: Partial<Omit<CreateEmployeeInput, 'phone'>> & { exit_date?: string | null };
}

interface CreateShiftInput {
  name: string;
  start_time: string;
  end_time: string;
}

interface UpdateShiftInput {
  id: string;
  data: Partial<CreateShiftInput>;
}

// POST /staff/assignments (assignStaffSchema): effective_from is required.
interface AssignStaffInput {
  staff_id: string;
  gate_id?: string;
  shift_id: string;
  effective_from: string;
  effective_until?: string;
}

interface ClockInInput {
  staff_id: string;
  gate_id?: string;
  shift_id?: string;
  notes?: string;
}

interface ApplyLeaveInput {
  staff_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

interface CreateGateInput {
  name: string;
  location?: string;
  gate_type: string;
  allows_entry?: boolean;
  allows_exit?: boolean;
}

interface UpdateGateInput {
  id: string;
  data: Partial<CreateGateInput> & { is_active?: boolean };
}

interface UpdatePermissionInput {
  role: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const staffKeys = {
  all: ['staff'] as const,
  employees: () => [...staffKeys.all, 'employees'] as const,
  employeeList: (filters?: StaffFilters) => [...staffKeys.employees(), 'list', filters] as const,
  employee: (id: string) => [...staffKeys.employees(), id] as const,
  shifts: () => [...staffKeys.all, 'shifts'] as const,
  assignments: (filters?: Record<string, string>) => [...staffKeys.all, 'assignments', filters] as const,
  attendance: () => [...staffKeys.all, 'attendance'] as const,
  attendanceList: (filters?: AttendanceFilters) => [...staffKeys.attendance(), 'list', filters] as const,
  attendanceSummary: (staffId: string, month: number, year: number) =>
    [...staffKeys.attendance(), 'summary', staffId, month, year] as const,
  leaves: () => [...staffKeys.all, 'leaves'] as const,
  leaveList: (filters?: LeaveFilters) => [...staffKeys.leaves(), 'list', filters] as const,
};

export const gateConfigKeys = {
  all: ['gate-config'] as const,
  gates: () => [...gateConfigKeys.all, 'gates'] as const,
  gateList: (includeInactive: boolean) => [...gateConfigKeys.gates(), { includeInactive }] as const,
};

export const rbacKeys = {
  all: ['rbac'] as const,
  permissions: () => [...rbacKeys.all, 'permissions'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function staffFiltersToParams(
  filters?: StaffFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.staff_type) params.staff_type = filters.staff_type;
  if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
  if (filters.status) params.status = filters.status;
  if (filters.q) params.q = filters.q;
  if (filters.q && filters.search_by && filters.search_by !== 'any') params.search_by = filters.search_by;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function attendanceFiltersToParams(
  filters?: AttendanceFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.staff_id) params.staff_id = filters.staff_id;
  if (filters.gate_id) params.gate_id = filters.gate_id;
  if (filters.date) params.date = filters.date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function leaveFiltersToParams(
  filters?: LeaveFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.staff_id) params.staff_id = filters.staff_id;
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries — Staff Employees
// ---------------------------------------------------------------------------

export function useStaffEmployees(filters?: StaffFilters) {
  return useQuery({
    queryKey: staffKeys.employeeList(filters),
    queryFn: function fetchStaffEmployees() {
      return api.get<PaginatedResponse<Staff>>('/staff/employees', {
        params: staffFiltersToParams(filters),
      });
    },
  });
}

export function useStaffEmployee(id: string) {
  return useQuery({
    queryKey: staffKeys.employee(id),
    queryFn: function fetchStaffEmployee() {
      return api.get<{ data: Staff }>(`/staff/employees/${id}`).then(function unwrap(res) {
        return res.data;
      });
    },
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// Queries — Shifts & Assignments
// ---------------------------------------------------------------------------

export function useStaffShifts() {
  return useQuery({
    queryKey: staffKeys.shifts(),
    queryFn: function fetchStaffShifts() {
      return api.get<{ data: Shift[] }>('/staff/shifts').then(function unwrap(res) {
        return res.data;
      });
    },
  });
}

/** One row of PUT /staff/shifts/bulk (STAFF-11, SB-08). */
export interface ShiftGridRow {
  id?: string;
  name: string;
  start_time: string;
  hours: number;
  is_active: boolean;
}

/** Every shift, retired ones too, for Staff Manager › Setup. */
export function useShiftGrid() {
  return useQuery({
    queryKey: [...staffKeys.shifts(), 'grid'] as const,
    queryFn: function fetchShiftGrid() {
      return api
        .get<{ data: Shift[] }>('/staff/shifts', { params: { include_inactive: 'true' } })
        .then((res) => res.data);
    },
  });
}

export function useSaveShiftGrid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function saveShiftGrid(rows: ShiftGridRow[]) {
      return api.put<{ data: Shift[] }>('/staff/shifts/bulk', { rows });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() });
    },
  });
}

export function useStaffAssignments(filters?: Record<string, string>) {
  return useQuery({
    queryKey: staffKeys.assignments(filters),
    queryFn: function fetchStaffAssignments() {
      return api.get<PaginatedResponse<ShiftAssignment>>('/staff/assignments', {
        params: filters,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Queries — Attendance
// ---------------------------------------------------------------------------

export function useStaffAttendance(filters?: AttendanceFilters) {
  return useQuery({
    queryKey: staffKeys.attendanceList(filters),
    queryFn: function fetchStaffAttendance() {
      return api.get<PaginatedResponse<Attendance>>('/staff/attendance', {
        params: attendanceFiltersToParams(filters),
      });
    },
  });
}

export function useAttendanceSummary(staffId: string, month: number, year: number) {
  return useQuery({
    queryKey: staffKeys.attendanceSummary(staffId, month, year),
    queryFn: function fetchAttendanceSummary() {
      return api.get<{ data: AttendanceSummary }>('/staff/attendance/summary', {
        params: {
          staff_id: staffId,
          month: String(month),
          year: String(year),
        },
      }).then(function unwrap(res) {
        return res.data;
      });
    },
    enabled: Boolean(staffId),
  });
}

// ---------------------------------------------------------------------------
// Queries — Leaves
// ---------------------------------------------------------------------------

export function useStaffLeaves(filters?: LeaveFilters) {
  return useQuery({
    queryKey: staffKeys.leaveList(filters),
    queryFn: function fetchStaffLeaves() {
      return api.get<PaginatedResponse<Leave>>('/staff/leaves', {
        params: leaveFiltersToParams(filters),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Queries — Gates Config
// ---------------------------------------------------------------------------

/**
 * The society's gates. Active ones only (as the guard app sees them) unless
 * `includeInactive`, which the API honours for the society's admins.
 */
export function useGates(options: { includeInactive?: boolean } = {}) {
  const includeInactive = options.includeInactive === true;
  return useQuery({
    queryKey: gateConfigKeys.gateList(includeInactive),
    queryFn: function fetchGates() {
      return api
        .get<{ data: Gate[] }>('/gate/gates', {
          params: includeInactive ? { include_inactive: 'true' } : undefined,
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Queries — RBAC
// ---------------------------------------------------------------------------

export function useRbacPermissions() {
  return useQuery({
    queryKey: rbacKeys.permissions(),
    queryFn: function fetchRbacPermissions() {
      return api.get<{ data: RbacPermission[] }>('/rbac/permissions').then(function unwrap(res) {
        return res.data;
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Employees
// ---------------------------------------------------------------------------

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createEmployee(input: CreateEmployeeInput) {
      return api.post<{ data: Staff }>('/staff/employees', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.employees() });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateEmployee(input: UpdateEmployeeInput) {
      return api.patch<{ data: Staff }>(`/staff/employees/${input.id}`, input.data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.employees() });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deactivateEmployee(id: string) {
      return api.delete<void>(`/staff/employees/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.employees() });
    },
  });
}

/** Retired → Active (STAFF-10); the API gives a guard their role back. */
export function useReactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function reactivateEmployee(id: string) {
      return api.post<{ data: Staff }>(`/staff/employees/${id}/reactivate`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.employees() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Shifts
// ---------------------------------------------------------------------------

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createShift(input: CreateShiftInput) {
      return api.post<{ data: Shift }>('/staff/shifts', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateShift(input: UpdateShiftInput) {
      return api.patch<{ data: Shift }>(`/staff/shifts/${input.id}`, input.data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteShift(id: string) {
      return api.delete<void>(`/staff/shifts/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.shifts() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Assignments
// ---------------------------------------------------------------------------

export function useAssignStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function assignStaff(input: AssignStaffInput) {
      return api.post<{ data: ShiftAssignment }>('/staff/assignments', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Attendance
// ---------------------------------------------------------------------------

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function clockIn(input: ClockInInput) {
      return api.post<{ data: Attendance }>('/staff/attendance/clock-in', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function clockOut(id: string) {
      return api.patch<{ data: Attendance }>(`/staff/attendance/${id}/clock-out`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.attendance() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Leaves
// ---------------------------------------------------------------------------

export function useApplyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function applyLeave(input: ApplyLeaveInput) {
      return api.post<{ data: Leave }>('/staff/leaves', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function approveLeave(id: string) {
      return api.patch<{ data: Leave }>(`/staff/leaves/${id}/approve`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function rejectLeave(id: string) {
      return api.patch<{ data: Leave }>(`/staff/leaves/${id}/reject`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: staffKeys.leaves() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Gates Config
// ---------------------------------------------------------------------------

export function useCreateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createGate(input: CreateGateInput) {
      return api.post<{ data: Gate }>('/gate/gates', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateConfigKeys.gates() });
    },
  });
}

export function useUpdateGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateGate(input: UpdateGateInput) {
      return api.patch<{ data: Gate }>(`/gate/gates/${input.id}`, input.data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateConfigKeys.gates() });
    },
  });
}

export function useDeleteGate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteGate(id: string) {
      return api.delete<void>(`/gate/gates/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateConfigKeys.gates() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — RBAC
// ---------------------------------------------------------------------------

export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updatePermission(input: UpdatePermissionInput) {
      return api.patch<{ data: RbacPermission }>('/rbac/permissions', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: rbacKeys.permissions() });
    },
  });
}

export function useSeedPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function seedPermissions() {
      return api.post<{ data: RbacPermission[] }>('/rbac/permissions/seed');
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: rbacKeys.permissions() });
    },
  });
}
