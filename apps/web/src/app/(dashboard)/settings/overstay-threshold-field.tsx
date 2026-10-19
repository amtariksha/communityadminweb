'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { getCurrentTenant, getUser } from '@/lib/auth';
import {
  OVERSTAY_MINUTES_MAX,
  OVERSTAY_MINUTES_MIN,
  useGateSettings,
  useUpdateGateSettings,
} from '@/hooks/use-gate-settings';

// Matches PATCH /tenant-settings/gate.
const WRITE_ROLES = new Set(['community_admin', 'committee_member', 'security_supervisor']);

function canChangeGateSettings(): boolean {
  const user = getUser();
  if (user?.isSuperAdmin) return true;
  const tenantId = getCurrentTenant();
  const role = user?.societies.find((s) => s.id === tenantId)?.role;
  return role !== undefined && WRITE_ROLES.has(role);
}

/** The error to show for a typed value, or null when it can be saved. */
export function overstayMinutesError(text: string): string | null {
  const minutes = Number(text);
  if (text.trim() === '' || !Number.isInteger(minutes)) return 'Enter a whole number of minutes.';
  if (minutes < OVERSTAY_MINUTES_MIN || minutes > OVERSTAY_MINUTES_MAX) {
    return `Between ${OVERSTAY_MINUTES_MIN} and ${OVERSTAY_MINUTES_MAX} minutes (24 hours).`;
  }
  return null;
}

/**
 * Settings › Gates: how long a visitor or staff member may stay inside before
 * guards and admins get an overstay alert (GATE-03). The sweep runs every
 * 15 minutes.
 */
export function OverstayThresholdField(): ReactNode {
  const { addToast } = useToast();
  const settingsQuery = useGateSettings();
  const update = useUpdateGateSettings();
  const saved = settingsQuery.data?.overstay_threshold_minutes;
  const [text, setText] = useState('');

  useEffect(() => {
    if (saved !== undefined) setText(String(saved));
  }, [saved]);

  if (settingsQuery.isLoading) return null;
  if (settingsQuery.data === null) {
    return <p className="text-sm text-muted-foreground">Overstay alert settings are not available yet.</p>;
  }
  if (saved === undefined) return null;

  const editable = canChangeGateSettings();
  const error = overstayMinutesError(text);
  const changed = text.trim() !== String(saved);

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (error) return;
    update.mutate(
      { overstay_threshold_minutes: Number(text) },
      {
        onSuccess: () => addToast({ title: 'Overstay alert saved', variant: 'success' }),
        onError: (failure) =>
          addToast({ title: 'Could not save the overstay alert', description: friendlyError(failure), variant: 'destructive' }),
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-4">
      <Label htmlFor="overstay-threshold">Overstay alert after (minutes)</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="overstay-threshold"
          type="number"
          inputMode="numeric"
          min={OVERSTAY_MINUTES_MIN}
          max={OVERSTAY_MINUTES_MAX}
          step={1}
          className="w-32"
          value={text}
          disabled={!editable}
          aria-invalid={changed && error !== null}
          onChange={(e) => setText(e.target.value)}
        />
        {editable && (
          <Button type="submit" size="sm" disabled={!changed || error !== null || update.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>
      {changed && error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Guards and admins are alerted when a visitor or staff member is still inside after this long.
        </p>
      )}
    </form>
  );
}
