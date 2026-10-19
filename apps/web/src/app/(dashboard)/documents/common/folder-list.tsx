'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { DocumentFolder } from '@/hooks/use-document-files';
import { cn } from '@/lib/utils';

interface FolderListProps {
  folders: readonly DocumentFolder[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** The folders of a root, each "<folder> Files N", with a name search (FILE-S1). */
export function FolderList({ folders, loading, selectedId, onSelect }: FolderListProps): ReactNode {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? folders.filter((folder) => folder.name.toLowerCase().includes(needle)) : folders;

  return (
    <div className="space-y-2">
      <Input
        type="search"
        aria-label="Search by folder name"
        placeholder="Search by folder name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {loading && <Skeleton className="h-24 w-full" />}
      {!loading && folders.length === 0 && (
        <p className="text-sm text-muted-foreground">No folders yet — Upload File creates one.</p>
      )}
      {!loading && folders.length > 0 && shown.length === 0 && (
        <p className="text-sm text-muted-foreground">No folder matches.</p>
      )}
      <ul aria-label="Folders" className="space-y-1">
        {shown.map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              aria-pressed={folder.id === selectedId}
              onClick={() => onSelect(folder.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                folder.id === selectedId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <span className={folder.is_active === false ? 'italic opacity-70' : undefined}>
                {folder.name} Files{folder.is_active === false ? ' (retired)' : ''}
              </span>
              <span className="font-semibold">{folder.file_count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
