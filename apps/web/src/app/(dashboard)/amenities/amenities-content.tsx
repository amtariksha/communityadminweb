'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Plus, Pencil, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ExportButton } from '@/components/ui/export-button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  useAmenities,
  useAmenityBookings,
  useCreateAmenity,
  useUpdateAmenity,
  useCancelBooking,
} from '@/hooks';
import type { Amenity, AmenityBooking, AmenityBookingFilters } from '@/hooks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AMENITY_TYPES = [
  'clubhouse',
  'party_hall',
  'guest_room',
  'gym',
  'pool',
  'tennis_court',
  'community_hall',
  'terrace',
  'ev_charger',
] as const;

const PRICING_TYPES = ['free', 'hourly', 'per_slot', 'per_day'] as const;

const BOOKING_STATUSES = ['confirmed', 'cancelled', 'completed', 'no_show'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function amenityTypeIcon(type: string): string {
  switch (type) {
    case 'clubhouse':
      return '\u{1F3E0}';
    case 'party_hall':
      return '\u{1F389}';
    case 'guest_room':
      return '\u{1F6CF}\uFE0F';
    case 'gym':
      return '\u{1F4AA}';
    case 'pool':
      return '\u{1F3CA}';
    case 'tennis_court':
      return '\u{1F3BE}';
    case 'community_hall':
      return '\u{1F3DB}\uFE0F';
    case 'terrace':
      return '\u{1F307}';
    case 'ev_charger':
      return '\u26A1';
    default:
      return '\u{1F3E2}';
  }
}

function formatAmenityType(type: string | null | undefined): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPricingType(type: string | null | undefined): string {
  if (!type) return '—';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function bookingStatusVariant(
  status: string,
): 'success' | 'destructive' | 'secondary' | 'warning' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'secondary';
    case 'no_show':
      return 'warning';
    default:
      return 'secondary';
  }
}

function formatBookingStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'amenities' | 'bookings';

