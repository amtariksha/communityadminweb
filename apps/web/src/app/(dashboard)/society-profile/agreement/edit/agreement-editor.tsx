'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { isBlankHtml } from '@/components/rich-text/editor-html';
import { usePublishAgreement, useSaveAgreementDraft, type AgreementVersion } from '@/hooks/use-society-agreement';
import { friendlyError } from '@/lib/api-error';
import { PUBLISH_QUESTION } from '../agreement-access';

function statusLine(editable: AgreementVersion): string {
  return editable.status === 'draft'
    ? `Draft — version ${editable.version}. Residents keep seeing the published version until you publish this one.`
    : `Version ${editable.version} is published and cannot be changed. Saving starts version ${editable.version + 1} as a draft.`;
}

/**
 * Read/Edit Default Agreement (PROF-S5): Save keeps a draft (a new version
 * once the newest is published); Publish makes it the current agreement
 * after asking, since every resident is asked to accept again. The editor
 * cuts the stored text to the allow-list before showing it.
 */
export function AgreementEditor({ editable, canEdit }: { editable: AgreementVersion; canEdit: boolean }): ReactNode {
  const { addToast } = useToast();
  const saveDraft = useSaveAgreementDraft();
  const publish = usePublishAgreement();
  const [html, setHtml] = useState(editable.body_html);
  const changed = html !== editable.body_html;
  const busy = saveDraft.isPending || publish.isPending;

  async function save(): Promise<AgreementVersion | null> {
    if (isBlankHtml(html)) {
      addToast({ title: 'The agreement needs some text', variant: 'destructive' });
      return null;
    }
    try {
      return await saveDraft.mutateAsync(html);
    } catch (error) {
      addToast({ title: 'Could not save the agreement', description: friendlyError(error), variant: 'destructive' });
      return null;
    }
  }

  async function onSave(): Promise<void> {
    const saved = await save();
    if (saved) addToast({ title: `Draft version ${saved.version} saved`, variant: 'success' });
  }

  async function onPublish(): Promise<void> {
    if (!window.confirm(PUBLISH_QUESTION)) return;
    const target = changed || editable.status !== 'draft' ? await save() : editable;
    if (!target) return;
    try {
      const published = await publish.mutateAsync({ id: target.id, updated_at: target.updated_at });
      addToast({ title: `Version ${published.version} published`, variant: 'success' });
    } catch (error) {
      const changed = (error as { code?: unknown } | null)?.code === 'agreement_changed';
      addToast({
        title: changed ? 'The draft was changed by someone else' : 'Could not publish the agreement',
        description: changed ? 'Reload the page, read the new text, then publish.' : friendlyError(error),
        variant: 'destructive',
      });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground" data-testid="agreement-status">{statusLine(editable)}</p>
        <RichTextEditor id="society-agreement" label="User Agreement" initialHtml={editable.body_html} onChange={setHtml} readOnly={!canEdit} />
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/society-profile/agreement" className={buttonVariants({ variant: 'ghost' })}>
            Close
          </Link>
          {canEdit && (
            <>
              <Button type="button" variant="outline" onClick={() => void onSave()} disabled={busy || !changed}>
                {saveDraft.isPending ? 'Saving…' : 'Save draft'}
              </Button>
              <Button type="button" onClick={() => void onPublish()} disabled={busy || (editable.status !== 'draft' && !changed)}>
                {publish.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </>
          )}
        </div>
        {!canEdit && <p className="text-xs text-muted-foreground">The community admin writes and publishes the agreement.</p>}
      </CardContent>
    </Card>
  );
}
