'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { FilePicker } from '../upload/upload-fields';
import type { FileRoot } from '../files/file-roots';

/** Root of a non-unit file: Admin Documents or Resident Documents. */
export function RootSelect({ value, onChange }: { value: FileRoot; onChange: (root: FileRoot) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-root">Root</Label>
      <Select id="file-root" value={value} onChange={(event) => onChange(event.target.value as FileRoot)}>
        <option value="admin">Admin Documents</option>
        <option value="residents">Resident Documents</option>
      </Select>
    </div>
  );
}

export function ReplaceFileFields(props: {
  file: File | null;
  notes: string;
  onPick: (file: File | null) => void;
  onNotes: (notes: string) => void;
}): ReactNode {
  return (
    <>
      <FilePicker label="Replace file" file={props.file} onPick={props.onPick} />
      {props.file && (
        <div className="space-y-2">
          <Label htmlFor="file-change-notes">Change notes</Label>
          <Input
            id="file-change-notes"
            maxLength={500}
            value={props.notes}
            onChange={(event) => props.onNotes(event.target.value)}
          />
        </div>
      )}
    </>
  );
}