const TABS: { key: Tab; label: string }[] = [
  { key: 'amenities', label: 'Amenities' },
  { key: 'bookings', label: 'Bookings' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AmenitiesContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>('amenities');
  const [createOpen, setCreateOpen] = useState(false);

  // Amenities data for export
  const allAmenitiesQuery = useAmenities();
  const allAmenities = allAmenitiesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Amenities' }]}
        title="Amenities"
        description="Manage community amenities and bookings"
        actions={
          <>
            <ExportButton
              data={allAmenities as unknown as Record<string, unknown>[]}
              filename={`amenities-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'amenity_type', label: 'Type' },
                { key: 'pricing_type', label: 'Pricing' },
                { key: 'rate', label: 'Rate' },
                { key: 'is_active', label: 'Active' },
              ]}
            />
            {activeTab === 'amenities' && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Amenity
              </Button>
            )}
          </>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'amenities' && (
        <AmenitiesTab createOpen={createOpen} setCreateOpen={setCreateOpen} />
      )}
      {activeTab === 'bookings' && <BookingsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Amenities Tab
// ---------------------------------------------------------------------------

interface AmenitiesTabProps {
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
}

function AmenitiesTab({ createOpen, setCreateOpen }: AmenitiesTabProps): ReactNode {
  const { addToast } = useToast();

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('clubhouse');
  const [formLocation, setFormLocation] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formPricingType, setFormPricingType] = useState('free');
  const [formPrice, setFormPrice] = useState('');
  const [formDeposit, setFormDeposit] = useState('');
  const [formRules, setFormRules] = useState('');

  const amenitiesQuery = useAmenities();
  const createMutation = useCreateAmenity();
  const updateMutation = useUpdateAmenity();

  const amenities = amenitiesQuery.data?.data ?? [];

  function resetForm(): void {
    setFormName('');
    setFormType('clubhouse');
    setFormLocation('');
    setFormCapacity('');
    setFormPricingType('free');
    setFormPrice('');
    setFormDeposit('');
    setFormRules('');
  }

  function openEdit(amenity: Amenity): void {
    setEditingAmenity(amenity);
    setFormName(amenity.name);
    setFormType(amenity.type);
    setFormLocation(amenity.location ?? '');
    setFormCapacity(amenity.capacity !== null ? String(amenity.capacity) : '');
    setFormPricingType(amenity.pricing_type);
    setFormPrice(amenity.price ? String(amenity.price) : '');
    setFormDeposit(amenity.deposit ? String(amenity.deposit) : '');
    setFormRules(amenity.rules ?? '');
    setEditOpen(true);
  }

  function handleCreate(): void {
    if (!formName.trim()) {
      addToast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        name: formName.trim(),
        amenity_type: formType,
        location: formLocation.trim() || null,
        capacity: formCapacity ? Number(formCapacity) : null,
        pricing_type: formPricingType,
        price_per_unit: formPrice ? Number(formPrice) : undefined,
        deposit_amount: formDeposit ? Number(formDeposit) : undefined,
        rules: formRules.trim() || null,
      },
      {
        onSuccess() {
          addToast({ title: 'Amenity created', variant: 'success' });
          setCreateOpen(false);
          resetForm();
        },
        onError(error) {
          addToast({
            title: 'Failed to create amenity',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleUpdate(): void {
    if (!editingAmenity || !formName.trim()) {
      addToast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    updateMutation.mutate(
      {
        id: editingAmenity.id,
        name: formName.trim(),
        amenity_type: formType,
        location: formLocation.trim() || null,
        capacity: formCapacity ? Number(formCapacity) : null,
        pricing_type: formPricingType,
        price_per_unit: formPrice ? Number(formPrice) : undefined,
        deposit_amount: formDeposit ? Number(formDeposit) : undefined,
        rules: formRules.trim() || null,
      },
      {
        onSuccess() {
          addToast({ title: 'Amenity updated', variant: 'success' });
          setEditOpen(false);
          setEditingAmenity(null);
          resetForm();
        },
        onError(error) {
          addToast({
            title: 'Failed to update amenity',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleToggleActive(amenity: Amenity): void {
    updateMutation.mutate(
      { id: amenity.id, is_active: !amenity.is_active },
      {
        onSuccess() {
          addToast({
            title: `${amenity.name} ${amenity.is_active ? 'deactivated' : 'activated'}`,
            variant: 'success',
          });
        },
        onError(error) {
          addToast({
            title: 'Failed to update amenity',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  function handleCreateDialogChange(open: boolean): void {
    setCreateOpen(open);
    if (!open) resetForm();
  }

  function handleEditDialogChange(open: boolean): void {
    setEditOpen(open);
    if (!open) {
      setEditingAmenity(null);
      resetForm();
    }
  }

  const amenityFormContent = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="amenity-name">Name</Label>
        <Input
          id="amenity-name"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g. Swimming Pool"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amenity-type">Type</Label>
          <Select
            id="amenity-type"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
          >
            {AMENITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {amenityTypeIcon(t)} {formatAmenityType(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-capacity">Capacity</Label>
          <Input
            id="amenity-capacity"
            type="number"
            value={formCapacity}
            onChange={(e) => setFormCapacity(e.target.value)}
            placeholder="e.g. 50"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amenity-location">Location</Label>
        <Input
          id="amenity-location"
          value={formLocation}
          onChange={(e) => setFormLocation(e.target.value)}
          placeholder="e.g. Ground Floor, Block A"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amenity-pricing">Pricing Type</Label>
          <Select
            id="amenity-pricing"
            value={formPricingType}
            onChange={(e) => setFormPricingType(e.target.value)}
          >
            {PRICING_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatPricingType(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-price">Price</Label>
          <Input
            id="amenity-price"
            type="number"
            value={formPrice}
            onChange={(e) => setFormPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amenity-deposit">Deposit</Label>
          <Input
            id="amenity-deposit"
            type="number"
            value={formDeposit}
            onChange={(e) => setFormDeposit(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amenity-rules">Rules</Label>
        <Textarea
          id="amenity-rules"
          value={formRules}
          onChange={(e) => setFormRules(e.target.value)}
          placeholder="Usage rules and guidelines..."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amenitiesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : amenities.length > 0 ? (
                amenities.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell className="font-medium">{amenity.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{amenityTypeIcon(amenity.type)}</span>
                        <span>{formatAmenityType(amenity.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {amenity.location ?? '-'}
                    </TableCell>
                    <TableCell>{amenity.capacity ?? '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="capitalize">
                          {formatPricingType(amenity.pricing_type)}
                        </span>
                        {amenity.pricing_type !== 'free' && amenity.price > 0 && (
                          <span className="text-muted-foreground">
                            {' '}
                            - {formatCurrency(amenity.price)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={amenity.is_active ? 'success' : 'secondary'}>
                        {amenity.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(amenity)}
                          title="Edit amenity"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleActive(amenity)}
                          title={amenity.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {amenity.is_active ? (
                            <X className="h-4 w-4 text-red-500" />
                          ) : (
                            <span className="text-green-500 text-xs font-bold">ON</span>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No amenities found. Add amenities to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create amenity dialog */}
      <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Amenity</DialogTitle>
            <DialogDescription>Create a new community amenity</DialogDescription>
          </DialogHeader>
          {amenityFormContent}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit amenity dialog */}
      <Dialog open={editOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Amenity</DialogTitle>
            <DialogDescription>
              Update amenity details for {editingAmenity?.name}
            </DialogDescription>
          </DialogHeader>
          {amenityFormContent}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bookings Tab — Calendar View
// ---------------------------------------------------------------------------

/** Consistent color per amenity type for calendar dots */
const AMENITY_TYPE_COLORS: Record<string, string> = {
  clubhouse: 'bg-blue-500',
  party_hall: 'bg-purple-500',
  guest_room: 'bg-amber-500',
  gym: 'bg-green-500',
  pool: 'bg-cyan-500',
  tennis_court: 'bg-lime-500',
  community_hall: 'bg-indigo-500',
  terrace: 'bg-orange-500',
  ev_charger: 'bg-yellow-500',
};

function amenityColor(type: string): string {
  return AMENITY_TYPE_COLORS[type] ?? 'bg-gray-400';
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Build the 6-row calendar grid for a given month (0-indexed) */
function buildCalendarDays(year: number, month: number): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Fill leading days from previous month
  for (let idx = startDayOfWeek - 1; idx >= 0; idx--) {
    const prevDate = new Date(year, month, -idx);
    days.push({ date: prevDate, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    days.push({ date: new Date(year, month, day), isCurrentMonth: true });
  }

  // Fill trailing days to complete last row (always fill to 42 = 6 rows)
  const remaining = 42 - days.length;
  for (let idx = 1; idx <= remaining; idx++) {
    days.push({ date: new Date(year, month + 1, idx), isCurrentMonth: false });
  }

  return days;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function BookingsTab(): ReactNode {
  const { addToast } = useToast();
  const today = useMemo(() => new Date(), []);

  // Calendar month navigation
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filters
  const [amenityFilter, setAmenityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Compute month date range for data fetching
  const monthStart = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return toDateKey(d);
  }, [viewYear, viewMonth]);

  const monthEnd = useMemo(() => {
    const d = new Date(viewYear, viewMonth + 1, 0);
    return toDateKey(d);
  }, [viewYear, viewMonth]);

  const filters: AmenityBookingFilters = {
    amenity_id: amenityFilter || undefined,
    status: statusFilter || undefined,
    date_from: monthStart,
    date_to: monthEnd,
    limit: 500,
  };

  const amenitiesQuery = useAmenities();
  const bookingsQuery = useAmenityBookings(filters);
  const cancelMutation = useCancelBooking();

  const amenities = amenitiesQuery.data?.data ?? [];
  const bookings = bookingsQuery.data?.data ?? [];

  // Build amenity lookup by id
  const amenityById = useMemo(() => {
    const map = new Map<string, Amenity>();
    for (const amenity of amenities) {
      map.set(amenity.id, amenity);
    }
    return map;
  }, [amenities]);

  // Group bookings by date key
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, AmenityBooking[]>();
    for (const booking of bookings) {
      const key = booking.date.slice(0, 10); // yyyy-mm-dd
      const existing = map.get(key);
      if (existing) {
        existing.push(booking);
      } else {
        map.set(key, [booking]);
      }
    }
    return map;
  }, [bookings]);

  // Calendar grid
  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // Bookings for the selected day
  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = toDateKey(selectedDate);
    return bookingsByDate.get(key) ?? [];
  }, [selectedDate, bookingsByDate]);

  // Navigation
  function goToPrevMonth(): void {
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth(): void {
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
    setSelectedDate(null);
  }

  function goToToday(): void {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(today);
  }

  // Cancel
  function openCancel(booking: AmenityBooking): void {
    setCancelTarget(booking);
    setCancelReason('');
    setCancelOpen(true);
  }

  function handleCancel(): void {
    if (!cancelTarget) return;

    cancelMutation.mutate(
      { id: cancelTarget.id, reason: cancelReason.trim() || undefined },
      {
        onSuccess() {
          addToast({ title: 'Booking cancelled', variant: 'success' });
          setCancelOpen(false);
          setCancelTarget(null);
          setCancelReason('');
        },
        onError(error) {
          addToast({
            title: 'Failed to cancel booking',
            description: error.message,
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <>
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="cal-amenity">Amenity</Label>
              <Select
                id="cal-amenity"
                value={amenityFilter}
                onChange={(e) => setAmenityFilter(e.target.value)}
              >
                <option value="">All Amenities</option>
                {amenities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-status">Status</Label>
              <Select
                id="cal-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatBookingStatus(s)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar + Detail panel layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Calendar grid — spans 2 cols on large screens */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {/* Month header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {bookingsQuery.isLoading ? (
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: 42 }).map((_, idx) => (
                  <div key={idx} className="min-h-[80px] rounded border border-border p-1">
                    <Skeleton className="mb-1 h-4 w-6" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((cell, idx) => {
                  const dateKey = toDateKey(cell.date);
                  const dayBookings = bookingsByDate.get(dateKey) ?? [];
                  const isToday = isSameDay(cell.date, today);
                  const isSelected = selectedDate !== null && isSameDay(cell.date, selectedDate);
                  const maxVisible = 3;
                  const overflow = dayBookings.length - maxVisible;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[80px] rounded border p-1.5 text-left transition-colors ${
                        cell.isCurrentMonth
                          ? 'bg-card hover:bg-accent/50'
                          : 'bg-muted/30 text-muted-foreground/50'
                      } ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-border'} ${
                        isToday ? 'border-primary/50' : ''
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          isToday ? 'bg-primary text-primary-foreground' : ''
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>
                      {dayBookings.length > 0 && (
                        <div className="mt-1 flex flex-col gap-0.5">
                          {dayBookings.slice(0, maxVisible).map((booking) => {
                            const amenity = amenityById.get(booking.amenity_id);
                            const dotColor = amenity ? amenityColor(amenity.type) : 'bg-gray-400';
                            return (
                              <div
                                key={booking.id}
                                className="flex items-center gap-1 truncate"
                                title={`${booking.amenity_name ?? 'Booking'} ${booking.start_time}-${booking.end_time}`}
                              >
                                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                                <span className="truncate text-[10px] leading-tight">
                                  {booking.amenity_name ?? 'Booking'}
                                </span>
                              </div>
                            );
                          })}
                          {overflow > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{overflow} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day detail side panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {selectedDate
                ? selectedDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Select a Day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Click on a day in the calendar to see bookings.
              </p>
            ) : selectedDayBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No bookings for this day.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDayBookings.map((booking) => {
                  const amenity = amenityById.get(booking.amenity_id);
                  return (
                    <div
                      key={booking.id}
                      className="rounded-lg border border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {amenity && (
                            <span className="text-base" title={formatAmenityType(amenity.type)}>
                              {amenityTypeIcon(amenity.type)}
                            </span>
                          )}
                          <span className="font-medium text-sm">
                            {booking.amenity_name ?? 'Unknown Amenity'}
                          </span>
                        </div>
                        <Badge variant={bookingStatusVariant(booking.status)}>
                          {formatBookingStatus(booking.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          {booking.start_time} &mdash; {booking.end_time}
                        </div>
                        {booking.unit_number && <div>Unit {booking.unit_number}</div>}
                        {booking.notes && <div>{booking.notes}</div>}
                        {booking.amount > 0 && <div>{formatCurrency(booking.amount)}</div>}
                      </div>
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700"
                          onClick={() => openCancel(booking)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel booking confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking for{' '}
              {cancelTarget?.amenity_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep Booking</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
