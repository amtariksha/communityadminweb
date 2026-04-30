'use client';

import { useState, type ReactNode } from 'react';
import {
  Plus,
  Car,
  Bike,
  Zap,
  ParkingSquare,
  UserMinus,
  UserPlus,
  Trash2,
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
import { ExportButton } from '@/components/ui/export-button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useSlotStats,
  useSlots,
  useCreateSublet,
  useCancelSublet,
  useVehicles,
  useSublets,
  useCreateSlot,
  useAssignSlot,
  useDeallocateSlot,
  useRegisterVehicle,
  useUpdateVehicle,
  useRemoveVehicle,
  useUnitMembers,
} from '@/hooks';
import { useUnits } from '@/hooks';
import type { ParkingSlot, Vehicle, ParkingSublet } from '@/hooks/use-parking';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOT_TYPES = ['car', 'bike', 'both'] as const;
const VEHICLE_TYPES = ['car', 'bike', 'ev'] as const;

function slotTypeIcon(type: string): ReactNode {
  switch (type) {
    case 'car':
      return <Car className="h-4 w-4 text-blue-500" />;
    case 'bike':
      return <Bike className="h-4 w-4 text-green-500" />;
    default:
      return <ParkingSquare className="h-4 w-4 text-muted-foreground" />;
  }
}

function slotStatusVariant(
  status: string,
): 'secondary' | 'success' | 'warning' {
  switch (status) {
    case 'vacant':
      return 'secondary';
    case 'assigned':
      return 'success';
    case 'sublet':
      return 'warning';
    default:
      return 'secondary';
  }
}

function vehicleStatusVariant(isActive: boolean): 'success' | 'secondary' {
  return isActive ? 'success' : 'secondary';
}

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

  // Slots data for export
  const allSlotsQuery = useSlots();
  const allSlots = allSlotsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Parking' }]}
        title="Parking"
        description="Manage parking slots, vehicle registration, and subletting"
        actions={
          <ExportButton
            data={allSlots as unknown as Record<string, unknown>[]}
            filename={`parking-slots-${new Date().toISOString().split('T')[0]}`}
            columns={[
              { key: 'slot_number', label: 'Slot #' },
              { key: 'slot_type', label: 'Type' },
              { key: 'floor', label: 'Floor' },
              { key: 'status', label: 'Status' },
              { key: 'assigned_unit', label: 'Assigned Unit' },
            ]}
          />
        }
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
// Slots Tab
// ---------------------------------------------------------------------------

function SlotsTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  // Create form state
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [newSlotType, setNewSlotType] = useState('car');
  const [newLocation, setNewLocation] = useState('');
  const [newEvCharger, setNewEvCharger] = useState(false);
  const [newMonthlyCharge, setNewMonthlyCharge] = useState('');

  // Assign form state
  const [assignUnitId, setAssignUnitId] = useState('');

  const slotsQuery = useSlots({
    slot_type: typeFilter || undefined,
  });
  const unitsQuery = useUnits();
  const createMutation = useCreateSlot();
  const assignMutation = useAssignSlot();
  const deallocateMutation = useDeallocateSlot();

  const slots = slotsQuery.data ?? [];
  const units = unitsQuery.data?.data ?? [];

  function handleCreate(): void {
    if (!newSlotNumber.trim()) {
      addToast({ title: 'Slot number is required', variant: 'destructive' });
      return;
    }

    createMutation.mutate(
      {
        slot_number: newSlotNumber.trim(),
        slot_type: newSlotType,
        location: newLocation.trim() || null,
        has_ev_charger: newEvCharger,
        monthly_charge: newMonthlyCharge ? Number(newMonthlyCharge) : undefined,
      },
      {
        onSuccess() {
          addToast({ title: 'Slot created', variant: 'success' });
          setCreateOpen(false);
          setNewSlotNumber('');
          setNewSlotType('car');
          setNewLocation('');
          setNewEvCharger(false);
          setNewMonthlyCharge('');
        },
        onError(error) {
          addToast({ title: 'Failed to create slot', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleAssign(): void {
    if (!selectedSlot || !assignUnitId) {
      addToast({ title: 'Unit is required', variant: 'destructive' });
      return;
    }

    assignMutation.mutate(
      { id: selectedSlot.id, unit_id: assignUnitId },
      {
        onSuccess() {
          addToast({ title: 'Slot assigned', variant: 'success' });
          setAssignOpen(false);
          setSelectedSlot(null);
          setAssignUnitId('');
        },
        onError(error) {
          addToast({ title: 'Failed to assign slot', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleDeallocate(slot: ParkingSlot): void {
    deallocateMutation.mutate(slot.id, {
      onSuccess() {
        addToast({ title: `Slot ${slot.slot_number} deallocated`, variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to deallocate', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  function openAssign(slot: ParkingSlot): void {
    setSelectedSlot(slot);
    setAssignUnitId('');
    setAssignOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Parking Slots</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {SLOT_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Slot
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slot #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>EV Charger</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slotsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : slots.length > 0 ? (
              slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-mono text-xs">{slot.slot_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {slotTypeIcon(slot.slot_type)}
                      <span className="capitalize">{slot.slot_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{slot.location ?? '-'}</TableCell>
                  <TableCell>{slot.unit_number ?? '-'}</TableCell>
                  <TableCell>{slot.member_name ?? '-'}</TableCell>
                  <TableCell>
                    {slot.has_ev_charger ? (
                      <Zap className="h-4 w-4 text-blue-500" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={slotStatusVariant(slot.status)}>
                      {slot.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {slot.status === 'vacant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openAssign(slot)}
                          title="Assign to unit"
                        >
                          <UserPlus className="h-4 w-4 text-green-500" />
                        </Button>
                      )}
                      {slot.status === 'assigned' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDeallocate(slot)}
                          title="Deallocate"
                        >
                          <UserMinus className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No parking slots found. Add slots to start managing parking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create slot dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Parking Slot</DialogTitle>
            <DialogDescription>Create a new parking slot</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="slot-number">Slot Number</Label>
              <Input
                id="slot-number"
                value={newSlotNumber}
                onChange={(e) => setNewSlotNumber(e.target.value)}
                placeholder="e.g. A-01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-type">Type</Label>
              <Select
                id="slot-type"
                value={newSlotType}
                onChange={(e) => setNewSlotType(e.target.value)}
              >
                {SLOT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-location">Location</Label>
              <Input
                id="slot-location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Basement 1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ev-charger"
                type="checkbox"
                checked={newEvCharger}
                onChange={(e) => setNewEvCharger(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="ev-charger">Has EV Charger</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-charge">Monthly Charge</Label>
              <Input
                id="monthly-charge"
                type="number"
                value={newMonthlyCharge}
                onChange={(e) => setNewMonthlyCharge(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
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

      {/* Assign slot dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Slot {selectedSlot?.slot_number}</DialogTitle>
            <DialogDescription>Assign this parking slot to a unit</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assign-unit">Unit</Label>
              <Select
                id="assign-unit"
                value={assignUnitId}
                onChange={(e) => setAssignUnitId(e.target.value)}
              >
                <option value="">Select unit...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Vehicles Tab
// ---------------------------------------------------------------------------

function VehiclesTab(): ReactNode {
  const { addToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');

  // Create form state
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('car');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newUnitId, setNewUnitId] = useState('');
  const [newSlotId, setNewSlotId] = useState('');
  const [newSticker, setNewSticker] = useState('');

  const vehiclesQuery = useVehicles({
    vehicle_type: typeFilter || undefined,
  });
  const unitsQuery = useUnits();
  const slotsQuery = useSlots({ status: 'vacant' });
  const unitMembersQuery = useUnitMembers(newUnitId);
  const unitMembers = unitMembersQuery.data ?? [];
  const registerMutation = useRegisterVehicle();
  const removeMutation = useRemoveVehicle();

  const vehicles = vehiclesQuery.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const vacantSlots = slotsQuery.data ?? [];

  function handleRegister(): void {
    if (!newRegNumber.trim() || !newMemberId || !newUnitId) {
      addToast({ title: 'Registration number, member, and unit are required', variant: 'destructive' });
      return;
    }

    registerMutation.mutate(
      {
        registration_number: newRegNumber.trim(),
        vehicle_type: newVehicleType,
        make: newMake.trim() || null,
        model: newModel.trim() || null,
        color: newColor.trim() || null,
        member_id: newMemberId,
        unit_id: newUnitId,
        parking_slot_id: newSlotId || null,
        sticker_number: newSticker.trim() || null,
      },
      {
        onSuccess() {
          addToast({ title: 'Vehicle registered', variant: 'success' });
          setCreateOpen(false);
          setNewRegNumber('');
          setNewVehicleType('car');
          setNewMake('');
          setNewModel('');
          setNewColor('');
          setNewMemberId('');
          setNewUnitId('');
          setNewSlotId('');
          setNewSticker('');
        },
        onError(error) {
          addToast({ title: 'Failed to register vehicle', description: friendlyError(error), variant: 'destructive' });
        },
      },
    );
  }

  function handleRemove(vehicle: Vehicle): void {
    removeMutation.mutate(vehicle.id, {
      onSuccess() {
        addToast({ title: `Vehicle ${vehicle.registration_number} removed`, variant: 'success' });
      },
      onError(error) {
        addToast({ title: 'Failed to remove vehicle', description: friendlyError(error), variant: 'destructive' });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Vehicles</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Register Vehicle
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Make / Model</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Parking Slot</TableHead>
              <TableHead>Sticker #</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehiclesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono text-xs">{vehicle.registration_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {vehicle.vehicle_type === 'car' ? (
                        <Car className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Bike className="h-4 w-4 text-green-500" />
                      )}
                      <span className="capitalize">{vehicle.vehicle_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}
                  </TableCell>
                  <TableCell>{vehicle.color ?? '-'}</TableCell>
                  <TableCell>{vehicle.member_name ?? '-'}</TableCell>
                  <TableCell>{vehicle.unit_number ?? '-'}</TableCell>
                  <TableCell>{vehicle.slot_number ?? '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{vehicle.sticker_number ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={vehicleStatusVariant(vehicle.is_active)}>
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemove(vehicle)}
                      title="Remove vehicle"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No vehicles found. Register vehicles to start tracking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Register vehicle dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Vehicle</DialogTitle>
            <DialogDescription>Add a new vehicle to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reg-number">Registration Number</Label>
              <Input
                id="reg-number"
                value={newRegNumber}
                onChange={(e) => setNewRegNumber(e.target.value)}
                placeholder="e.g. KA-01-AB-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-type">Type</Label>
              <Select
                id="vehicle-type"
                value={newVehicleType}
                onChange={(e) => setNewVehicleType(e.target.value)}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-make">Make</Label>
                <Input
                  id="vehicle-make"
                  value={newMake}
                  onChange={(e) => setNewMake(e.target.value)}
                  placeholder="e.g. Maruti"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-model">Model</Label>
                <Input
                  id="vehicle-model"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. Swift"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-color">Color</Label>
              <Input
                id="vehicle-color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="e.g. White"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-unit">Unit</Label>
              <Select
                id="vehicle-unit"
                value={newUnitId}
                onChange={(e) => {
                  setNewUnitId(e.target.value);
                  setNewMemberId('');
                }}
              >
                <option value="">Select unit...</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-member">Member</Label>
              <Select
                id="vehicle-member"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                disabled={!newUnitId}
              >
                <option value="">{newUnitId ? 'Select member...' : 'Select a unit first'}</option>
                {unitMembers.map((member) => {
                  const label =
                    member.name ?? member.member_type ?? member.id.slice(0, 8);
                  return (
                    <option key={member.id} value={member.id}>
                      {label} ({member.member_type})
                    </option>
                  );
                })}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-slot">Parking Slot (optional)</Label>
              <Select
                id="vehicle-slot"
                value={newSlotId}
                onChange={(e) => setNewSlotId(e.target.value)}
              >
                <option value="">None</option>
                {vacantSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.slot_number} ({slot.slot_type})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-sticker">Sticker Number (optional)</Label>
              <Input
                id="vehicle-sticker"
                value={newSticker}
                onChange={(e) => setNewSticker(e.target.value)}
                placeholder="e.g. STK-001"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRegister} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Registering...' : 'Register'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
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
  const slotsQuery = useSlots({ status: 'assigned' });
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
