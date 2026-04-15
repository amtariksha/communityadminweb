'use client';

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
  Car,
  AlertTriangle,
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
import { ExportButton } from '@/components/ui/export-button';
import { useToast } from '@/components/ui/toast';
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
  useAnprLogs,
  useUnrecognizedVehicles,
  useGates,
  useUnits,
} from '@/hooks';
import type {
  Visitor,
  StaffLog,
  Parcel,
  GateStats,
  AnprLog,
  UnrecognizedVehicle,
  VisitorFilters,
  StaffLogFilters,
  ParcelFilters,
  AnprLogFilters,
} from '@/hooks/use-gate';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { formatDate } from '@/lib/utils';

type TabKey = 'visitors' | 'staff' | 'parcels' | 'vehicles';

const VISITOR_STATUS_BADGE: Record<string, { label: string; variant: string; className?: string }> = {
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'default', className: 'bg-blue-500/15 text-blue-600 border-transparent' },
  checked_in: { label: 'Checked In', variant: 'success' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'warning', className: 'bg-orange-500/15 text-orange-600 border-transparent' },
};

const PARCEL_STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  received: { label: 'Received', variant: 'warning' },
  collected: { label: 'Collected', variant: 'success' },
  returned: { label: 'Returned', variant: 'secondary' },
};

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
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
  const [addVisitorOpen, setAddVisitorOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorUnit, setVisitorUnit] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [selectedGateId, setSelectedGateId] = useState('');

  // Staff state
  const [staffCheckInOpen, setStaffCheckInOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffType, setStaffType] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffUnit, setStaffUnit] = useState('');
  const [staffNotes, setStaffNotes] = useState('');

  // Parcel state
  const [parcelStatusFilter, setParcelStatusFilter] = useState('');
  const [logParcelOpen, setLogParcelOpen] = useState(false);
  const [parcelUnit, setParcelUnit] = useState('');
  const [parcelCourier, setParcelCourier] = useState('');
  const [parcelTracking, setParcelTracking] = useState('');
  const [parcelDescription, setParcelDescription] = useState('');

  // Collect parcel dialog
  const [collectParcelOpen, setCollectParcelOpen] = useState(false);
  const [collectParcelId, setCollectParcelId] = useState('');
  const [collectedBy, setCollectedBy] = useState('');

  // Vehicle / ANPR state
  const [anprGateFilter, setAnprGateFilter] = useState('');
  const [anprFromDate, setAnprFromDate] = useState('');
  const [anprToDate, setAnprToDate] = useState('');
  const [anprRecognizedFilter, setAnprRecognizedFilter] = useState('');

  // Hooks
  const gatesQuery = useGates();
  const gates = gatesQuery.data ?? [];
  const unitsQuery = useUnits({ limit: 500 });
  const units = unitsQuery.data?.data ?? [];
  const statsQuery = useGateStats();
  const stats: GateStats | undefined = statsQuery.data;

  const visitorFilters: VisitorFilters = {
    status: visitorStatusFilter || undefined,
  };
  const visitorsQuery = useVisitors(visitorFilters);
  const visitors: Visitor[] = visitorsQuery.data?.data ?? [];

  const staffFilters: StaffLogFilters = {};
  const staffQuery = useStaffLogs(staffFilters);
  const staffLogs: StaffLog[] = staffQuery.data?.data ?? [];

  const parcelFilters: ParcelFilters = {
    status: parcelStatusFilter || undefined,
  };
  const parcelsQuery = useParcels(parcelFilters);
  const parcels: Parcel[] = parcelsQuery.data?.data ?? [];

  const anprFilters: AnprLogFilters = {
    gate_id: anprGateFilter || undefined,
    from_date: anprFromDate || undefined,
    to_date: anprToDate || undefined,
    is_recognized: anprRecognizedFilter === '' ? undefined : anprRecognizedFilter === 'true',
  };
  const anprQuery = useAnprLogs(anprFilters);
  const anprLogs: AnprLog[] = anprQuery.data?.data ?? [];
  const unrecognizedQuery = useUnrecognizedVehicles();
  const unrecognizedVehicles: UnrecognizedVehicle[] = unrecognizedQuery.data ?? [];

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
    createVisitor.mutate(
      {
        name: visitorName,
        phone: visitorPhone,
        unit_id: visitorUnit,
        purpose: visitorPurpose,
        vehicle_number: visitorVehicle || null,
        gate_id: selectedGateId || undefined,
      },
      {
        onSuccess() {
          setAddVisitorOpen(false);
          resetVisitorForm();
          addToast({ title: 'Visitor added successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to add visitor', variant: 'destructive' });
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
        onError() {
          addToast({ title: 'Failed to check in visitor', variant: 'destructive' });
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
        onError() {
          addToast({ title: 'Failed to check out visitor', variant: 'destructive' });
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
        onError() {
          addToast({ title: 'Failed to cancel visitor', variant: 'destructive' });
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
    staffCheckIn.mutate(
      {
        staff_name: staffName,
        staff_type: staffType,
        phone: staffPhone,
        unit_id: staffUnit || null,
        notes: staffNotes || null,
      },
      {
        onSuccess() {
          setStaffCheckInOpen(false);
          resetStaffForm();
          addToast({ title: 'Staff checked in', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to check in staff', variant: 'destructive' });
        },
      },
    );
  }

  function handleStaffCheckOut(logId: string): void {
    staffCheckOut.mutate(
      { log_id: logId },
      {
        onSuccess() {
          addToast({ title: 'Staff checked out', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to check out staff', variant: 'destructive' });
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
    createParcel.mutate(
      {
        unit_id: parcelUnit,
        courier: parcelCourier,
        tracking_number: parcelTracking || null,
        description: parcelDescription || null,
      },
      {
        onSuccess() {
          setLogParcelOpen(false);
          resetParcelForm();
          addToast({ title: 'Parcel logged successfully', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to log parcel', variant: 'destructive' });
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
    collectParcel.mutate(
      {
        parcel_id: collectParcelId,
        collected_by: collectedBy,
      },
      {
        onSuccess() {
          setCollectParcelOpen(false);
          setCollectParcelId('');
          setCollectedBy('');
          addToast({ title: 'Parcel marked as collected', variant: 'success' });
        },
        onError() {
          addToast({ title: 'Failed to collect parcel', variant: 'destructive' });
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
    const config = PARCEL_STATUS_BADGE[status] ?? { label: status, variant: 'outline' };
    return (
      <Badge variant={config.variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'}>
        {config.label}
      </Badge>
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
                value={visitorStatusFilter}
                onChange={(e) => setVisitorStatusFilter(e.target.value)}
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
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="visitor-phone">Phone</Label>
                          <Input
                            id="visitor-phone"
                            placeholder="10-digit number"
                            required
                            value={visitorPhone}
                            onChange={(e) => setVisitorPhone(e.target.value)}
                          />
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
                  <TableRow key={visitor.id}>
                    <TableCell className="font-medium">{visitor.name}</TableCell>
                    <TableCell className="text-muted-foreground">{visitor.phone}</TableCell>
                    <TableCell>{visitor.unit_number ?? visitor.unit_id}</TableCell>
                    <TableCell>{visitor.purpose}</TableCell>
                    <TableCell className="text-muted-foreground">{visitor.vehicle_number ?? '-'}</TableCell>
                    <TableCell>{renderVisitorStatusBadge(visitor.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(visitor.check_in_time)}</TableCell>
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
                      <div className="space-y-2">
                        <Label htmlFor="staff-name">Staff Name</Label>
                        <Input
                          id="staff-name"
                          placeholder="Full name"
                          required
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                        />
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
                          <option value="maid">Maid</option>
                          <option value="cook">Cook</option>
                          <option value="driver">Driver</option>
                          <option value="nanny">Nanny</option>
                          <option value="gardener">Gardener</option>
                          <option value="plumber">Plumber</option>
                          <option value="electrician">Electrician</option>
                          <option value="other">Other</option>
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
                          value={staffPhone}
                          onChange={(e) => setStaffPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="staff-unit">Unit (optional)</Label>
                        <Input
                          id="staff-unit"
                          placeholder="e.g., A-301"
                          value={staffUnit}
                          onChange={(e) => setStaffUnit(e.target.value)}
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
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{log.staff_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.phone}</TableCell>
                    <TableCell>{log.unit_number ?? log.unit_id ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(log.check_in_time)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(log.check_out_time)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {log.notes ?? '-'}
                    </TableCell>
                    <TableCell>
                      {!log.check_out_time && (
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
        </CardContent>
      </Card>
    );
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
                value={parcelStatusFilter}
                onChange={(e) => setParcelStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="received">Received</option>
                <option value="collected">Collected</option>
                <option value="returned">Returned</option>
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
                    <TableCell>{parcel.courier}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {parcel.tracking_number ?? '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {parcel.description ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(parcel.received_at)}</TableCell>
                    <TableCell>{renderParcelStatusBadge(parcel.status)}</TableCell>
                    <TableCell>
                      {parcel.status === 'received' && (
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
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------------------------------------
  // Vehicles / ANPR tab
  // ---------------------------------------------------------------------------

  function renderVehiclesTab(): ReactNode {
    return (
      <>
        {/* Unrecognized vehicles alert */}
        {unrecognizedVehicles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Unrecognized Vehicles ({unrecognizedVehicles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {unrecognizedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-md border p-3 space-y-1">
                    <p className="font-mono font-bold text-sm">{vehicle.plate_number}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.gate_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(vehicle.timestamp)}</p>
                    {vehicle.occurrence_count > 1 && (
                      <Badge variant="warning" className="text-xs">
                        Seen {vehicle.occurrence_count} times
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ANPR log table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Entry/Exit Log
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={anprFromDate}
                  onChange={(e) => setAnprFromDate(e.target.value)}
                  className="w-36"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={anprToDate}
                  onChange={(e) => setAnprToDate(e.target.value)}
                  className="w-36"
                  placeholder="To"
                />
                <Select
                  value={anprRecognizedFilter}
                  onChange={(e) => setAnprRecognizedFilter(e.target.value)}
                  className="w-36"
                >
                  <option value="">All</option>
                  <option value="true">Recognized</option>
                  <option value="false">Unrecognized</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Recognized</TableHead>
                  <TableHead>Owner / Unit</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anprQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : anprLogs.length > 0 ? (
                  anprLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono font-medium">{log.plate_number}</TableCell>
                      <TableCell>{log.gate_name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.direction === 'in' ? 'success' : 'secondary'}
                          className="capitalize"
                        >
                          {log.direction === 'in' ? 'Entry' : 'Exit'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.is_recognized ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <Badge variant="destructive">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.vehicle_owner ?? '-'}
                        {log.unit_number ? ` (${log.unit_number})` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(log.timestamp)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No vehicle logs found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'visitors', label: 'Visitors' },
    { key: 'staff', label: 'Staff Logs' },
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
            filename={`gate-visitors-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'name', label: 'Visitor Name' },
              { key: 'phone', label: 'Phone' },
              { key: 'purpose', label: 'Purpose' },
              { key: 'unit_number', label: 'Unit' },
              { key: 'status', label: 'Status' },
              { key: 'check_in_time', label: 'Check In' },
              { key: 'check_out_time', label: 'Check Out' },
            ]}
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
      {activeTab === 'parcels' && renderParcelsTab()}
      {activeTab === 'vehicles' && renderVehiclesTab()}

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
