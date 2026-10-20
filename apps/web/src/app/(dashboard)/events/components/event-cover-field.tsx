'use client';

import { useState, type ReactNode } from 'react';
import { StoredImage } from '@/components/stored-image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUploadFileToS3 } from '@/hooks';
import { useLocalPreviews } from '@/hooks/use-stored-file';
import { friendlyError } from '@/lib/api-error';
import { checkUploadFile } from '@/lib/validation';

interface EventCoverFieldProps {
  value: string;
  onChange: (url: string) => void;
}

/** Image (AMEN-S4): the event's cover picture, uploaded straight to file storage. */
export function EventCoverField({ value, onChange }: EventCoverFieldProps): ReactNode {
  const upload = useUploadFileToS3();
  // Until the event is saved the API does not sign the new cover: show the picked file.
  const previews = useLocalPreviews();
  const [error, setError] = useState<string | null>(null);

  async function choose(file: File | undefined): Promise<void> {
    if (!file) return;
    const check = checkUploadFile(file);
    if (!check.ok) return setError(check.error);
    if (!file.type.startsWith('image/')) return setError('Choose a picture (JPEG, PNG or WebP).');
    setError(null);
    try {
      const uploaded = await upload.mutateAsync({ file });
      previews.remember(uploaded.fileUrl, file);
      onChange(uploaded.fileUrl);
    } catch (failure) {
      setError(`The picture could not be uploaded: ${friendlyError(failure)}`);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="event-cover">Image</Label>
      {value && (
        <div className="flex items-center gap-3">
          <StoredImage
            src={previews.previewOf(value)}
            alt="Event cover"
            className="h-16 w-24 rounded object-cover"
            fallback={<span className="flex h-16 w-24 items-center justify-center rounded bg-muted text-xs text-muted-foreground">Not available</span>}
            placeholder={<span className="block h-16 w-24 rounded bg-muted" aria-hidden />}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => onChange('')}>
            Remove image
          </Button>
        </div>
      )}
      <input
        id="event-cover"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={upload.isPending}
        onChange={(event) => void choose(event.target.files?.[0])}
        className="block text-sm"
      />
      {upload.isPending && <p className="text-xs text-muted-foreground">Uploading…</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
