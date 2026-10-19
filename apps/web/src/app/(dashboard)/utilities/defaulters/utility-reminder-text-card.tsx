'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useFinanceAccess } from '@/hooks/use-finance-access';
import { useSaveUtilityBilling, useUtilitySettings } from '@/hooks/use-utility-settings';
import { friendlyError } from '@/lib/api-error';
import { DEFAULT_UTILITY_REMINDER, PLACEHOLDER_HINT } from '@/app/(dashboard)/income/defaulters/reminder-template';

interface TextForm {
  reply_to: string;
  from_name: string;
  subject: string;
  message_html: string;
}

type SavedText = { reply_to?: string | null; from_name?: string | null; subject?: string; message_html?: string } | null | undefined;

export function readUtilityText(saved: SavedText): TextForm {
  return {
    reply_to: saved?.reply_to ?? '',
    from_name: saved?.from_name ?? '',
    subject: saved?.subject || DEFAULT_UTILITY_REMINDER.subject,
    message_html: saved?.message_html || DEFAULT_UTILITY_REMINDER.message_html,
  };
}

function TextFields({ form, set }: { form: TextForm; set: (key: keyof TextForm, value: string) => void }): ReactNode {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="utility-text-reply-to">Reply To</Label>
          <Input id="utility-text-reply-to" type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="utility-text-from">From</Label>
          <Input id="utility-text-from" maxLength={60} placeholder="The society's name" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="utility-text-subject">Subject</Label>
        <Input id="utility-text-subject" maxLength={150} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="utility-text-message">Message</Label>
        <Textarea id="utility-text-message" rows={8} value={form.message_html} onChange={(e) => set('message_html', e.target.value)} />
        <p className="text-xs text-muted-foreground">Placeholders: {PLACEHOLDER_HINT}.</p>
      </div>
    </>
  );
}

/**
 * The utility reminder text (UTIL-09): what the automatic utility reminders
 * (sent on the reminder days once a community admin switches reminders on)
 * and the Utility Defaulters composer start from. Saved by finance writers.
 */
export function UtilityReminderTextCard(): ReactNode {
  const { addToast } = useToast();
  const access = useFinanceAccess();
  const settings = useUtilitySettings();
  const saveText = useSaveUtilityBilling();
  const saved = readUtilityText(settings.data?.utility_billing?.reminder_template);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<TextForm>(saved);
  useEffect(() => setForm(saved), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: keyof TextForm, value: string): void => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.subject.trim() !== '' && form.message_html.trim() !== '';

  function save(): void {
    const reminder_template = {
      reply_to: form.reply_to.trim() || null,
      from_name: form.from_name.trim() || null,
      subject: form.subject.trim(),
      message_html: form.message_html,
    };
    saveText.mutate(
      { reminder_template },
      {
        onSuccess: () => addToast({ title: 'Utility reminder text saved', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Card id="utility-reminder-text">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Utility reminder text
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Used by the automatic utility reminders and as the starting text above. Maintenance reminders keep their own text (Income Tracker › Setup › Defaulters).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset disabled={!access.canWrite} className="space-y-3">
          <TextFields form={form} set={set} />
        </fieldset>
        {access.canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={!valid || saveText.isPending || JSON.stringify(form) === savedKey}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm({ ...form, ...DEFAULT_UTILITY_REMINDER })}>
              Use our text
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
