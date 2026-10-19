'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  useSlots,
  useCreateSublet,
  useUnitMembers,
} from '@/hooks';
import { useUnits } from '@/hooks';
import { SLOT_PICKER_LIMIT } from '@/hooks/use-parking';

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

export function NewSubletDialog({ open, onOpenChange }: NewSubletDialogProps): ReactNode {
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
