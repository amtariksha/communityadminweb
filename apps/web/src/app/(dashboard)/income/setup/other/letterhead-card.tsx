'use client';

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useRemoveLetterhead, useUploadLetterhead, type DocumentSettings } from '@/hooks/use-billing-documents';
import { friendlyError } from '@/lib/api-error';
import { isWebLink, letterheadProblem } from './document-options';

interface LetterheadCardProps {
  view: DocumentSettings;
  canWrite: boolean;
}

/**
 * Setup › Other › Letter head (INC-42): an image drawn across the top of
 * invoices in place of the text header. JPG or PNG up to 1 MB, checked here
 * and again by the server.
 */
export function LetterheadCard({ view, canWrite }: LetterheadCardProps): ReactNode {
  const { addToast } = useToast();
  const upload = useUploadLetterhead();
  const remove = useRemoveLetterhead();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hasLetterhead = view.look.letterheadKey !== null;
  const busy = upload.isPending || remove.isPending;

  async function choose(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = letterheadProblem(file);
    setMessage(problem);
    if (problem) return;
    try {
      await upload.mutateAsync(file);
      addToast({ title: 'Letter head uploaded', description: 'New invoices print it at the top.', variant: 'success' });
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  async function takeOff(): Promise<void> {
    setMessage(null);
    try {
      await remove.mutateAsync();
      addToast({ title: 'Letter head removed', variant: 'success' });
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  return (
    <Card id="letterhead">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Letter head
        </CardTitle>
        <p className="text-xs text-muted-foreground">Drawn across the top of invoices in place of the society&apos;s name and address. JPG or PNG, up to 1 MB.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isWebLink(view.letterhead_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={view.letterhead_url} alt="Letter head" className="max-h-40 rounded border object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">{hasLetterhead ? 'A letter head is set.' : 'No letter head: documents print the text header.'}</p>
        )}
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png"
              aria-label="Letter head image"
              className="hidden"
              onChange={(event) => void choose(event)}
            />
            <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {upload.isPending ? 'Uploading…' : 'Upload letter head'}
            </Button>
            {hasLetterhead && (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void takeOff()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
