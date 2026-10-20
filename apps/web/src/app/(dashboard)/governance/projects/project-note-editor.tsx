'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NoteInput } from '@/hooks/use-projects';
import { FileAttachButton } from '../stored-files';

export const MAX_NOTE_FILES = 5;
export const MAX_NOTE_LENGTH = 4000;

/** Add a Note with up to five files (PROJ-S5). */
export function ProjectNoteEditor(props: { value: NoteInput; onChange: (note: NoteInput) => void; disabled?: boolean }): ReactNode {
  const { value, onChange } = props;
  return (
    <div className="space-y-2 text-sm">
      <Label htmlFor="p-note">Add a Note</Label>
      <Textarea id="p-note" rows={3} maxLength={MAX_NOTE_LENGTH} value={value.body} disabled={props.disabled} onChange={(e) => onChange({ ...value, body: e.target.value })} />
      <div className="flex flex-wrap items-center gap-2">
        <FileAttachButton
          room={MAX_NOTE_FILES - value.attachments.length}
          disabled={props.disabled}
          onUploaded={(files) => onChange({ ...value, attachments: [...value.attachments, ...files] })}
        />
        {value.attachments.map((file) => (
          <span key={file.url} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs">
            {file.name}
            <button type="button" aria-label={`Remove ${file.name}`} onClick={() => onChange({ ...value, attachments: value.attachments.filter((other) => other.url !== file.url) })}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export const EMPTY_NOTE: NoteInput = { body: '', attachments: [] };

/** A note worth sending: text, files or both need text (the API requires a body). */
export function noteError(note: NoteInput): string | null {
  if (!note.body.trim() && note.attachments.length > 0) return 'Write a line about the attached files.';
  if (note.body.length > MAX_NOTE_LENGTH) return 'A note is at most 4,000 characters.';
  return null;
}
