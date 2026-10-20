'use client';

import { StaffTypeOptions } from './staff-type-options';
import { LockPanel } from '@/components/gate-lock/lock-panel';
import { isLocked } from '@/lib/gate-unlock';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Users,
  UserCheck,
  Package,
  Clock,
  Plus,
  LogIn,
  LogOut,
  X,
  CheckCircle,
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
import { PageHeader } from '@/components/layout/page-header';
import { useAdminLayout } from '@/lib/layout-context';
import { ExportButton } from '@/components/ui/export-button';
import { DataTablePager } from '@/components/data-table/data-table-pager';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { FormFieldError } from '@/components/ui/form-field-error';
import {
  useGateStats,
  useVisitors,
  useCreateVisitor,
  useWalkInVisitor,
  useCheckInVisitor,
  useCheckOutVisitor,
  useCancelVisitor,
  useStaffLogs,
  useStaffCheckIn,
  useStaffCheckOut,
  useParcels,
  useCreateParcel,
  useCollectParcel,
  useGates,
  useUnits,
} from '@/hooks';
import type {
  Visitor,
  StaffLog,
  Parcel,
  GateStats,
  VisitorFilters,
  StaffLogFilters,
  ParcelFilters,
} from '@/hooks/use-gate';
import {
  useRegularVisitors,
  useDeactivateRegularVisitor,
} from '@/hooks/use-regular-visitors';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { formatDate } from '@/lib/utils';
import { normalizePhone } from '@/lib/validation';
import {
  GATE_LIST_PAGE_SIZE,
  PARCEL_STATUS_BADGE,
  PARCEL_STATUS_OPTIONS,
  VISITOR_EXPORT_COLUMNS,
  canMarkCollected,
} from './gate-lists';
import { VehiclesTab } from './vehicles-tab';
import { todayIST } from '@/lib/date';

type TabKey = 'visitors' | 'staff' | 'regulars' | 'parcels' | 'vehicles';

const VISITOR_STATUS_BADGE: Record<string, { label: string; variant: string; className?: string }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'default', className: 'bg-blue-500/15 text-blue-600 border-transparent' },
  checked_in: { label: 'Checked In', variant: 'success' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'warning', className: 'bg-orange-500/15 text-orange-600 border-transparent' },
};

