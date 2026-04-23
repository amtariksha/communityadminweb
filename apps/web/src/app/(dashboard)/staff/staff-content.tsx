'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  MoreVertical,
  Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { FormFieldError } from '@/components/ui/form-field-error';
import { formatDate } from '@/lib/utils';
import { normalizePhone } from '@/lib/validation';
import { ClickablePhone } from '@/components/ui/clickable-contact';
import {
  useStaffEmployees,
  useStaffShifts,
  useStaffAssignments,
  useStaffAttendance,
  useStaffLeaves,
  useGates,
  useCreateEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useCreateShift,
  useAssignStaff,
  useClockIn,
  useClockOut,
  useApplyLeave,
  useApproveLeave,
  useRejectLeave,
} from '@/hooks';
import type {
  Staff,
  Shift,
  ShiftAssignment,
  Attendance,
  Leave,
  StaffFilters,
  AttendanceFilters,
  LeaveFilters,
} from '@/hooks/use-staff';

type TabKey = 'employees' | 'shifts' | 'attendance' | 'leaves';

// Values MUST match the society_staff.staff_type CHECK constraint
// (migration 018). Mismatches 400 with a raw pg CheckViolation that
// leaks "Failing row contains …" to the user.
const STAFF_TYPE_OPTIONS = [
  { value: 'security_guard', label: 'Security Guard' },
  { value: 'watchman', label: 'Watchman' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'gardener', label: 'Gardener' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'manager', label: 'Manager' },
  { value: 'other', label: 'Other' },
];

