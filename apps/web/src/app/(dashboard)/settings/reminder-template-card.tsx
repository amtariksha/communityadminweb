'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_REMINDER, PLACEHOLDER_HINT } from '../income/defaulters/reminder-template';
import { readDuesReminders } from './dues-reminders';
import { canChangeSettings } from './settings-access';
import { useSaveSetting } from './use-save-setting';

interface TemplateForm {
  reply_to: string;
  from_name: string;
  subject: string;
  message_html: string;
}

export function readTemplate(saved: unknown): TemplateForm {
  const value = ((saved ?? {}) as { template?: Partial<TemplateForm> | null }).template ?? {};
  return {
    reply_to: value.reply_to ?? '',
    from_name: value.from_name ?? '',
    subject: value.subject || DEFAULT_REMINDER.subject,
    message_html: value.message_html || DEFAULT_REMINDER.message_html,
  };
}

/**
 * Setup › Defaulters › reminder text (INC-30): what the automatic reminders
 * and the Defaulters page's composer start from. Saved with the reminder
 * schedule (the settings save replaces the whole key).
 */
export function ReminderTemplateCard(): ReactNode {
  const setting = useSaveSetting('billing_reminders', 'Reminder text');
  const saved = readTemplate(setting.saved);
  const savedKey = JSON.stringify(saved);
  const [form, setForm] = useState<TemplateForm>(saved);
  useEffect(() => setForm(saved), [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = canChangeSettings();
  const set = (key: keyof TemplateForm, value: string): void => setForm((p) => ({ ...p, [key]: value }));
  const valid = form.subject.trim() !== '' && form.message_html.trim() !== '';

  function save(): void {
    const schedule = readDuesReminders(setting.saved);
    setting.save({
      ...schedule,
      template: {
        reply_to: form.reply_to.trim() || null,
        from_name: form.from_name.trim() || null,
        subject: form.subject.trim(),
        message_html: form.message_html,
      },
    });
  }

  return (
    <Card id="reminder-template">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reminder text
        </CardTitle>
        <p className="text-xs text-muted-foreground">Used by the automatic reminders and as the starting text on the Defaulters page.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <fieldset disabled={!editable} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="template-reply-to">Reply To</Label>
              <Input id="template-reply-to" type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="template-from">From</Label>
              <Input id="template-from" maxLength={60} placeholder="The society's name" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="template-subject">Subject</Label>
            <Input id="template-subject" maxLength={150} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="template-message">Message</Label>
            <Textarea id="template-message" rows={8} value={form.message_html} onChange={(e) => set('message_html', e.target.value)} />
            <p className="text-xs text-muted-foreground">Placeholders: {PLACEHOLDER_HINT}.</p>
          </div>
        </fieldset>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={!valid || setting.saving || JSON.stringify(form) === savedKey}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm({ ...form, subject: DEFAULT_REMINDER.subject, message_html: DEFAULT_REMINDER.message_html })}>
              Use our text
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
