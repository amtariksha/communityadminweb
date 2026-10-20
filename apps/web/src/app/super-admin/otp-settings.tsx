'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useOtpProviderSettings,
  useUpdateOtpProviderSettings,
  type OtpField,
  type OtpProviderSettings,
  type OtpProviderUpdate,
  type OtpSettingState,
} from '@/hooks/use-otp-provider';
import { friendlyError } from '@/lib/api-error';

// Super admin › Platform settings › OTP & Messaging. Only the fields changed
// are sent: an untouched field the server environment provides stays out of
// the saved settings, and a secret is never shown or sent back.

interface FieldDef {
  field: OtpField;
  label: string;
  kind: 'text' | 'secret' | 'number' | 'select';
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

const SECTIONS: Array<{ title: string; fields: FieldDef[] }> = [
  {
    title: 'Channel',
    fields: [
      { field: 'primary', label: 'Primary Channel', kind: 'select', options: [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }], help: 'Tried first on sign-in; the other is the fallback.' },
      { field: 'sms_provider', label: 'SMS Provider', kind: 'select', options: [{ value: '2factor', label: '2Factor.in' }, { value: 'msg91', label: 'MSG91' }] },
    ],
  },
  {
    title: 'WhatsApp (Meta Cloud API)',
    fields: [
      { field: 'whatsapp_cloud.phoneNumberId', label: 'Phone Number ID', kind: 'text' },
      { field: 'whatsapp_cloud.accessToken', label: 'Access Token', kind: 'secret' },
      { field: 'whatsapp_cloud.templateName', label: 'Template Name', kind: 'text' },
    ],
  },
  {
    title: '2Factor.in (SMS OTP)',
    fields: [
      { field: '2factor.apiKeyHeader', label: 'API Key Header', kind: 'secret' },
      { field: '2factor.baseUrl', label: 'Base URL', kind: 'text' },
      { field: '2factor.apiKey', label: 'Account API Key', kind: 'secret' },
    ],
  },
  {
    title: 'MSG91 (SMS OTP)',
    fields: [
      { field: 'msg91.authKey', label: 'Auth Key', kind: 'secret' },
      { field: 'msg91.templateId', label: 'Template ID', kind: 'text' },
      { field: 'msg91.otpLength', label: 'OTP Length', kind: 'number' },
    ],
  },
];

const STATE_TEXT: Record<OtpSettingState, string> = {
  saved: 'Saved here',
  environment: 'Server environment',
  not_set: 'Not set',
};

const inputId = (field: OtpField): string => `otp-${field.replace(/\./g, '-')}`;

function FieldRow({ def, status, value, reset, onChange, onReset }: {
  def: FieldDef;
  status: OtpProviderSettings[OtpField];
  value: string;
  reset: boolean;
  onChange: (value: string) => void;
  onReset: (reset: boolean) => void;
}): ReactNode {
  const id = inputId(def.field);
  const state = reset ? 'Back to the server environment on save' : STATE_TEXT[status.source];
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{def.label}</Label>
      {def.kind === 'select' ? (
        <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {def.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      ) : (
        <Input
          id={id}
          type={def.kind === 'secret' ? 'password' : def.kind === 'number' ? 'number' : 'text'}
          autoComplete="off"
          value={value}
          placeholder={def.kind === 'secret' && status.source !== 'not_set' ? 'Leave blank to keep the one in use' : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid={`${id}-state`}>
        <span>{state}</span>
        {status.source === 'saved' && (
          <button type="button" className="underline" onClick={() => onReset(!reset)}>
            {reset ? 'Keep saved value' : 'Use server environment'}
          </button>
        )}
      </p>
      {def.help && <p className="text-xs text-muted-foreground">{def.help}</p>}
    </div>
  );
}

const shown = (def: FieldDef, settings: OtpProviderSettings): string =>
  def.kind === 'secret' ? '' : String(settings[def.field].value ?? '');

/** The fields typed or picked that differ from what is in use. */
function changesOf(edits: Partial<Record<OtpField, string>>, settings: OtpProviderSettings): OtpProviderUpdate['set'] {
  const defs = SECTIONS.flatMap((section) => section.fields);
  const entries = defs.flatMap((def) => {
    const typed = edits[def.field]?.trim();
    if (!typed || typed === shown(def, settings)) return [];
    return [[def.field, def.kind === 'number' ? Number(typed) : typed] as const];
  });
  return Object.fromEntries(entries);
}

function OtpForm({ settings }: { settings: OtpProviderSettings }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateOtpProviderSettings();
  const [edits, setEdits] = useState<Partial<Record<OtpField, string>>>({});
  const [resets, setResets] = useState<ReadonlySet<OtpField>>(new Set());

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const set = changesOf(edits, settings) ?? {};
    const body: OtpProviderUpdate = {
      ...(Object.keys(set).length > 0 ? { set } : {}),
      ...(resets.size > 0 ? { use_environment: [...resets].filter((field) => !(field in set)) } : {}),
    };
    update.mutate(body, {
      onSuccess: () => addToast({ title: 'OTP settings saved', variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  const toggleReset = (field: OtpField, reset: boolean): void =>
    setResets((current) => new Set([...current].filter((entry) => entry !== field).concat(reset ? [field] : [])));

  return (
    <form className="space-y-6" onSubmit={handleSubmit} aria-label="OTP & Messaging">
      <p className="text-sm text-muted-foreground">
        A value saved here is used instead of the server environment&apos;s; every field not saved comes from the
        server environment. Secrets are never shown.
      </p>
      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h4 className="text-sm font-semibold">{section.title}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((def) => (
              <FieldRow
                key={def.field}
                def={def}
                status={settings[def.field]}
                value={edits[def.field] ?? shown(def, settings)}
                reset={resets.has(def.field)}
                onChange={(value) => setEdits((current) => ({ ...current, [def.field]: value }))}
                onReset={(reset) => toggleReset(def.field, reset)}
              />
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {update.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

export function OtpSettings(): ReactNode {
  const query = useOtpProviderSettings();

  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError) {
    return <p className="text-sm text-destructive">Could not load the OTP settings: {friendlyError(query.error)}</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">OTP settings are not available yet on this server.</p>;
  }
  return <OtpForm key={JSON.stringify(query.data)} settings={query.data} />;
}
