'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { ShowLogsButton } from '@/components/show-logs';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  APPROVAL_MERGE_FIELDS,
  DEFAULT_APPROVAL_MESSAGE,
  DEFAULT_INVITE_MESSAGE,
  INVITE_MERGE_FIELDS,
  unknownMergeFields,
  useResidentSettings,
  useSaveResidentSettings,
  type ResidentSettings,
} from '@/hooks/use-resident-settings';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';

export type ResidentMessageKind = 'invite' | 'approval';

const KINDS = {
  invite: {
    title: 'Customize Invite Email',
    fields: INVITE_MERGE_FIELDS,
    fallback: DEFAULT_INVITE_MESSAGE,
    message: 'invite_message',
    email: 'invite_email_enabled',
    emailLabel: 'Send invites by e-mail (to residents with an address)',
    close: '/units/add-users',
  },
  approval: {
    title: 'Edit Welcome Message',
    fields: APPROVAL_MERGE_FIELDS,
    fallback: DEFAULT_APPROVAL_MESSAGE,
    message: 'approval_message',
    email: 'approval_email_enabled',
    emailLabel: 'Also e-mail it to an approved resident who gave an address',
    close: '/units/unapproved',
  },
} as const;

const MAX_LENGTH = 5000;

function Editor({ kind, settings }: { kind: ResidentMessageKind; settings: ResidentSettings }): ReactNode {
  const config = KINDS[kind];
  const { addToast } = useToast();
  const save = useSaveResidentSettings();
  const [html, setHtml] = useState(settings[config.message] ?? config.fallback);
  const [email, setEmail] = useState(settings[config.email]);
  const unknown = unknownMergeFields(html, config.fields);
  const empty = html.replace(/<[^>]*>/g, '').trim() === '';
  const editable = currentRole() === 'community_admin' || currentRole() === 'super_admin';

  function submit(): void {
    if (empty && !window.confirm('The message is empty. Save to go back to the default text?')) return;
    save.mutate(
      { [config.message]: empty ? null : html, [config.email]: email },
      {
        onSuccess: () => addToast({ title: 'Saved', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <RichTextEditor id={`${kind}-message`} label="Message" initialHtml={html} onChange={setHtml} readOnly={!editable} />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Merge fields</p>
          {config.fields.map((field) => (
            <code key={field} className="block text-xs">{`{{${field}}}`}</code>
          ))}
        </div>
      </div>
      {unknown.length > 0 && <p className="text-sm text-destructive">Unknown merge field: {unknown.map((f) => `{{${f}}}`).join(', ')}</p>}
      {html.length > MAX_LENGTH && <p className="text-sm text-destructive">The message is at most {MAX_LENGTH} characters.</p>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={email} disabled={!editable} onChange={(event) => setEmail(event.target.checked)} />
        {config.emailLabel}
      </label>
      <p className="text-xs text-muted-foreground">E-mails go out only when this is ticked and e-mail is set up on the server.</p>
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button type="button" disabled={save.isPending || unknown.length > 0 || html.length > MAX_LENGTH} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
        <ShowLogsButton recordTypes={['tenant_settings']} />
        <Link href={config.close} className={buttonVariants({ variant: 'outline' })}>
          Close
        </Link>
      </div>
    </div>
  );
}

/** UNIT-S2 (approval) and the invite e-mail (UNIT-20): the message, its merge fields and the e-mail switch. */
export function ResidentMessagePage({ kind }: { kind: ResidentMessageKind }): ReactNode {
  const query = useResidentSettings();
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="text-lg font-semibold">{KINDS[kind].title}</h2>
        {query.isLoading && <Skeleton className="h-40 w-full" />}
        {query.data === null && <p className="text-sm text-muted-foreground">This setting is not available yet on this server.</p>}
        {query.isError && <p className="text-sm text-destructive">The message could not be loaded.</p>}
        {query.data && <Editor kind={kind} settings={query.data} />}
      </CardContent>
    </Card>
  );
}
