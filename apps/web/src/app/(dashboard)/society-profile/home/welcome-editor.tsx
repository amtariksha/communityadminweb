'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { RichTextEditor, type PickedPicture } from '@/components/rich-text/rich-text-editor';
import { isBlankHtml } from '@/components/rich-text/editor-html';
import { useUpdateSocietyProfile } from '@/hooks/use-society-profile';
import { friendlyError } from '@/lib/api-error';
import { PICTURE_TYPES, SLOT_PICTURE_BYTES, pickFile, pictureProblem, useUploadPicture } from '../profile-pictures';

/** Our own short greeting, offered until the society writes its message (not shown to residents until saved). */
export const DEFAULT_WELCOME = '<p>Welcome home! This is your society’s page. Notices, dues, requests and bookings are all a tap away.</p>';

/** Society Profile › Home (PROF-S1, PROF-21): the welcome message residents read on their home screen. */
export function WelcomeEditor({ savedHtml, canEdit }: { savedHtml: string | null; canEdit: boolean }): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateSocietyProfile();
  const uploadPicture = useUploadPicture();
  const [html, setHtml] = useState(savedHtml ?? DEFAULT_WELCOME);

  async function pickPicture(): Promise<PickedPicture | null> {
    const file = await pickFile(PICTURE_TYPES.join(','));
    if (!file) return null;
    const problem = pictureProblem(file, SLOT_PICTURE_BYTES);
    if (problem) {
      addToast({ title: problem, variant: 'destructive' });
      return null;
    }
    try {
      return { url: await uploadPicture(file), file };
    } catch (error) {
      addToast({ title: 'Could not upload the picture', description: friendlyError(error), variant: 'destructive' });
      return null;
    }
  }

  function save(): void {
    update.mutate(
      { welcome_message_html: isBlankHtml(html) ? null : html },
      {
        onSuccess: () => addToast({ title: 'Welcome message saved', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save the message', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm text-muted-foreground">
          Residents see this message at the top of the resident app home and the resident web home. Leave it empty to show nothing.
        </p>
        <RichTextEditor id="welcome-message" label="Welcome Message" initialHtml={html} onChange={setHtml} onPickImage={pickPicture} readOnly={!canEdit} />
        {canEdit ? (
          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">The committee writes this message.</p>
        )}
      </CardContent>
    </Card>
  );
}
