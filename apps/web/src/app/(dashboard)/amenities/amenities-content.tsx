'use client';

import { useState, type ReactNode } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
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

function formatAmenityType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPricingType(type: string): string {
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

function formatBookingStatus(status: string): string {
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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Amenities' }]}
        title="Amenities"
        description="Manage community amenities and bookings"
        actions={
          activeTab === 'amenities' ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Amenity
            </Button>
          ) : undefined
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
        type: formType,
        location: formLocation.trim() || null,
        capacity: formCapacity ? Number(formCapacity) : null,
        pricing_type: formPricingType,
        price: formPrice ? Number(formPrice) : undefined,
        deposit: formDeposit ? Number(formDeposit) : undefined,
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
        type: formType,
        location: formLocation.trim() || null,
        capacity: formCapacity ? Number(formCapacity) : null,
        pricing_type: formPricingType,
        price: formPrice ? Number(formPrice) : undefined,
        deposit: formDeposit ? Number(formDeposit) : undefined,
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
// Bookings Tab
// ---------------------------------------------------------------------------

function BookingsTab(): ReactNode {
  const { addToast } = useToast();

  // Filters
  const [amenityFilter, setAmenityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filters: AmenityBookingFilters = {
    amenity_id: amenityFilter || undefined,
    status: statusFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const amenitiesQuery = useAmenities();
  const bookingsQuery = useAmenityBookings(filters);
  const cancelMutation = useCancelBooking();

  const amenities = amenitiesQuery.data?.data ?? [];
  const bookings = bookingsQuery.data?.data ?? [];

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

  function handleClearFilters(): void {
    setAmenityFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking-amenity">Amenity</Label>
              <Select
                id="booking-amenity"
                value={amenityFilter}
                onChange={(e) => setAmenityFilter(e.target.value)}
              >
                <option value="">All</option>
                {amenities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-status">Status</Label>
              <Select
                id="booking-status"
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
            <div className="space-y-2">
              <Label htmlFor="booking-from">From</Label>
              <Input
                id="booking-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-to">To</Label>
              <Input
                id="booking-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amenity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.amenity_name ?? '-'}
                    </TableCell>
                    <TableCell>{booking.unit_number ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(booking.date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {booking.start_time} - {booking.end_time}
                    </TableCell>
                    <TableCell>
                      <Badge variant={bookingStatusVariant(booking.status)}>
                        {formatBookingStatus(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(booking.amount)}</TableCell>
                    <TableCell>
                      {booking.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openCancel(booking)}
                          title="Cancel booking"
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
