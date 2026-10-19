'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { useToast } from '@/components/ui/toast';
import { useDocumentCategories, useUploadDocument, useUploadFileToS3 } from '@/hooks/use-documents';
import { friendlyError } from '@/lib/api-error';
import { checkUploadFile } from '@/lib/validation';
import { useUnitChoices } from '../../helpdesk/new/use-unit-choices';
import { FolderField, folderError, useResolveFolder } from '../files/folder-field';
import { placementFor, ROOT_LABELS, type FileRoot, type ResidentAudience } from '../files/file-roots';
import { AudienceSelect, ExpiryField, FilePicker, TextFields, UnitSelect } from './upload-fields';

export interface UploadFileFormProps {
  root: FileRoot;
  /** Pre-set folder and unit, from where Upload File was pressed. */
  folderId?: string;
  unitId?: string;
  /** A folder name to start with when the folder does not exist yet. */
  newFolderName?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface UploadState {
  title: string;
  description: string;
  folder: string;
  newFolder: string;
  audience: ResidentAudience;
  unitId: string;
  expiry: string;
}

function problem(state: UploadState, root: FileRoot, file: File | null, folders: { id: string; name: string }[]): string | null {
  if (!file) return 'Choose a file.';
  const fileCheck = checkUploadFile(file);
  if (!fileCheck.ok) return fileCheck.error;
  if (root === 'unit' && !state.unitId) return 'Choose the unit.';
  return folderError(folders, state.folder, state.newFolder);
}

/**
 * Upload File (FILE-S3) as a page: the root is fixed by where it was
 * opened, the file goes to our storage first, then POST /documents files
 * it in the chosen folder.
 */
export function UploadFileForm(props: UploadFileFormProps): ReactNode {
  const { root } = props;
  const { addToast } = useToast();
  // FILE-20: the active folders of this root (unit files may use any).
  const folderRoot = root === 'unit' ? undefined : root;
  const folders = useDocumentCategories({ root: folderRoot }).data ?? [];
  const units = useUnitChoices(root === 'unit').data ?? [];
  const storeFile = useUploadFileToS3();
  const saveDocument = useUploadDocument();
  const resolveFolder = useResolveFolder(folderRoot);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<UploadState>({
    title: '',
    description: '',
    folder: props.folderId ?? (props.newFolderName ? '__new__' : ''),
    newFolder: props.newFolderName ?? '',
    audience: 'all',
    unitId: props.unitId ?? '',
    expiry: '',
  });
  const set = (patch: Partial<UploadState>) => setState((current) => ({ ...current, ...patch }));

  async function save(): Promise<void> {
    const error = problem(state, root, file, folders);
    if (error || !file) return addToast({ title: error ?? 'Choose a file.', variant: 'destructive' });
    setSaving(true);
    try {
      const categoryId = await resolveFolder(state.folder, state.newFolder);
      const stored = await storeFile.mutateAsync({ file });
      await saveDocument.mutateAsync({
        category_id: categoryId,
        title: state.title.trim() || file.name,
        description: state.description.trim() || null,
        file_url: stored.fileUrl,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        expiry_date: state.expiry || undefined,
        ...placementFor(root, state.audience, state.unitId),
      });
      addToast({ title: 'File uploaded', variant: 'success' });
      props.onSaved();
    } catch (failure) {
      addToast({ title: 'Could not upload the file', description: friendlyError(failure), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormFrame
      mode="page"
      title="Upload File"
      description={`Into ${ROOT_LABELS[root]}`}
      onClose={props.onClose}
      onSave={() => void save()}
      saving={saving}
      saveLabel="Upload"
      savingLabel="Uploading…"
    >
      {root === 'unit' && <UnitSelect units={units} value={state.unitId} onChange={(unitId) => set({ unitId })} />}
      <FolderField
        folders={folders}
        value={state.folder}
        newName={state.newFolder}
        onChange={(folder) => set({ folder })}
        onNewName={(newFolder) => set({ newFolder })}
      />
      <TextFields
        title={state.title}
        description={state.description}
        onTitle={(title) => set({ title })}
        onDescription={(description) => set({ description })}
      />
      {root === 'residents' && <AudienceSelect value={state.audience} onChange={(audience) => set({ audience })} />}
      <ExpiryField value={state.expiry} onChange={(expiry) => set({ expiry })} />
      <FilePicker
        label="File"
        file={file}
        onPick={(picked) => {
          setFile(picked);
          if (picked && !state.title) set({ title: picked.name });
        }}
      />
    </FormFrame>
  );
}
