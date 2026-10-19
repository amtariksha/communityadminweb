'use client';

import { useState, type ReactNode } from 'react';

export interface ServiceDateSettings {
  allow_resident_add_psd: boolean;
  allow_resident_edit_psd: boolean;
}

type SwitchKey = keyof ServiceDateSettings;

interface ServiceDateSwitchesProps {
  settings: ServiceDateSettings;
  canEdit: boolean;
  /** Saves one switch; a rejection puts the box back. */
  onSave: (update: Partial<ServiceDateSettings>) => Promise<void>;
}

const SWITCHES: ReadonlyArray<{ key: SwitchKey; heading: string; label: string }> = [
  {
    key: 'allow_resident_add_psd',
    heading: 'Preferred Service Date',
    label: 'Allow owners/tenants to add Preferred Service Date',
  },
  {
    key: 'allow_resident_edit_psd',
    heading: 'Edit Preferred Service Date',
    label: 'Allow owners/tenants to edit Preferred Service Date',
  },
];

/**
 * The two switches of HELP-S2. Each tick saves at once; when the save fails
 * the box goes back to what is stored. Admins can always set the date.
 */
export function ServiceDateSwitches({ settings, canEdit, onSave }: ServiceDateSwitchesProps): ReactNode {
  const [values, setValues] = useState<ServiceDateSettings>(settings);
  const [saving, setSaving] = useState<SwitchKey | null>(null);

  async function toggle(key: SwitchKey, checked: boolean): Promise<void> {
    const before = values[key];
    setValues((current) => ({ ...current, [key]: checked }));
    setSaving(key);
    try {
      await onSave({ [key]: checked });
    } catch {
      setValues((current) => ({ ...current, [key]: before }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {SWITCHES.map((entry) => (
        <section key={entry.key} className="space-y-2">
          <h3 className="text-sm font-semibold">{entry.heading}</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values[entry.key]}
              disabled={!canEdit || saving !== null}
              onChange={(event) => void toggle(entry.key, event.target.checked)}
            />
            {entry.label}
          </label>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">Admins can always set and change the date.</p>
    </div>
  );
}
