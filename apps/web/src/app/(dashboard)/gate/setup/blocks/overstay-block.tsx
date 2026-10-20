'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { friendlyError } from '@/lib/api-error';
import {
  AUTO_CHECKOUT_HOURS_MAX,
  OVERSTAY_MINUTES_MAX,
  OVERSTAY_MINUTES_MIN,
  type GateSettings,
  type GateSettingsChanges,
} from '@/hooks/use-gate-settings';
import { BlockForm, SetupBlock } from './setup-block';
import { readOptionalWholeNumber, textOf } from './number-setting';

interface OverstayBlockProps {
  settings: GateSettings;
  editable: boolean;
  save: (changes: GateSettingsChanges) => Promise<unknown>;
}

/** The changes to send, or the message to show. */
export function overstayChanges(
  settings: GateSettings,
  minutesText: string,
  hoursText: string,
): { changes: GateSettingsChanges } | { message: string } {
  const minutes = Number(minutesText);
  if (!Number.isInteger(minutes) || minutes < OVERSTAY_MINUTES_MIN || minutes > OVERSTAY_MINUTES_MAX) {
    return { message: `The overstay alert is ${OVERSTAY_MINUTES_MIN} to ${OVERSTAY_MINUTES_MAX} whole minutes.` };
  }
  const changes: GateSettingsChanges = {};
  if (minutes !== settings.overstay_threshold_minutes) changes.overstay_threshold_minutes = minutes;
  if (settings.gate_settings) {
    const hours = readOptionalWholeNumber(hoursText, 1, AUTO_CHECKOUT_HOURS_MAX, 'hours');
    if (!hours.ok) return { message: hours.message };
    if (hours.value !== settings.gate_settings.auto_checkout_hours) changes.gate_settings = { auto_checkout_hours: hours.value };
  }
  return { changes };
}

/** Block 10 — Overstay & Auto Check-Out (GATE-03, GATE-40). */
export function OverstayBlock({ settings, editable, save }: OverstayBlockProps): ReactNode {
  const [minutes, setMinutes] = useState(String(settings.overstay_threshold_minutes));
  const [hours, setHours] = useState(textOf(settings.gate_settings?.auto_checkout_hours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty =
    minutes.trim() !== String(settings.overstay_threshold_minutes) ||
    (settings.gate_settings !== undefined && hours.trim() !== textOf(settings.gate_settings.auto_checkout_hours));

  async function onSave(): Promise<void> {
    const result = overstayChanges(settings, minutes, hours);
    if ('message' in result) {
      setError(result.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await save(result.changes);
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SetupBlock title="Overstay & Auto Check-Out">
      <BlockForm editable={editable} dirty={dirty} saving={saving} error={error} onSave={() => void onSave()}>
        <Label htmlFor="overstay-minutes">Default overstay alert after (minutes)</Label>
        <Input
          id="overstay-minutes"
          type="number"
          inputMode="numeric"
          min={OVERSTAY_MINUTES_MIN}
          max={OVERSTAY_MINUTES_MAX}
          className="w-32"
          value={minutes}
          disabled={!editable}
          onChange={(event) => setMinutes(event.target.value)}
        />
        <p className="text-sm text-muted-foreground">Guards and admins are alerted when a visitor or staff member is still inside after this long.</p>
        {settings.gate_settings ? (
          <>
            <Label htmlFor="auto-checkout-hours">Auto check-out visitors after (hours)</Label>
            <Input
              id="auto-checkout-hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={AUTO_CHECKOUT_HOURS_MAX}
              className="w-32"
              value={hours}
              disabled={!editable}
              onChange={(event) => setHours(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">Leave empty to keep visitors inside until a guard checks them out.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Auto check-out is not available yet.</p>
        )}
      </BlockForm>
    </SetupBlock>
  );
}
