'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { useAssistantStatus, useSaveAssistantSettings } from '@/hooks/use-assistant';
import { canChangeSettings } from './settings-access';

/**
 * Settings › Assistant: off by default; the community admin switches it on
 * for the society after reading what it sends to Google Gemini. Read by the
 * API on every question (PUT /assistant/settings; 404 = not available yet).
 */
export function AssistantCard(): ReactNode {
  const { addToast } = useToast();
  const allowed = canChangeSettings();
  const status = useAssistantStatus(allowed);
  const save = useSaveAssistantSettings();
  const saved = status.data?.enabled === true;
  const [enabled, setEnabled] = useState(saved);

  useEffect(() => setEnabled(saved), [saved]);

  if (!allowed) return null;

  function submit(): void {
    save.mutate(enabled, {
      onSuccess: () =>
        addToast({ title: enabled ? 'Assistant switched on' : 'Assistant switched off', variant: 'success' }),
      onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status.data === null ? (
          <p className="text-muted-foreground">The Assistant is not available yet.</p>
        ) : (
          <>
            <p>
              The Assistant answers admins’ questions about this society in the top bar: where a screen or report is,
              what a unit owes, what a setting does, and it can prepare an announcement for you to save as a draft (it
              never posts one).
            </p>
            <p className="rounded-md border border-warning bg-warning/10 p-2">
              When it is on, the questions people type and the data needed to answer them (unit numbers and amounts)
              are sent to Google Gemini. The Assistant sends no names, phone numbers or e-mail addresses of its own, and
              removes phone numbers and e-mail addresses people type. Questions and answers are not stored.
            </p>
            {status.data && !status.data.configured && (
              <p className="text-muted-foreground">This server has no Gemini key yet, so it will say it is not set up.</p>
            )}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              Switch the Assistant on for this society
            </label>
            <Button onClick={submit} disabled={enabled === saved || save.isPending || status.isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
