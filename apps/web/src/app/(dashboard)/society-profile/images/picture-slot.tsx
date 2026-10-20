'use client';

import type { ReactNode } from 'react';
import { StoredImage } from '@/components/stored-image';
import { Button } from '@/components/ui/button';

interface PictureSlotProps {
  label: string;
  /** The stored picture, or the browser's copy of one just picked. */
  url: string | null;
  hint: string;
  busy: boolean;
  canEdit: boolean;
  onUpload: () => void;
  onRemove: () => void;
}

/** One picture with its own Upload image / Remove image (PROF-S2). */
export function PictureSlot(props: PictureSlotProps): ReactNode {
  return (
    <div className="space-y-2 rounded-md border p-3" aria-label={props.label} role="group">
      <p className="text-sm font-medium">{props.label}</p>
      <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded bg-muted">
        <StoredImage
          src={props.url}
          alt={props.label}
          className="h-full w-full object-cover"
          fallback={<span className="text-xs text-muted-foreground">No picture</span>}
          placeholder={null}
        />
      </div>
      <p className="text-xs text-muted-foreground">{props.hint}</p>
      {props.canEdit && (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={props.busy} onClick={props.onUpload}>
            Upload image
          </Button>
          {props.url && (
            <Button type="button" size="sm" variant="ghost" disabled={props.busy} onClick={props.onRemove}>
              Remove image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
