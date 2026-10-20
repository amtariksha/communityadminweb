'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FormFieldsInput, filledValues } from '@/components/society-fields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useStartMoveOut } from '@/hooks/use-move-outs';
import type { FieldValue } from '@/hooks/use-resident-fields';
import { useUnitMembers, useUnits } from '@/hooks/use-units';
import { friendlyError } from '@/lib/api-error';
import { earliestExitDate, startMoveOutError, type StartMoveOutValues } from './start-move-out-rules';

/** A member chosen already (Start Move-Out on the resident record). */
export interface StartMoveOutPreset {
  unitId: string;
  unitLabel: string;
  memberId: string;
  memberName: string;
  memberType: 'owner' | 'tenant';
}

const SELECT_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

function UnitAndMember(props: { values: StartMoveOutValues; onChange: (patch: Partial<StartMoveOutValues>) => void }): ReactNode {
  const [search, setSearch] = useState('');
  const units = useUnits({ search: search || undefined, limit: 20 });
  const members = useUnitMembers(props.values.unitId);
  // GET /units/:id/members lists the unit's members; past ones carry is_current = false.
  const leaving = (members.data ?? []).filter(
    (m) => (m as { is_current?: boolean }).is_current !== false && (m.member_type === 'owner' || m.member_type === 'tenant'),
  );
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="move-out-unit-search">Unit</Label>
        <Input id="move-out-unit-search" placeholder="Search unit number" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Unit" className={SELECT_CLASS} value={props.values.unitId} onChange={(e) => props.onChange({ unitId: e.target.value, memberId: '', memberType: null })}>
          <option value="">Select a unit…</option>
          {(units.data?.data ?? []).map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.block ? `${unit.block}-${unit.unit_number}` : unit.unit_number}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="move-out-member">Member</Label>
        <select
          id="move-out-member"
          className={SELECT_CLASS}
          value={props.values.memberId}
          disabled={!props.values.unitId}
          onChange={(e) => {
            const member = leaving.find((m) => m.id === e.target.value);
            props.onChange({ memberId: e.target.value, memberType: (member?.member_type as 'owner' | 'tenant' | undefined) ?? null });
          }}
        >
          <option value="">Select the owner or tenant…</option>
          {leaving.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? 'Unnamed'} ({member.member_type === 'tenant' ? 'Tenant' : 'Owner'})
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

const blankValues = (preset?: StartMoveOutPreset): StartMoveOutValues => ({
  unitId: preset?.unitId ?? '',
  memberId: preset?.memberId ?? '',
  memberType: preset?.memberType ?? null,
  exitDate: '',
  reason: '',
});

/**
 * Start Move-Out (MOVE-16, MOVE-S11's form): unit, the owner or tenant
 * leaving, exit date (at most 30 days back), reason and the society's
 * move-out fields. The society starts it approved; the NOC steps follow.
 */
export function StartMoveOutDialog({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: StartMoveOutPreset }): ReactNode {
  const start = useStartMoveOut();
  const { addToast } = useToast();
  const [values, setValues] = useState<StartMoveOutValues>(() => blankValues(preset));
  const [fields, setFields] = useState<Record<string, FieldValue>>({});
  const patch = (next: Partial<StartMoveOutValues>) => setValues((current) => ({ ...current, ...next }));

  useEffect(() => {
    if (open) {
      setValues(blankValues(preset));
      setFields({});
    }
  }, [open, preset]);

  const error = startMoveOutError(values);
  const submit = () =>
    start.mutate(
      { unit_id: values.unitId, member_id: values.memberId, exit_date: values.exitDate, reason: values.reason.trim() || undefined, fields: filledValues(fields) },
      {
        onSuccess: () => {
          addToast({ title: 'Move-out started', description: 'It is in NOC Initiated.', variant: 'success' });
          onClose();
        },
        onError: (failure) => addToast({ title: 'Could not start the move-out', description: friendlyError(failure), variant: 'destructive' }),
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start Move-Out</DialogTitle>
          <DialogDescription>{preset ? `${preset.memberName} · ${preset.unitLabel}` : 'For a current owner or tenant'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {!preset && <UnitAndMember values={values} onChange={patch} />}
          <div className="space-y-1">
            <Label htmlFor="move-out-date">Exit Date</Label>
            <Input id="move-out-date" type="date" min={earliestExitDate()} value={values.exitDate} onChange={(e) => patch({ exitDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="move-out-reason">Reason</Label>
            <Textarea id="move-out-reason" rows={2} maxLength={500} value={values.reason} onChange={(e) => patch({ reason: e.target.value })} />
          </div>
          {values.memberType && (
            <FormFieldsInput phase="out" applies={values.memberType} values={fields} onChange={(key, value) => setFields((c) => ({ ...c, [key]: value }))} />
          )}
          {error && values.exitDate && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" disabled={Boolean(error) || start.isPending} onClick={submit}>
            {start.isPending ? 'Starting…' : 'Start Move-Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