const LEAVE_TYPE_OPTIONS = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function TableSkeleton({ cols }: { cols: number }): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StaffContent(): ReactNode {
  const { addToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('employees');

  // Employee filters
  const [staffTypeFilter, setStaffTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Employee dialog state
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empType, setEmpType] = useState('security_guard');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empAddress, setEmpAddress] = useState('');
  const [empEmergencyContact, setEmpEmergencyContact] = useState('');
  const [empJoinedAt, setEmpJoinedAt] = useState('');

  // Shift dialog state
  const [addShiftOpen, setAddShiftOpen] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  // Assignment dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [assignGateId, setAssignGateId] = useState('');
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignFromDate, setAssignFromDate] = useState('');
  const [assignUntilDate, setAssignUntilDate] = useState('');

  // Attendance filters
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  // Clock in dialog
  const [clockInOpen, setClockInOpen] = useState(false);
  const [clockInStaffId, setClockInStaffId] = useState('');
  const [clockInGateId, setClockInGateId] = useState('');
  const [clockInShiftId, setClockInShiftId] = useState('');

  // Leave dialog state
  const [addLeaveOpen, setAddLeaveOpen] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Leave filter
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('');

  // Queries
  const employeeFilters: StaffFilters = {
    staff_type: staffTypeFilter || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'true',
  };
  const employeesQuery = useStaffEmployees(employeeFilters);
  const employees: Staff[] = employeesQuery.data?.data ?? [];

  const shiftsQuery = useStaffShifts();
  const shifts: Shift[] = shiftsQuery.data ?? [];

  const assignmentsQuery = useStaffAssignments();
  const assignments: ShiftAssignment[] = assignmentsQuery.data?.data ?? [];

  const attendanceFilters: AttendanceFilters = {
    date: attendanceDate || undefined,
  };
  const attendanceQuery = useStaffAttendance(attendanceFilters);
  const attendanceRecords: Attendance[] = attendanceQuery.data?.data ?? [];

  const leaveFilters: LeaveFilters = {
    status: leaveStatusFilter || undefined,
  };
  const leavesQuery = useStaffLeaves(leaveFilters);
  const leaves: Leave[] = leavesQuery.data?.data ?? [];

  const gatesQuery = useGates();
  const gates = gatesQuery.data ?? [];

  // Mutations
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const createShift = useCreateShift();
  const assignStaff = useAssignStaff();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const applyLeave = useApplyLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  // ---------------------------------------------------------------------------
  // Employee handlers
  // ---------------------------------------------------------------------------

  function resetEmployeeForm(): void {
    setEditingEmployeeId('');
    setEmpName('');
    setEmpPhone('');
    setEmpType('security_guard');
    setEmpDesignation('');
    setEmpAddress('');
    setEmpEmergencyContact('');
    setEmpJoinedAt('');
  }

  function handleOpenEditEmployee(emp: Staff): void {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpPhone(emp.phone);
    setEmpType(emp.staff_type);
    setEmpDesignation(emp.designation ?? '');
    setEmpAddress(emp.address ?? '');
    setEmpEmergencyContact(emp.emergency_contact ?? '');
    setEmpJoinedAt(emp.joined_at ? emp.joined_at.split('T')[0] : '');
    setAddEmployeeOpen(true);
  }

  function handleSaveEmployee(e: FormEvent): void {
    e.preventDefault();
    // Phone checks mirror units-content.tsx — reject non-Indian-mobile
    // inputs client-side so the 400 from the backend's indianPhone
    // Zod never lands as a late toast. Emergency contact is optional;
    // primary phone is required on create (the input itself is
    // `disabled` on edit, so edit path skips the check).
    const emergency = normalizePhone(empEmergencyContact);
    if (!emergency.ok) {
      addToast({
        title: 'Invalid emergency contact',
        description: emergency.error,
        variant: 'destructive',
      });
      return;
    }

    if (editingEmployeeId) {
      updateEmployee.mutate(
        {
          id: editingEmployeeId,
          data: {
            name: empName,
            staff_type: empType,
            designation: empDesignation || undefined,
            address: empAddress || undefined,
            emergency_contact: emergency.value || undefined,
          },
        },
        {
          onSuccess() {
            setAddEmployeeOpen(false);
            resetEmployeeForm();
            addToast({ title: 'Employee updated', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to update employee', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    } else {
      const phone = normalizePhone(empPhone);
      if (!phone.ok || !phone.value) {
        addToast({
          title: 'Invalid phone number',
          description: phone.ok
            ? 'Phone is required.'
            : phone.error,
          variant: 'destructive',
        });
        return;
      }
      createEmployee.mutate(
        {
          name: empName,
          phone: phone.value,
          staff_type: empType,
          designation: empDesignation || undefined,
          address: empAddress || undefined,
          emergency_contact: emergency.value || undefined,
          joined_at: empJoinedAt || undefined,
        },
        {
          onSuccess() {
            setAddEmployeeOpen(false);
            resetEmployeeForm();
            addToast({ title: 'Employee added', variant: 'success' });
          },
          onError(error) {
            addToast({ title: 'Failed to add employee', description: friendlyError(error), variant: 'destructive' });
          },
        },
      );
    }
  }

  function handleDeactivateEmployee(id: string): void {
    deactivateEmployee.mutate(id, {
      onSuccess() {
        addToast({ title: 'Employee deactivated', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to deactivate', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Shift handlers
  // ---------------------------------------------------------------------------

  function resetShiftForm(): void {
    setShiftName('');
    setShiftStart('');
    setShiftEnd('');
  }

  function handleCreateShift(e: FormEvent): void {
    e.preventDefault();
    createShift.mutate(
      { name: shiftName, start_time: shiftStart, end_time: shiftEnd },
      {
        onSuccess() {
          setAddShiftOpen(false);
          resetShiftForm();
          addToast({ title: 'Shift created', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to create shift', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Assignment handlers
  // ---------------------------------------------------------------------------

  function resetAssignForm(): void {
    setAssignStaffId('');
    setAssignGateId('');
    setAssignShiftId('');
    setAssignFromDate('');
    setAssignUntilDate('');
  }

  function handleAssignStaff(e: FormEvent): void {
    e.preventDefault();
    assignStaff.mutate(
      {
        staff_id: assignStaffId,
        gate_id: assignGateId,
        shift_id: assignShiftId,
        from_date: assignFromDate,
        until_date: assignUntilDate || undefined,
      },
      {
        onSuccess() {
          setAssignOpen(false);
          resetAssignForm();
          addToast({ title: 'Staff assigned', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to assign staff', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Clock in/out handlers
  // ---------------------------------------------------------------------------

  function handleClockIn(e: FormEvent): void {
    e.preventDefault();
    clockIn.mutate(
      {
        staff_id: clockInStaffId,
        gate_id: clockInGateId || undefined,
        shift_id: clockInShiftId || undefined,
      },
      {
        onSuccess() {
          setClockInOpen(false);
          setClockInStaffId('');
          setClockInGateId('');
          setClockInShiftId('');
          addToast({ title: 'Clock in recorded', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to clock in', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleClockOut(attendanceId: string): void {
    clockOut.mutate(attendanceId, {
      onSuccess() {
        addToast({ title: 'Clock out recorded', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to clock out', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Leave handlers
  // ---------------------------------------------------------------------------

  function resetLeaveForm(): void {
    setLeaveStaffId('');
    setLeaveType('casual');
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveReason('');
  }

  function handleApplyLeave(e: FormEvent): void {
    e.preventDefault();
    applyLeave.mutate(
      {
        staff_id: leaveStaffId,
        leave_type: leaveType,
        start_date: leaveFrom,
        end_date: leaveTo,
        reason: leaveReason || undefined,
      },
      {
        onSuccess() {
          setAddLeaveOpen(false);
          resetLeaveForm();
          addToast({ title: 'Leave applied', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to apply leave', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleApproveLeave(leaveId: string): void {
    approveLeave.mutate(leaveId, {
      onSuccess() {
        addToast({ title: 'Leave approved', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to approve leave', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function handleRejectLeave(leaveId: string): void {
    rejectLeave.mutate(leaveId, {
      onSuccess() {
        addToast({ title: 'Leave rejected', variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to reject leave', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'employees', label: 'Employees' },
    { key: 'shifts', label: 'Shifts & Assignments' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'leaves', label: 'Leaves' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Staff' }]}
        title="Staff Management"
        description="Manage society staff — employees, shifts, attendance, and leaves"
        actions={
          <ExportButton
            data={employees as unknown as Record<string, unknown>[]}
            filename={`staff-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'staff_type', label: 'Type' },
              { key: 'phone', label: 'Phone' },
              { key: 'status', label: 'Status' },
              { key: 'joined_at', label: 'Joined' },
            ]}
          />
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* Employees Tab                                                      */}
      {/* ================================================================= */}
      {activeTab === 'employees' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Employees</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={staffTypeFilter}
                  onChange={(e) => setStaffTypeFilter(e.target.value)}
                  className="w-36"
                >
                  <option value="">All Types</option>
                  {STAFF_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
                <Select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-28"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
                <Dialog open={addEmployeeOpen} onOpenChange={(open) => { setAddEmployeeOpen(open); if (!open) resetEmployeeForm(); }}>
                  <DialogTrigger>
                    <Button size="sm" onClick={() => resetEmployeeForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleSaveEmployee}>
                      <DialogHeader>
                        <DialogTitle>{editingEmployeeId ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
                        <DialogDescription>
                          {editingEmployeeId ? 'Update employee details' : 'Add a new staff member'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="emp-name">Name</Label>
                            <Input
                              id="emp-name"
                              required
                              placeholder="Full name"
                              value={empName}
                              onChange={(e) => setEmpName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emp-phone">Phone</Label>
                            <Input
                              id="emp-phone"
                              type="tel"
                              required={!editingEmployeeId}
                              disabled={Boolean(editingEmployeeId)}
                              placeholder="10-digit phone"
                              maxLength={10}
                              pattern="[0-9]{10}"
                              inputMode="numeric"
                              title="Phone must be exactly 10 digits"
                              value={empPhone}
                              onChange={(e) => setEmpPhone(e.target.value.replace(/\D/g, ''))}
                            />
                            <FormFieldError
                              error={editingEmployeeId ? updateEmployee.error : createEmployee.error}
                              field="phone"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="emp-type">Staff Type</Label>
                            <Select
                              id="emp-type"
                              value={empType}
                              onChange={(e) => setEmpType(e.target.value)}
                            >
                              {STAFF_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emp-designation">Designation</Label>
                            <Input
                              id="emp-designation"
                              placeholder="e.g., Head Guard"
                              value={empDesignation}
                              onChange={(e) => setEmpDesignation(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emp-address">Address</Label>
                          <Input
                            id="emp-address"
                            placeholder="Home address"
                            value={empAddress}
                            onChange={(e) => setEmpAddress(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="emp-emergency">Emergency Contact</Label>
                            <Input
                              id="emp-emergency"
                              type="tel"
                              placeholder="10-digit phone"
                              maxLength={10}
                              pattern="[0-9]{10}"
                              inputMode="numeric"
                              title="Emergency contact must be exactly 10 digits"
                              value={empEmergencyContact}
                              onChange={(e) => setEmpEmergencyContact(e.target.value.replace(/\D/g, ''))}
                            />
                          </div>
                          {!editingEmployeeId && (
                            <div className="space-y-2">
                              <Label htmlFor="emp-joined">Join Date</Label>
                              <Input
                                id="emp-joined"
                                type="date"
                                value={empJoinedAt}
                                onChange={(e) => setEmpJoinedAt(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
                          {(createEmployee.isPending || updateEmployee.isPending) ? 'Saving...' : 'Save'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesQuery.isLoading ? (
                  <TableSkeleton cols={7} />
                ) : employeesQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-destructive">
                      Failed to load employees —{' '}
                      {(employeesQuery.error as Error)?.message ?? 'unknown error'}.{' '}
                      <Button
                        size="sm"
                        variant="link"
                        className="px-1 text-destructive underline"
                        onClick={() => employeesQuery.refetch()}
                      >
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : employees.length > 0 ? (
                  employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell><ClickablePhone phone={emp.phone} /></TableCell>
                      <TableCell className="capitalize">{emp.staff_type}</TableCell>
                      <TableCell>{emp.designation ?? '-'}</TableCell>
                      <TableCell>{emp.joined_at ? formatDate(emp.joined_at) : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active ? 'success' : 'secondary'}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditEmployee(emp)}>
                              Edit
                            </DropdownMenuItem>
                            {emp.is_active && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeactivateEmployee(emp.id)}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No employees found. Add your first staff member.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Shifts & Assignments Tab                                           */}
      {/* ================================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Shift Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shift Templates</CardTitle>
                <Dialog open={addShiftOpen} onOpenChange={setAddShiftOpen}>
                  <DialogTrigger>
                    <Button size="sm" onClick={() => resetShiftForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Shift
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateShift}>
                      <DialogHeader>
                        <DialogTitle>Create Shift</DialogTitle>
                        <DialogDescription>Define a new shift template</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="shift-name">Shift Name</Label>
                          <Input
                            id="shift-name"
                            required
                            placeholder="e.g., Morning Shift"
                            value={shiftName}
                            onChange={(e) => setShiftName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="shift-start">Start Time</Label>
                            <Input
                              id="shift-start"
                              type="time"
                              required
                              value={shiftStart}
                              onChange={(e) => setShiftStart(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="shift-end">End Time</Label>
                            <Input
                              id="shift-end"
                              type="time"
                              required
                              value={shiftEnd}
                              onChange={(e) => setShiftEnd(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={createShift.isPending}>
                          {createShift.isPending ? 'Creating...' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {shiftsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : shifts.length > 0 ? (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between rounded-md border p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{shift.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {shift.start_time} - {shift.end_time}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No shifts defined. Create shift templates to assign staff.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staff Assignments</CardTitle>
                <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) resetAssignForm(); }}>
                  <DialogTrigger>
                    <Button size="sm" onClick={() => resetAssignForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleAssignStaff}>
                      <DialogHeader>
                        <DialogTitle>Assign Staff</DialogTitle>
                        <DialogDescription>Assign a staff member to a gate and shift</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="assign-staff">Staff Member</Label>
                          <Select
                            id="assign-staff"
                            required
                            value={assignStaffId}
                            onChange={(e) => setAssignStaffId(e.target.value)}
                          >
                            <option value="">Select staff...</option>
                            {employees.filter((e) => e.is_active).map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="assign-gate">Gate</Label>
                          <Select
                            id="assign-gate"
                            required
                            value={assignGateId}
                            onChange={(e) => setAssignGateId(e.target.value)}
                          >
                            <option value="">Select gate...</option>
                            {gates.map((gate) => (
                              <option key={gate.id} value={gate.id}>{gate.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="assign-shift">Shift</Label>
                          <Select
                            id="assign-shift"
                            required
                            value={assignShiftId}
                            onChange={(e) => setAssignShiftId(e.target.value)}
                          >
                            <option value="">Select shift...</option>
                            {shifts.map((shift) => (
                              <option key={shift.id} value={shift.id}>{shift.name} ({shift.start_time} - {shift.end_time})</option>
                            ))}
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="assign-from">From Date</Label>
                            <Input
                              id="assign-from"
                              type="date"
                              required
                              value={assignFromDate}
                              onChange={(e) => setAssignFromDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="assign-until">Until Date (optional)</Label>
                            <Input
                              id="assign-until"
                              type="date"
                              value={assignUntilDate}
                              onChange={(e) => setAssignUntilDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={assignStaff.isPending}>
                          {assignStaff.isPending ? 'Assigning...' : 'Assign'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Gate</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Until</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentsQuery.isLoading ? (
                    <TableSkeleton cols={6} />
                  ) : assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.staff_name ?? '-'}</TableCell>
                        <TableCell>{assignment.gate_name ?? '-'}</TableCell>
                        <TableCell>{assignment.shift_name ?? '-'}</TableCell>
                        <TableCell>{formatDate(assignment.from_date)}</TableCell>
                        <TableCell>{assignment.until_date ? formatDate(assignment.until_date) : 'Ongoing'}</TableCell>
                        <TableCell>
                          <Badge variant={assignment.is_active ? 'success' : 'secondary'}>
                            {assignment.is_active ? 'Active' : 'Ended'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No assignments found. Assign staff to gates and shifts.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================= */}
      {/* Attendance Tab                                                     */}
      {/* ================================================================= */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attendance</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-40"
                />
                <Dialog open={clockInOpen} onOpenChange={setClockInOpen}>
                  <DialogTrigger>
                    <Button size="sm">
                      <LogIn className="mr-2 h-4 w-4" />
                      Clock In
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleClockIn}>
                      <DialogHeader>
                        <DialogTitle>Clock In</DialogTitle>
                        <DialogDescription>Record staff clock-in</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="clockin-staff">Staff Member</Label>
                          <Select
                            id="clockin-staff"
                            required
                            value={clockInStaffId}
                            onChange={(e) => setClockInStaffId(e.target.value)}
                          >
                            <option value="">Select staff...</option>
                            {employees.filter((e) => e.is_active).map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clockin-gate">Gate (optional)</Label>
                          <Select
                            id="clockin-gate"
                            value={clockInGateId}
                            onChange={(e) => setClockInGateId(e.target.value)}
                          >
                            <option value="">Select gate...</option>
                            {gates.map((gate) => (
                              <option key={gate.id} value={gate.id}>{gate.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clockin-shift">Shift (optional)</Label>
                          <Select
                            id="clockin-shift"
                            value={clockInShiftId}
                            onChange={(e) => setClockInShiftId(e.target.value)}
                          >
                            <option value="">Select shift...</option>
                            {shifts.map((shift) => (
                              <option key={shift.id} value={shift.id}>{shift.name}</option>
                            ))}
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={clockIn.isPending}>
                          {clockIn.isPending ? 'Recording...' : 'Clock In'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceQuery.isLoading ? (
                  <TableSkeleton cols={8} />
                ) : attendanceRecords.length > 0 ? (
                  attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.staff_name ?? '-'}</TableCell>
                      <TableCell>{record.gate_name ?? '-'}</TableCell>
                      <TableCell>{record.shift_name ?? '-'}</TableCell>
                      <TableCell>{formatTime(record.clock_in)}</TableCell>
                      <TableCell>{formatTime(record.clock_out)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'present' ? 'success' :
                            record.status === 'late' ? 'warning' :
                            record.status === 'half_day' ? 'default' :
                            'destructive'
                          }
                        >
                          {record.status === 'half_day' ? 'Half Day' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDuration(record.duration_minutes)}</TableCell>
                      <TableCell>
                        {!record.clock_out && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleClockOut(record.id)}
                            disabled={clockOut.isPending}
                          >
                            <LogOut className="mr-1 h-3 w-3" />
                            Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No attendance records for this date.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Leaves Tab                                                         */}
      {/* ================================================================= */}
      {activeTab === 'leaves' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leave Requests</CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  value={leaveStatusFilter}
                  onChange={(e) => setLeaveStatusFilter(e.target.value)}
                  className="w-32"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
                <Dialog open={addLeaveOpen} onOpenChange={(open) => { setAddLeaveOpen(open); if (!open) resetLeaveForm(); }}>
                  <DialogTrigger>
                    <Button size="sm" onClick={() => resetLeaveForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Apply Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleApplyLeave}>
                      <DialogHeader>
                        <DialogTitle>Apply Leave</DialogTitle>
                        <DialogDescription>Submit a leave request for a staff member</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="leave-staff">Staff Member</Label>
                          <Select
                            id="leave-staff"
                            required
                            value={leaveStaffId}
                            onChange={(e) => setLeaveStaffId(e.target.value)}
                          >
                            <option value="">Select staff...</option>
                            {employees.filter((e) => e.is_active).map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leave-type">Leave Type</Label>
                          <Select
                            id="leave-type"
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                          >
                            {LEAVE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="leave-from">From Date</Label>
                            <Input
                              id="leave-from"
                              type="date"
                              required
                              value={leaveFrom}
                              onChange={(e) => setLeaveFrom(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leave-to">To Date</Label>
                            <Input
                              id="leave-to"
                              type="date"
                              required
                              value={leaveTo}
                              onChange={(e) => setLeaveTo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leave-reason">Reason</Label>
                          <Input
                            id="leave-reason"
                            placeholder="Reason for leave"
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose>
                          <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={applyLeave.isPending}>
                          {applyLeave.isPending ? 'Applying...' : 'Apply'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leavesQuery.isLoading ? (
                  <TableSkeleton cols={7} />
                ) : leaves.length > 0 ? (
                  leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">{leave.staff_name ?? '-'}</TableCell>
                      <TableCell className="capitalize">{leave.leave_type.replace('_', ' ')}</TableCell>
                      <TableCell>{formatDate(leave.from_date)}</TableCell>
                      <TableCell>{formatDate(leave.to_date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{leave.reason ?? '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            leave.status === 'approved' ? 'success' :
                            leave.status === 'rejected' ? 'destructive' :
                            'warning'
                          }
                        >
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {leave.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1 text-xs text-green-600"
                              onClick={() => handleApproveLeave(leave.id)}
                              disabled={approveLeave.isPending}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 p-1 text-xs text-destructive"
                              onClick={() => handleRejectLeave(leave.id)}
                              disabled={rejectLeave.isPending}
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
