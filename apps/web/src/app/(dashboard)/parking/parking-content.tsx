'use client';

import { useState, type ReactNode } from 'react';
import {
  Plus,
  Car,
  Zap,
  ParkingSquare,
  UserPlus,
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
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useSlotStats,
  useSlots,
  useCreateSublet,
  useCancelSublet,
  useSublets,
  useUnitMembers,
} from '@/hooks';
import { useUnits } from '@/hooks';
import { SLOT_PICKER_LIMIT } from '@/hooks/use-parking';
import type { ParkingSublet } from '@/hooks/use-parking';
import { SlotsTab } from './slots-tab';
import { VehiclesTab } from './vehicles-tab';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function subletStatusVariant(
  status: string,
): 'warning' | 'success' | 'secondary' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'active':
      return 'success';
    case 'expired':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Tab constants
// ---------------------------------------------------------------------------

type Tab = 'slots' | 'vehicles' | 'sublets';

const TABS: { key: Tab; label: string }[] = [
  { key: 'slots', label: 'Slots' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'sublets', label: 'Sublets' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ParkingContent(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>('slots');

  // Stats
  const statsQuery = useSlotStats();
  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Parking' }]}
        title="Parking"
        description="Manage parking slots, vehicle registration, and subletting"
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                <ParkingSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">All parking slots</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                <UserPlus className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.assigned ?? 0}</div>
                <p className="text-xs text-muted-foreground">Currently occupied</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vacant</CardTitle>
                <ParkingSquare className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.vacant ?? 0}</div>
                <p className="text-xs text-muted-foreground">Available for assignment</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">EV-Enabled</CardTitle>
                <Zap className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.ev_enabled ?? 0}</div>
                <p className="text-xs text-muted-foreground">Slots with EV charger</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

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
      {activeTab === 'slots' && <SlotsTab />}
      {activeTab === 'vehicles' && <VehiclesTab />}
      {activeTab === 'sublets' && <SubletsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sublets Tab
// ---------------------------------------------------------------------------

function SubletsTab(): ReactNode {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  const subletsQuery = useSublets({
    status: statusFilter || undefined,
  });
  const cancelSublet = useCancelSublet();

  const sublets = subletsQuery.data ?? [];

  // QA #357-admin — New Sublet dialog state. Mounted at the tab
  // level so the dialog form re-mounts (and resets) every time
  // the admin opens it.
  const [createOpen, setCreateOpen] = useState(false);

  function handleCancel(id: string): void {
    if (
      !window.confirm(
        'Cancel this sublet? The slot returns to the original owner.',
      )
    ) {
      return;
    }
    cancelSublet.mutate(id, {
      onSuccess() {
        addToast({ title: 'Sublet cancelled', variant: 'success' });
      },
      onError(err) {
        addToast({
          title: 'Failed to cancel sublet',
          description: friendlyError(err),
          variant: 'destructive',
        });
      },
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sublets</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Sublet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Sublettee</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Monthly Charge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subletsQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sublets.length > 0 ? (
                sublets.map((sublet) => (
                  <TableRow key={sublet.id}>
                    <TableCell className="font-mono text-xs">{sublet.slot_number ?? '-'}</TableCell>
                    <TableCell>{sublet.owner_name ?? '-'}</TableCell>
                    <TableCell>{sublet.sublettee_name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sublet.start_date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sublet.end_date ? formatDate(sublet.end_date) : 'Ongoing'}
                    </TableCell>
                    <TableCell>{formatCurrency(sublet.monthly_charge)}</TableCell>
                    <TableCell>
                      <Badge variant={subletStatusVariant(sublet.status)}>
                        {sublet.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* Cancel only meaningful for active rows;
                          backend rejects pending / cancelled / expired
                          attempts anyway. Hide the button to make the
                          UI honest. */}
                      {(sublet.status === 'active' || sublet.status === 'pending') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(sublet.id)}
                          disabled={
                            cancelSublet.isPending && cancelSublet.variables === sublet.id
                          }
                        >
                          {cancelSublet.isPending && cancelSublet.variables === sublet.id
                            ? 'Cancelling…'
                            : 'Cancel'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No sublets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Sublet dialog — extracted so the form state stays
          local and resets whenever the admin re-opens it. */}
      <NewSubletDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------
// New Sublet dialog (QA #357-admin)
// ---------------------------------------------------------------------------
//
// Admin creates a sublet on behalf of an owner. Pickers:
//   - Slot — any assigned (non-vacant) slot the admin can see.
//     The owner_member_id is derived server-side from the slot's
//     current assignee.
//   - Sublettee — a member of any unit (unit picker first → member
//     picker gated on unitId via useUnitMembers). The same
//     pattern as the amenity-booking dialog shipped in 8d96cd8.
//   - Date range — start_date required, end_date optional
//     (ongoing).
//   - Monthly charge — optional; backend defaults 0 if omitted.

interface NewSubletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NewSubletDialog({ open, onOpenChange }: NewSubletDialogProps): ReactNode {
  const { addToast } = useToast();
  const createSublet = useCreateSublet();

  // Only assigned slots can be sublet — vacant ones don't have an
  // owner to sublet from. We query both then filter; a future
  // backend `?status=assigned` filter could shrink the payload.
  const slotsQuery = useSlots({ status: 'assigned', limit: SLOT_PICKER_LIMIT });
  const unitsQuery = useUnits({ limit: 1000 });

  const [slotId, setSlotId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyCharge, setMonthlyCharge] = useState('');

  const membersQuery = useUnitMembers(unitId);
  const members = membersQuery.data ?? [];
  // useSlots unwraps to ParkingSlot[]; useUnits returns the
  // {data, total} envelope. Mind the asymmetry.
  const slots = slotsQuery.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  // Reset form when the dialog opens (avoids stale state from a
  // prior open). Don't reset on close so a failed save lets the
  // admin tweak and retry.
  useState(() => {
    if (!open) return;
    setSlotId('');
    setUnitId('');
    setMemberId('');
    setStartDate('');
    setEndDate('');
    setMonthlyCharge('');
  });

  function validate(): string | null {
    if (!slotId) return 'Please pick a slot.';
    if (!memberId) return 'Please pick a sublettee.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      return 'Start date is required.';
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return 'End date must be YYYY-MM-DD.';
    if (endDate && endDate < startDate)
      return 'End date must be on or after start date.';
    return null;
  }

  function handleSubmit(): void {
    const err = validate();
    if (err) {
      addToast({ title: err, variant: 'destructive' });
      return;
    }
    const charge = monthlyCharge ? Number(monthlyCharge) : undefined;
    if (charge !== undefined && (!Number.isFinite(charge) || charge < 0)) {
      addToast({
        title: 'Monthly charge must be zero or positive',
        variant: 'destructive',
      });
      return;
    }
    createSublet.mutate(
      {
        parking_slot_id: slotId,
        sublettee_member_id: memberId,
        start_date: startDate,
        end_date: endDate || undefined,
        monthly_charge: charge,
      },
      {
        onSuccess() {
          addToast({ title: 'Sublet created', variant: 'success' });
          onOpenChange(false);
        },
        onError(error) {
          addToast({
            title: 'Failed to create sublet',
            description: friendlyError(error),
            variant: 'destructive',
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Parking Sublet</DialogTitle>
          <DialogDescription>
            Sublet an assigned slot to another society member for a
            date range.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ns-slot">Slot</Label>
            <Select
              id="ns-slot"
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
            >
              <option value="">Select an assigned slot</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.slot_number}
                  {s.member_name ? ` · ${s.member_name}` : ''}
                  {s.unit_number ? ` · Unit ${s.unit_number}` : ''}
                </option>
              ))}
            </Select>
            {slotsQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Loading slots…</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ns-unit">Sublettee unit</Label>
              <Select
                id="ns-unit"
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  setMemberId('');
                }}
              >
                <option value="">Select a unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number}
                    {u.block ? ` · Block ${u.block}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ns-member">Sublettee</Label>
              <Select
                id="ns-member"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                disabled={!unitId || membersQuery.isLoading}
              >
                <option value="">
                  {!unitId
                    ? 'Pick a unit first'
                    : membersQuery.isLoading
                      ? 'Loading…'
                      : members.length === 0
                        ? 'No members in this unit'
                        : 'Select a member'}
                </option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? 'Unnamed'} · {m.member_type}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ns-start">Start date</Label>
              <Input
                id="ns-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ns-end">End date (optional)</Label>
              <Input
                id="ns-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Leave blank for ongoing"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ns-charge">Monthly charge (₹)</Label>
            <Input
              id="ns-charge"
              type="number"
              min={0}
              value={monthlyCharge}
              onChange={(e) => setMonthlyCharge(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for free sublet. Charges are paid by the
              sublettee to the society or owner per the tenant's
              policy.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={createSublet.isPending}>
            {createSublet.isPending ? 'Creating…' : 'Create Sublet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
