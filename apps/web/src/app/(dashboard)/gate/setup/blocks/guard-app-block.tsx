'use client';

import { useState, type ReactNode } from 'react';
import { friendlyError } from '@/lib/api-error';
import type { GateSwitches } from '@/hooks/use-gate-settings';
import { BlockForm, NotAvailableYet, SetupBlock } from './setup-block';

type Tick = 'capture_vehicle_details' | 'guard_may_call_resident' | 'block_visitor_photos';

const TICKS: ReadonlyArray<{ key: Tick; label: string; hint: string }> = [
  {
    key: 'capture_vehicle_details',
    label: 'Capture complete vehicle details',
    hint: 'The guard must enter the vehicle number for every walk-in, or tick "No vehicle".',
  },
  {
    key: 'guard_may_call_resident',
    label: 'Guard may call the resident',
    hint: 'Guards see the full phone number of the flat’s people; otherwise only the last four digits.',
  },
  {
    key: 'block_visitor_photos',
    label: 'Do not allow visitor photos',
    hint: 'Entry requests from the gate cannot carry a photo of the visitor.',
  },
];

interface GuardAppBlockProps {
  /** undefined when the API predates these switches. */
  switches: GateSwitches | undefined;
  editable: boolean;
  save: (changes: Partial<GateSwitches>) => Promise<unknown>;
}

/** Block 1 — Guard App Settings (GATE-40): what the guard app asks for and shows. */
export function GuardAppBlock({ switches, editable, save }: GuardAppBlockProps): ReactNode {
  return (
    <SetupBlock
      title="Guard App Settings"
      description="For the gate phone or tablet we recommend a steady connection of at least 2 Mbps (4G or Wi-Fi)."
    >
      {switches ? <GuardAppForm switches={switches} editable={editable} save={save} /> : <NotAvailableYet what="Guard app settings" />}
    </SetupBlock>
  );
}

function GuardAppForm({ switches, editable, save }: GuardAppBlockProps & { switches: GateSwitches }): ReactNode {
  const pick = (from: GateSwitches) => ({
    capture_vehicle_details: from.capture_vehicle_details,
    guard_may_call_resident: from.guard_may_call_resident,
    block_visitor_photos: from.block_visitor_photos,
  });
  const [values, setValues] = useState(pick(switches));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = TICKS.some(({ key }) => values[key] !== switches[key]);

  async function onSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await save(values);
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlockForm editable={editable} dirty={dirty} saving={saving} error={error} onSave={() => void onSave()}>
      {TICKS.map(({ key, label, hint }) => (
        <label key={key} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={values[key]}
            disabled={!editable}
            onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))}
          />
          <span>
            <span className="font-medium">{label}</span>
            <span className="block text-muted-foreground">{hint}</span>
          </span>
        </label>
      ))}
    </BlockForm>
  );
}