// QA #75 — pin gate logs to Asia/Kolkata. Backend returns UTC timestamps;
// without an explicit timeZone the browser falls back to its own, and
// admins tunnelling in from a non-IST laptop saw check-in times shifted
// by 5:30 (or more). Guards + residents always operate in IST.
const IST_TZ = 'Asia/Kolkata';

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TZ,
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: IST_TZ,
  })} ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TZ,
  })}`;
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatsCardsSkeleton(): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VisitorTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function StaffTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function ParcelTableSkeleton(): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GateContent(): ReactNode {
  const { addToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('visitors');

  // Visitor state
  const [visitorStatusFilter, setVisitorStatusFilter] = useState('');
  const [visitorPage, setVisitorPage] = useState(1);
  const [addVisitorOpen, setAddVisitorOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorUnit, setVisitorUnit] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [selectedGateId, setSelectedGateId] = useState('');

  // Staff state
  const [staffPage, setStaffPage] = useState(1);
  const [staffCheckInOpen, setStaffCheckInOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffType, setStaffType] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffUnit, setStaffUnit] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [staffSuggestionOpen, setStaffSuggestionOpen] = useState(false);

  // Parcel state
  const [parcelStatusFilter, setParcelStatusFilter] = useState('');
  const [parcelPage, setParcelPage] = useState(1);
  const [logParcelOpen, setLogParcelOpen] = useState(false);
  const [parcelUnit, setParcelUnit] = useState('');
  const [parcelCourier, setParcelCourier] = useState('');
  const [parcelTracking, setParcelTracking] = useState('');
  const [parcelDescription, setParcelDescription] = useState('');

  // Collect parcel dialog
  const [collectParcelOpen, setCollectParcelOpen] = useState(false);
  const [collectParcelId, setCollectParcelId] = useState('');
  const [collectedBy, setCollectedBy] = useState('');

  // Hooks
  const gatesQuery = useGates();
  const gates = gatesQuery.data ?? [];
  const unitsQuery = useUnits({ limit: 500 });
  const units = unitsQuery.data?.data ?? [];
  const statsQuery = useGateStats();
  const stats: GateStats | undefined = statsQuery.data;

  const visitorFilters: VisitorFilters = {
    status: visitorStatusFilter || undefined,
    page: visitorPage,
    limit: GATE_LIST_PAGE_SIZE,
  };
  const visitorsQuery = useVisitors(visitorFilters);
  const visitors: Visitor[] = visitorsQuery.data?.data ?? [];

  const staffFilters: StaffLogFilters = { page: staffPage, limit: GATE_LIST_PAGE_SIZE };
  const staffQuery = useStaffLogs(staffFilters);
  const staffLogs: StaffLog[] = staffQuery.data?.data ?? [];

  // Distinct previously-logged staff members (by name + phone + type). Used by
  // the check-in dialog to let guards pick a regular (maid, cook, driver)
  // without retyping their details. Free-entry is still supported — the
  // suggestion list is only a convenience.
  const knownStaff = (() => {
    const seen = new Set<string>();
    const out: Array<{ staff_name: string; staff_type: string; phone: string | null }> = [];
    for (const log of staffLogs) {
      const key = `${log.staff_name.toLowerCase().trim()}|${(log.phone ?? '').trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        staff_name: log.staff_name,
        staff_type: log.staff_type,
        phone: log.phone,
      });
    }
    return out;
  })();

  const parcelFilters: ParcelFilters = {
    status: parcelStatusFilter || undefined,
    page: parcelPage,
    limit: GATE_LIST_PAGE_SIZE,
  };
  const parcelsQuery = useParcels(parcelFilters);
  const parcels: Parcel[] = parcelsQuery.data?.data ?? [];

  // Mutations
  const createVisitor = useCreateVisitor();
  const walkInVisitor = useWalkInVisitor();
  const checkInVisitor = useCheckInVisitor();
  const checkOutVisitor = useCheckOutVisitor();
  const cancelVisitor = useCancelVisitor();
  const staffCheckIn = useStaffCheckIn();
  const staffCheckOut = useStaffCheckOut();
  const createParcel = useCreateParcel();
  const collectParcel = useCollectParcel();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function resetVisitorForm(): void {
    setVisitorName('');
    setVisitorPhone('');
    setVisitorUnit('');
    setVisitorPurpose('');
    setVisitorVehicle('');
    setSelectedGateId('');
  }

  function handleAddVisitor(e: FormEvent): void {
    e.preventDefault();
    if (!visitorUnit) {
      addToast({ title: 'Please select a unit', variant: 'destructive' });
      return;
    }
    // Visitor phone is optional, but validate when present so we don't
    // write 0000000000 junk that can't be reached for re-entry.
    const phone = normalizePhone(visitorPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid visitor phone',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }
    const payload: Parameters<typeof createVisitor.mutate>[0] = {
      unit_id: visitorUnit,
      visitor_name: visitorName.trim(),
    };
    if (phone.value) payload.visitor_phone = phone.value;
    if (visitorPurpose.trim()) payload.purpose = visitorPurpose.trim();
    if (visitorVehicle.trim()) payload.vehicle_number = visitorVehicle.trim();
    if (selectedGateId) payload.gate_id = selectedGateId;

    createVisitor.mutate(
      payload,
      {
        onSuccess() {
          setAddVisitorOpen(false);
          resetVisitorForm();
          addToast({ title: 'Visitor added successfully', variant: 'success' });
        },
        onError(err) {
          // QA #252 — use friendlyError so ApiError fieldErrors surface
          // a useful summary instead of "Validation failed". The dialog
          // also renders <FormFieldError /> under each input below, so
          // per-field details show up inline.
          addToast({
            title: 'Failed to add visitor',
            description: friendlyError(err),
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleCheckIn(visitorId: string): void {
    checkInVisitor.mutate(
      visitorId,
      {
        onSuccess() {
          addToast({ title: 'Visitor checked in', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to check in visitor', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleCheckOut(visitorId: string): void {
    checkOutVisitor.mutate(
      visitorId,
      {
        onSuccess() {
          addToast({ title: 'Visitor checked out', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to check out visitor', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleCancelVisitor(visitorId: string): void {
    cancelVisitor.mutate(
      visitorId,
      {
        onSuccess() {
          addToast({ title: 'Visitor cancelled', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to cancel visitor', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function resetStaffForm(): void {
    setStaffName('');
    setStaffType('');
    setStaffPhone('');
    setStaffUnit('');
    setStaffNotes('');
  }

  function handleStaffCheckIn(e: FormEvent): void {
    e.preventDefault();
    const phone = normalizePhone(staffPhone);
    if (!phone.ok) {
      addToast({
        title: 'Invalid staff phone',
        description: phone.error,
        variant: 'destructive',
      });
      return;
    }
    const payload: Parameters<typeof staffCheckIn.mutate>[0] = {
      staff_name: staffName.trim(),
      staff_type: staffType,
    };
    if (phone.value) payload.phone = phone.value;
    if (staffUnit) payload.unit_id = staffUnit;
    if (staffNotes.trim()) payload.notes = staffNotes.trim();

    staffCheckIn.mutate(
      payload,
      {
        onSuccess() {
          setStaffCheckInOpen(false);
          resetStaffForm();
          addToast({ title: 'Staff checked in', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Failed to check in staff',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleStaffCheckOut(logId: string): void {
    staffCheckOut.mutate(
      logId,
      {
        onSuccess() {
          addToast({ title: 'Staff checked out', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to check out staff', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function resetParcelForm(): void {
    setParcelUnit('');
    setParcelCourier('');
    setParcelTracking('');
    setParcelDescription('');
  }

  function handleLogParcel(e: FormEvent): void {
    e.preventDefault();
    if (!parcelUnit) {
      addToast({ title: 'Please select a unit', variant: 'destructive' });
      return;
    }
    // Only include fields the user actually filled. Empty strings on UUID /
    // optional text fields cause a 400 on the backend.
    const payload: Parameters<typeof createParcel.mutate>[0] = {
      unit_id: parcelUnit,
    };
    if (parcelCourier.trim()) payload.courier_name = parcelCourier.trim();
    if (parcelTracking.trim()) payload.tracking_number = parcelTracking.trim();
    if (parcelDescription.trim()) payload.description = parcelDescription.trim();

    createParcel.mutate(
      payload,
      {
        onSuccess() {
          setLogParcelOpen(false);
          resetParcelForm();
          addToast({ title: 'Parcel logged successfully', variant: 'success' });
        },
        onError(err) {
          addToast({
            title: 'Failed to log parcel',
            description: (err as Error).message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function openCollectDialog(parcelId: string): void {
    setCollectParcelId(parcelId);
    setCollectedBy('');
    setCollectParcelOpen(true);
  }

  function handleCollectParcel(e: FormEvent): void {
    e.preventDefault();
    const trimmed = collectedBy.trim();
    if (!trimmed) {
      addToast({
        title: 'Collected by is required',
        description: 'Enter the name of the person collecting the parcel.',
        variant: 'destructive',
      });
      return;
    }
    // QA #224 — backend (migration 055) splits collector identity into
    // `collected_by_user_id` (registered member) or `collected_by_name`
    // (free-text fallback). The dialog only takes free text so we always
    // send `collected_by_name`.
    collectParcel.mutate(
      {
        id: collectParcelId,
        collected_by_name: trimmed,
      },
      {
        onSuccess() {
          setCollectParcelOpen(false);
          setCollectParcelId('');
          setCollectedBy('');
          addToast({ title: 'Parcel marked as collected', variant: 'success' });
        },
        onError(error) {
          addToast({ title: 'Failed to collect parcel', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderVisitorStatusBadge(status: string): ReactNode {
    const config = VISITOR_STATUS_BADGE[status] ?? { label: status, variant: 'outline' };
    return (
      <Badge
        variant={config.variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}
        className={config.className}
      >
        {config.label}
      </Badge>
    );
  }

  function renderParcelStatusBadge(status: string): ReactNode {
    const config = PARCEL_STATUS_BADGE[status] ?? { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  }

  // "Showing x to y of z" with Previous / Next (interim, until SB-04).
  function renderPager(page: number, total: number | undefined, onPageChange: (page: number) => void): ReactNode {
    if (!total) return null;
    return (
      <div className="mt-4">
        <DataTablePager
          page={page}
          pageSize={GATE_LIST_PAGE_SIZE}
          total={total}
          pageSizeOptions={[GATE_LIST_PAGE_SIZE]}
          onPageChange={onPageChange}
        />
      </div>
    );
  }

  function renderVisitorActions(visitor: Visitor): ReactNode {
    const { status } = visitor;
    return (
      <div className="flex items-center gap-1">
        {(status === 'approved' || status === 'pending') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCheckIn(visitor.id)}
            disabled={checkInVisitor.isPending}
          >
            <LogIn className="mr-1 h-3 w-3" />
            Check In
          </Button>
        )}
        {status === 'checked_in' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCheckOut(visitor.id)}
            disabled={checkOutVisitor.isPending}
          >
            <LogOut className="mr-1 h-3 w-3" />
            Check Out
          </Button>
        )}
        {(status === 'pending' || status === 'approved') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCancelVisitor(visitor.id)}
            disabled={cancelVisitor.isPending}
            className="text-destructive hover:text-destructive"
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Tab content
  // ---------------------------------------------------------------------------

  function renderVisitorsTab(): ReactNode {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Visitors</CardTitle>
            <div className="flex gap-2">
              <Select
                className="w-36"
                aria-label="Visitor status"
                value={visitorStatusFilter}
                onChange={(e) => { setVisitorStatusFilter(e.target.value); setVisitorPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </Select>

              <Dialog open={addVisitorOpen} onOpenChange={setAddVisitorOpen}>
                <DialogTrigger>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Visitor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddVisitor}>
                    <DialogHeader>
                      <DialogTitle>Add Visitor</DialogTitle>
                      <DialogDescription>Register a new visitor entry</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {gates.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="visitor-gate">Gate</Label>
                          <Select
                            id="visitor-gate"
                            value={selectedGateId}
                            onChange={(e) => setSelectedGateId(e.target.value)}
                          >
                            <option value="">Select gate</option>
                            {gates.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}{g.location ? ` (${g.location})` : ''}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="visitor-name">Visitor Name</Label>
                          <Input
                            id="visitor-name"
                            placeholder="Full name"
                            required
                            value={visitorName}
                            onChange={(e) => setVisitorName(e.target.value)}
                          />
                          {/* QA #252 — backend rejects pure-junk names; show
                              the field-specific message inline. */}
                          <FormFieldError error={createVisitor.error} field="visitor_name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visitor-phone">Phone</Label>
                          <Input
                            id="visitor-phone"
                            placeholder="10-digit number"
                            required
                            inputMode="tel"
                            pattern="[0-9]*"
                            maxLength={10}
                            value={visitorPhone}
                            onChange={(e) => setVisitorPhone(e.target.value.replace(/\D/g, ''))}
                          />
                          <FormFieldError error={createVisitor.error} field="visitor_phone" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="visitor-unit">Unit</Label>
                          <UnitSearchSelect
                            value={visitorUnit}
                            onChange={setVisitorUnit}
                            units={units}
                            placeholder="Search unit..."
                          />
                          <FormFieldError error={createVisitor.error} field="unit_id" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visitor-purpose">Purpose</Label>
                          <Input
                            id="visitor-purpose"
                            placeholder="e.g., Delivery, Guest"
                            required
                            value={visitorPurpose}
                            onChange={(e) => setVisitorPurpose(e.target.value)}
                          />
                          {/* QA #73 — surface "purpose must contain letters"
                              from the server instead of a generic toast. */}
                          <FormFieldError error={createVisitor.error} field="purpose" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="visitor-vehicle">Vehicle Number (optional)</Label>
                        <Input
                          id="visitor-vehicle"
                          placeholder="e.g., KA-01-AB-1234"
                          value={visitorVehicle}
                          onChange={(e) => setVisitorVehicle(e.target.value)}
                        />
                        <FormFieldError error={createVisitor.error} field="vehicle_number" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createVisitor.isPending}>
                        {createVisitor.isPending ? 'Adding...' : 'Add Visitor'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* GATE-43: an admin without a guard role opens the log with a one-time code. */}
          {visitorsQuery.isError && isLocked(visitorsQuery.error) ? (
            <LockPanel scope="visitors" />
          ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visitorsQuery.isLoading ? (
                <VisitorTableSkeleton />
              ) : (
                visitors.map((visitor) => (
                  // QA #23 — API returns visitor_name / visitor_phone /
                  // checked_in_at. Old code read .name / .phone /
                  // .check_in_time, which were all undefined, so every
                  // populated cell visually shifted left by the unfilled
                  // ones.
                  <TableRow key={visitor.id}>
                    <TableCell className="font-medium">{visitor.visitor_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{visitor.visitor_phone ?? '—'}</TableCell>
                    <TableCell>{visitor.unit_number ?? visitor.unit_id}</TableCell>
                    <TableCell>{visitor.purpose ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{visitor.vehicle_number ?? '-'}</TableCell>
                    <TableCell>{renderVisitorStatusBadge(visitor.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(visitor.checked_in_at)}</TableCell>
                    <TableCell>{renderVisitorActions(visitor)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!visitorsQuery.isLoading && visitors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No visitors found</p>
              <p className="text-sm text-muted-foreground">
                {visitorStatusFilter
                  ? 'Try changing the status filter'
                  : 'No visitor records for today'}
              </p>
            </div>
          )}
          {renderPager(visitorPage, visitorsQuery.data?.total, setVisitorPage)}
          </>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderStaffTab(): ReactNode {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Staff Logs</CardTitle>
            <Dialog open={staffCheckInOpen} onOpenChange={setStaffCheckInOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Check In Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleStaffCheckIn}>
                  <DialogHeader>
                    <DialogTitle>Check In Staff</DialogTitle>
                    <DialogDescription>Log a staff member entry</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative space-y-2">
                        <Label htmlFor="staff-name">Staff Name</Label>
                        <Input
                          id="staff-name"
                          placeholder="Type to search or add new"
                          required
                          value={staffName}
                          onChange={(e) => {
                            setStaffName(e.target.value);
                            setStaffSuggestionOpen(true);
                          }}
                          onFocus={() => setStaffSuggestionOpen(true)}
                          onBlur={() => {
                            // Delay so click-on-suggestion can fire first
                            setTimeout(() => setStaffSuggestionOpen(false), 150);
                          }}
                          autoComplete="off"
                        />
                        {staffSuggestionOpen && staffName.length > 0 && (() => {
                          const q = staffName.toLowerCase();
                          const matches = knownStaff
                            .filter(
                              (s) =>
                                s.staff_name.toLowerCase().includes(q) ||
                                (s.phone ?? '').includes(q),
                            )
                            .slice(0, 8);
                          if (matches.length === 0) return null;
                          return (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-card text-card-foreground shadow-lg">
                              <div className="border-b bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                                Previously entered — click to autofill
                              </div>
                              {matches.map((s, i) => (
                                <button
                                  key={`${s.staff_name}-${s.phone}-${i}`}
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setStaffName(s.staff_name);
                                    setStaffType(s.staff_type);
                                    setStaffPhone(s.phone ?? '');
                                    setStaffSuggestionOpen(false);
                                  }}
                                >
                                  <div className="font-medium">{s.staff_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {s.staff_type}
                                    {s.phone ? ` · ${s.phone}` : ''}
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staff-type">Type</Label>
                        <Select
                          id="staff-type"
                          required
                          value={staffType}
                          onChange={(e) => setStaffType(e.target.value)}
                        >
                          <option value="">Select type</option>
                          {/* STAFF-41: the society's staff categories. */}
                          <StaffTypeOptions />
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="staff-phone">Phone</Label>
                        <Input
                          id="staff-phone"
                          placeholder="10-digit number"
                          required
                          inputMode="tel"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={staffPhone}
                          onChange={(e) => setStaffPhone(e.target.value.replace(/\D/g, ''))}
                        />
                        <FormFieldError error={staffCheckIn.error} field="phone" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staff-unit">Unit (optional)</Label>
                        <UnitSearchSelect
                          value={staffUnit}
                          onChange={setStaffUnit}
                          units={units}
                          placeholder="Search unit..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-notes">Notes (optional)</Label>
                      <Input
                        id="staff-notes"
                        placeholder="Any additional notes"
                        value={staffNotes}
                        onChange={(e) => setStaffNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={staffCheckIn.isPending}>
                      {staffCheckIn.isPending ? 'Checking In...' : 'Check In'}
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
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Check-out Time</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffQuery.isLoading ? (
                <StaffTableSkeleton />
              ) : (
                staffLogs.map((log) => (
                  // Same class of QA #23 fix we did for gate visitors —
                  // API returns staff_name / check_in_at / check_out_at,
                  // old UI read .name / .check_in_time / .check_out_time
                  // (all undefined, cells shifted left).
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.staff_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{log.staff_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.phone}</TableCell>
                    <TableCell>{log.unit_number ?? log.unit_id ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(log.check_in_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(log.check_out_at)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {log.notes ?? '-'}
                    </TableCell>
                    <TableCell>
                      {!log.check_out_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStaffCheckOut(log.id)}
                          disabled={staffCheckOut.isPending}
                        >
                          <LogOut className="mr-1 h-3 w-3" />
                          Check Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!staffQuery.isLoading && staffLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No staff logs</p>
              <p className="text-sm text-muted-foreground">No staff check-ins recorded today</p>
            </div>
          )}
          {renderPager(staffPage, staffQuery.data?.total, setStaffPage)}
        </CardContent>
      </Card>
    );
  }

  function renderRegularsTab(): ReactNode {
    return <RegisteredRegularsDirectory />;
  }

  function renderParcelsTab(): ReactNode {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Parcels</CardTitle>
            <div className="flex gap-2">
              <Select
                className="w-36"
                aria-label="Parcel status"
                value={parcelStatusFilter}
                onChange={(e) => { setParcelStatusFilter(e.target.value); setParcelPage(1); }}
              >
                <option value="">All Statuses</option>
                {PARCEL_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Dialog open={logParcelOpen} onOpenChange={setLogParcelOpen}>
                <DialogTrigger>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Log Parcel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleLogParcel}>
                    <DialogHeader>
                      <DialogTitle>Log Parcel</DialogTitle>
                      <DialogDescription>Record a new parcel delivery</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="parcel-unit">Unit</Label>
                          <UnitSearchSelect
                            value={parcelUnit}
                            onChange={setParcelUnit}
                            units={units}
                            placeholder="Search unit..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="parcel-courier">Courier</Label>
                          <Input
                            id="parcel-courier"
                            placeholder="e.g., Amazon, Flipkart"
                            required
                            value={parcelCourier}
                            onChange={(e) => setParcelCourier(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parcel-tracking">Tracking Number (optional)</Label>
                        <Input
                          id="parcel-tracking"
                          placeholder="Tracking / AWB number"
                          value={parcelTracking}
                          onChange={(e) => setParcelTracking(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parcel-description">Description (optional)</Label>
                        <Input
                          id="parcel-description"
                          placeholder="e.g., Large box, Envelope"
                          value={parcelDescription}
                          onChange={(e) => setParcelDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose>
                        <Button type="button" variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createParcel.isPending}>
                        {createParcel.isPending ? 'Logging...' : 'Log Parcel'}
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
                <TableHead>Unit</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Tracking #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Received At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelsQuery.isLoading ? (
                <ParcelTableSkeleton />
              ) : (
                parcels.map((parcel) => (
                  <TableRow key={parcel.id}>
                    <TableCell className="font-medium">{parcel.unit_number ?? parcel.unit_id}</TableCell>
                    <TableCell>{parcel.courier_name ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {parcel.tracking_number ?? '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {parcel.description ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(parcel.received_at)}</TableCell>
                    <TableCell>{renderParcelStatusBadge(parcel.status)}</TableCell>
                    <TableCell>
                      {canMarkCollected(parcel.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCollectDialog(parcel.id)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Mark Collected
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!parcelsQuery.isLoading && parcels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No parcels found</p>
              <p className="text-sm text-muted-foreground">
                {parcelStatusFilter
                  ? 'Try changing the status filter'
                  : 'No parcels logged yet'}
              </p>
            </div>
          )}
          {renderPager(parcelPage, parcelsQuery.data?.total, setParcelPage)}
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'visitors', label: 'Visitors' },
    { key: 'staff', label: 'Staff Logs' },
    { key: 'regulars', label: 'Registered Regulars' },
    { key: 'parcels', label: 'Parcels' },
    { key: 'vehicles', label: 'Vehicles' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Gate' }]}
        title="Gate Management"
        description="Gate visitor management — check-in/out, parcels, staff logs"
        actions={
          <ExportButton
            data={visitors as unknown as Record<string, unknown>[]}
            filename={`gate-visitors-${todayIST()}`}
            columns={[...VISITOR_EXPORT_COLUMNS]}
          />
        }
      />

      {/* Stats cards */}
      {statsQuery.isLoading ? (
        <StatsCardsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Visitors Today</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.visitors_today ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Currently Inside</CardTitle>
              <LogIn className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{stats?.currently_inside ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Staff Checked In</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.staff_checked_in ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Parcels Pending</CardTitle>
              <Package className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{stats?.parcels_pending ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'visitors' && renderVisitorsTab()}
      {activeTab === 'staff' && renderStaffTab()}
      {activeTab === 'regulars' && renderRegularsTab()}
      {activeTab === 'parcels' && renderParcelsTab()}
      {activeTab === 'vehicles' && <VehiclesTab />}

      {/* Collect parcel dialog (shared) */}
      <Dialog open={collectParcelOpen} onOpenChange={setCollectParcelOpen}>
        <DialogContent>
          <form onSubmit={handleCollectParcel}>
            <DialogHeader>
              <DialogTitle>Mark Parcel Collected</DialogTitle>
              <DialogDescription>Enter the name of the person collecting the parcel</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="collected-by">Collected By</Label>
                <Input
                  id="collected-by"
                  placeholder="Name of person collecting"
                  required
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={collectParcel.isPending}>
                {collectParcel.isPending ? 'Updating...' : 'Confirm Collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registered Regulars directory tab
// ---------------------------------------------------------------------------
// Read-only admin view of every regular visitor a resident has registered
// for their unit. Admins can deactivate abusive entries but can't create or
// edit (those are resident-owned).

function RegisteredRegularsDirectory(): ReactNode {
  const { addToast } = useToast();
  const layout = useAdminLayout();
  const [q, setQ] = useState('');
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const query = useRegularVisitors({
    q: q || undefined,
    visitor_type: visitorTypeFilter || undefined,
    is_active: activeFilter === 'all' ? undefined : activeFilter === 'active',
    limit: 100,
  });
  const regulars = query.data?.data ?? [];
  const deactivate = useDeactivateRegularVisitor();

  function handleDeactivate(id: string, name: string): void {
    if (!window.confirm(`Deactivate ${name}? The gate will no longer recognise them.`)) return;
    deactivate.mutate(id, {
      onSuccess() {
        addToast({ title: `${name} deactivated`, variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Failed to deactivate',
          description: friendlyError(err),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Registered Regulars</CardTitle>
            {/* STAFF-42: classic keeps household help in Staff Manager's one register. */}
            {layout === 'classic' && (
              <p className="text-sm text-muted-foreground">
                Household help is managed in{' '}
                <a className="underline" href="/staff/active">
                  Staff Manager › Active
                </a>
                .
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by name or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56"
            />
            <Select
              value={visitorTypeFilter}
              onChange={(e) => setVisitorTypeFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All types</option>
              {/* STAFF-41: the society's household-help categories. */}
              <StaffTypeOptions only="domestic" />
            </Select>
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'active' | 'inactive' | 'all')}
              className="w-36"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : regulars.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regulars.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="capitalize">{r.visitor_type}</TableCell>
                  <TableCell>{r.unit_number ?? r.unit_id}</TableCell>
                  <TableCell>{r.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.last_seen_at ? formatDate(r.last_seen_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? 'success' : 'secondary'}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(r.id, r.name)}
                        disabled={deactivate.isPending}
                      >
                        Deactivate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No registered regulars</p>
            <p className="text-sm text-muted-foreground">
              Residents haven&apos;t registered any regulars yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
