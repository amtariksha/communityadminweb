'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { DocumentFolder, DocumentRoot } from '@/hooks/use-document-files';
import { useUpdateFolder, type UpdateFolderInput } from '@/hooks/use-documents';
import { ApiError, friendlyError } from '@/lib/api-error';

const ROOT_NAMES: Readonly<Record<DocumentRoot, string>> = { admin: 'Admin Documents', residents: 'Resident Documents' };

/** Why a folder change failed, in words for the toast. */
export function folderSaveError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404 && !error.code) return 'Changing folders is not available yet.';
  return friendlyError(error);
}

/** What is wrong with a new folder name, or null. */
export function folderNameError(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length < 2 || trimmed.length > 100 ? 'A folder name is 2 to 100 characters.' : null;
}

interface FolderActionsProps {
  folder: DocumentFolder;
  root: DocumentRoot;
}

/**
 * The selected folder's own controls (FILE-20): rename, which root it shows
 * in, retire / re-activate. A shared system folder cannot be changed; a
 * retired folder keeps its files and is only hidden from upload.
 */
export function FolderActions({ folder, root }: FolderActionsProps): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateFolder();
  const [name, setName] = useState(folder.name);
  const other: DocumentRoot = root === 'admin' ? 'residents' : 'admin';

  if (folder.tenant_id === null) {
    return <p className="text-xs text-muted-foreground">A shared folder; it cannot be renamed or retired.</p>;
  }

  function save(change: UpdateFolderInput, done: string): void {
    update.mutate(
      { id: folder.id, ...change },
      {
        onSuccess: () => addToast({ title: done, variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not change the folder', description: folderSaveError(error), variant: 'destructive' }),
      },
    );
  }

  function rename(): void {
    const problem = folderNameError(name);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    save({ name: name.trim() }, 'Folder renamed');
  }

  const active = folder.is_active !== false;
  return (
    <div className="space-y-2 border-t pt-3">
      <Label htmlFor="folder-rename">Folder name</Label>
      <div className="flex gap-2">
        <Input id="folder-rename" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
        <Button type="button" size="sm" variant="outline" disabled={update.isPending || name.trim() === folder.name} onClick={rename}>
          Rename
        </Button>
      </div>
      <Label htmlFor="folder-root">Shown in</Label>
      <Select
        id="folder-root"
        value={folder.root ?? 'both'}
        disabled={update.isPending}
        onChange={(event) => {
          const value = event.target.value;
          save({ root: value === 'both' ? null : (value as DocumentRoot) }, 'Folder moved');
        }}
      >
        <option value={root}>{ROOT_NAMES[root]} only</option>
        <option value={other}>{ROOT_NAMES[other]} only</option>
        <option value="both">Both</option>
      </Select>
      <Button
        type="button"
        size="sm"
        variant={active ? 'outline' : 'default'}
        disabled={update.isPending}
        onClick={() => save({ is_active: !active }, active ? 'Folder retired' : 'Folder re-activated')}
      >
        {active ? 'Retire folder' : 'Re-activate folder'}
      </Button>
      {active && <p className="text-xs text-muted-foreground">A retired folder is hidden from upload; its files stay here.</p>}
    </div>
  );
}
