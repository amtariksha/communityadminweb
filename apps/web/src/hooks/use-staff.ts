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
  staff_type: 'security' | 'housekeeping' | 'maintenance' | 'gardener' | 'driver' | 'other';
  designation: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  address: string | null;
  emergency_contact: string | null;
  photo_url: string | null;
  joined_at: string;
  left_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  // NOTE: `is_active` column does not exist on staff_shifts table; backend
  // never returns it. Kept optional for forward-compat if added later.
  is_active?: boolean;
  created_at: string;
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
  from_date: string;
  until_date: string | null;
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
  leave_type: 'casual' | 'sick' | 'earned' | 'unpaid';
  from_date: string;
  to_date: string;
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
  gate_type: 'main' | 'service' | 'parking' | 'emergency';
  is_active: boolean;
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

export interface StaffFilters {
  staff_type?: string;
  is_active?: boolean;
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
  joined_at?: string;
}

interface UpdateEmployeeInput {
  id: string;
  data: Partial<Omit<CreateEmployeeInput, 'phone'>>;
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

interface AssignStaffInput {
  staff_id: string;
  gate_id: string;
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
};

export const rbacKeys = {
  all: ['rbac'] as const,
  permissions: () => [...rbacKeys.all, 'permissions'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function staffFiltersToParams(
  filters?: StaffFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.staff_type) params.staff_type = filters.staff_type;
  if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
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

export function useGates() {
  return useQuery({
    queryKey: gateConfigKeys.gates(),
    queryFn: function fetchGates() {
      return api.get<{ data: Gate[] }>('/gate/gates').then(function unwrap(res) {
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
