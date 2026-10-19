'use client';

import { type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateCategory } from '@/hooks/use-documents';

export const NEW_FOLDER = '__new__';

export interface FolderChoice {
  id: string;
  name: string;
}

interface FolderFieldProps {
  folders: readonly FolderChoice[];
  value: string;
  newName: string;
  onChange: (value: string) => void;
  onNewName: (value: string) => void;
}

/** Folder select with "New folder…" and its name box (FILE-S3). */
export function FolderField({ folders, value, newName, onChange, onNewName }: FolderFieldProps): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-folder">Folder</Label>
      <Select id="file-folder" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select a folder</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
        <option value={NEW_FOLDER}>New folder…</option>
      </Select>
      {value === NEW_FOLDER && (
        <Input
          aria-label="New folder name"
          placeholder="New folder name"
          maxLength={100}
          value={newName}
          onChange={(event) => onNewName(event.target.value)}
        />
      )}
    </div>
  );
}

/** What is wrong with the folder choice, or null. */
export function folderError(folders: readonly FolderChoice[], value: string, newName: string): string | null {
  if (!value) return 'Choose a folder.';
  if (value !== NEW_FOLDER) return null;
  const name = newName.trim();
  if (name.length < 2 || name.length > 100) return 'A folder name is 2 to 100 characters.';
  if (folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
    return `A folder named "${name}" already exists; choose it from the list.`;
  }
  return null;
}

/** The folder id to file under, creating the new folder first when asked. */
export function useResolveFolder(): (value: string, newName: string) => Promise<string> {
  const createFolder = useCreateCategory();
  return async (value, newName) => {
    if (value !== NEW_FOLDER) return value;
    const created = await createFolder.mutateAsync({ name: newName.trim() });
    return created.data.id;
  };
}
