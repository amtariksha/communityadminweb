'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { friendlyError } from '@/lib/api-error';
import { CHECKIN_ALERT_MAX, type GateSwitches } from '@/hooks/use-gate-settings';
import { BlockForm, NotAvailableYet, SetupBlock } from './setup-block';
import { readOptionalWholeNumber, textOf } from './number-setting';

interface CheckinAlertBlockProps {
  switches: GateSwitches | undefined;
  editable: boolean;
  save: (changes: Partial<GateSwitches>) => Promise<unknown>;
}

/** Block 2 — Visitor Check-in Alert (GATE-40): admins are told once a day when a flat has many visitors inside. */
export function CheckinAlertBlock({ switches, editable, save }: CheckinAlertBlockProps): ReactNode {
  return (
    <SetupBlock title="Visitor Check-in Alert">
      {switches ? (
        <CheckinAlertForm saved={switches.unit_checkin_alert_threshold} editable={editable} save={save} />
      ) : (
        <NotAvailableYet what="Visitor check-in alerts" />
      )}
    </SetupBlock>
  );
}

function CheckinAlertForm({
  saved,
  editable,
  save,
}: Omit<CheckinAlertBlockProps, 'switches'> & { saved: number | null }): ReactNode {
  const [text, setText] = useState(textOf(saved));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = readOptionalWholeNumber(text, 1, CHECKIN_ALERT_MAX, 'visitors');

  async function onSave(): Promise<void> {
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await save({ unit_checkin_alert_threshold: parsed.value });
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BlockForm editable={editable} dirty={text.trim() !== textOf(saved)} saving={saving} error={error} onSave={() => void onSave()}>
      <Label htmlFor="checkin-alert">Notify admin when checked-in visitors for one unit exceed</Label>
      <Input
        id="checkin-alert"
        type="number"
        inputMode="numeric"
        min={1}
        max={CHECKIN_ALERT_MAX}
        step={1}
        className="w-32"
        value={text}
        disabled={!editable}
        onChange={(event) => setText(event.target.value)}
      />
      <p className="text-sm text-muted-foreground">Leave empty for no alert. The admins are told once a day per flat.</p>
    </BlockForm>
  );
}
