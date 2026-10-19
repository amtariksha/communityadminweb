'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { EyeOff, Save } from 'lucide-react';
import type { TenantSettings } from '@communityos/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { canChangeSettings } from './settings-access';
import { useSaveSetting } from './use-save-setting';

type Privacy = NonNullable<TenantSettings['billing_defaulters']>;

export function readPrivacy(saved: unknown): Privacy {
  const value = (saved ?? {}) as Partial<Privacy>;
  return { hide_phone: value.hide_phone === true, hide_email: value.hide_email === true };
}

/** Setup › Defaulters' privacy switches (INC-S12, INC-30): the Defaulters list then shows no phone / e-mail. */
export function DefaultersPrivacyCard(): ReactNode {
  const setting = useSaveSetting('billing_defaulters', 'Defaulters settings');
  const saved = readPrivacy(setting.saved);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<Privacy>(saved);
  useEffect(() => setForm(saved), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = canChangeSettings();

  return (
    <Card id="defaulters-privacy">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Defaulters list
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset disabled={!editable} className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hide_phone} onChange={(e) => setForm((p) => ({ ...p, hide_phone: e.target.checked }))} />
            Do not show phone numbers on the Defaulters page
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.hide_email} onChange={(e) => setForm((p) => ({ ...p, hide_email: e.target.checked }))} />
            Do not show e-mail addresses on the Defaulters page
          </label>
        </fieldset>
        {editable && (
          <Button type="button" onClick={() => setting.save(form)} disabled={setting.saving || JSON.stringify(form) === savedKey}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
