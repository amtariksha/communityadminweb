'use client';

import { useState, type ReactNode } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useSendReminders } from '@/hooks/use-defaulters';
import { ApiError, friendlyError } from '@/lib/api-error';
import { PLACEHOLDER_HINT } from './reminder-template';

export interface ComposerValues {
  reply_to: string;
  from_name: string;
  subject: string;
  message_html: string;
}

/** The reminder composer under the Defaulters list (INC-S29): e-mail only until an SMS transport exists. */
export function ReminderComposer({ unitIds, initial, canSend }: { unitIds: string[]; initial: ComposerValues; canSend: boolean }): ReactNode {
  const { addToast } = useToast();
  const send = useSendReminders();
  const [values, setValues] = useState<ComposerValues>(initial);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (key: keyof ComposerValues, value: string): void => setValues((prev) => ({ ...prev, [key]: value }));

  function ask(): void {
    if (unitIds.length === 0) return setProblem('Select at least one unit.');
    if (!values.subject.trim() || !values.message_html.trim()) return setProblem('Enter a subject and a message.');
    setProblem(null);
    setConfirming(true);
  }

  async function submit(): Promise<void> {
    setConfirming(false);
    try {
      const result = await send.mutateAsync({
        unit_ids: unitIds,
        channel: 'email',
        reply_to: values.reply_to.trim() || undefined,
        from_name: values.from_name.trim() || undefined,
        subject: values.subject,
        message_html: values.message_html,
      });
      addToast({
        title: `Reminders: ${result.sent} sent`,
        description: `${result.skipped_no_email} without an e-mail address, ${result.failed} failed${result.no_dues ? `, ${result.no_dues} unit(s) no longer due` : ''}. See the Log.`,
        variant: result.failed > 0 ? 'destructive' : 'success',
      });
    } catch (error) {
      const missing = error instanceof ApiError && error.status === 404;
      setProblem(missing ? 'Sending reminders is not available yet on this server.' : friendlyError(error));
    }
  }

  return (
    <section aria-label="Send a reminder" className="space-y-3 rounded-md border p-4">
      <fieldset className="flex flex-wrap gap-6">
        <legend className="mb-1 text-sm font-medium">Channel</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="reminder-channel" checked readOnly />
          Email
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground" title="Not available yet">
          <input type="radio" name="reminder-channel" disabled />
          SMS (not available yet)
        </label>
      </fieldset>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="reminder-reply-to">Reply To</Label>
          <Input id="reminder-reply-to" type="email" value={values.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reminder-from">From</Label>
          <Input id="reminder-from" maxLength={60} value={values.from_name} onChange={(e) => set('from_name', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="reminder-subject">Subject</Label>
        <Input id="reminder-subject" maxLength={150} value={values.subject} onChange={(e) => set('subject', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reminder-message">Message</Label>
        <Textarea id="reminder-message" rows={8} value={values.message_html} onChange={(e) => set('message_html', e.target.value)} />
        <p className="text-xs text-muted-foreground">Placeholders: {PLACEHOLDER_HINT}. Simple formatting (paragraphs, bold, lists, links) is kept.</p>
      </div>
      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
      {canSend &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Send this e-mail to {unitIds.length} unit(s)?</span>
            <Button type="button" onClick={() => void submit()} disabled={send.isPending}>Yes, send</Button>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button type="button" onClick={ask} disabled={send.isPending}>
            <Send className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        ))}
    </section>
  );
}
