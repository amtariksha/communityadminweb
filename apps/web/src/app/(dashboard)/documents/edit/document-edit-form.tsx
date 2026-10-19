'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useDocumentCategories, useUpdateDocument, useUploadFileToS3 } from '@/hooks/use-documents';
import { useDocumentWithVersions, type DocumentFile, type DocumentFileVersion } from '@/hooks/use-document-files';
import { friendlyError } from '@/lib/api-error';
import { checkUploadFile } from '@/lib/validation';
import { FolderField, folderError, useResolveFolder } from '../files/folder-field';
import { AudienceSelect, ExpiryField, TextFields } from '../upload/upload-fields';
import { DocumentVersions } from './document-versions';
import { ReplaceFileFields, RootSelect } from './edit-fields';
import { editPayload, initialEditState, movesToResidents, type EditState, type ReplacedFile } from './edit-payload';

export interface DocumentEditFormProps {
  mode: FormMode;
  documentId: string;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const MOVE_QUESTION = 'Move this file to Resident Documents? Residents will be able to see it.';

function EditFields(props: {
  file: DocumentFile;
  versions: readonly DocumentFileVersion[];
  state: EditState;
  set: (patch: Partial<EditState>) => void;
  replacement: File | null;
  onReplace: (file: File | null) => void;
}): ReactNode {
  const { file, state, set } = props;
  const folders = useDocumentCategories().data ?? [];
  return (
    <>
      <TextFields
        title={state.title}
        description={state.description}
        onTitle={(title) => set({ title })}
        onDescription={(description) => set({ description })}
      />
      <FolderField
        folders={folders}
        value={state.folder}
        newName={state.newFolder}
        onChange={(folder) => set({ folder })}
        onNewName={(newFolder) => set({ newFolder })}
      />
      {state.root === 'unit' ? (
        <p className="text-sm text-muted-foreground">Unit file of {file.unit_number ?? 'a unit'}.</p>
      ) : (
        <RootSelect value={state.root} onChange={(root) => set({ root })} />
      )}
      {state.root === 'residents' && <AudienceSelect value={state.audience} onChange={(audience) => set({ audience })} />}
      <ExpiryField value={state.expiry} onChange={(expiry) => set({ expiry })} />
      <ReplaceFileFields
        file={props.replacement}
        notes={state.changeNotes}
        onPick={props.onReplace}
        onNotes={(changeNotes) => set({ changeNotes })}
      />
      <DocumentVersions versions={props.versions} />
    </>
  );
}

function LoadedEditForm(props: DocumentEditFormProps & { file: DocumentFile; versions: DocumentFileVersion[] }): ReactNode {
  const { file } = props;
  const { addToast } = useToast();
  const update = useUpdateDocument();
  const storeFile = useUploadFileToS3();
  const resolveFolder = useResolveFolder();
  const folders = useDocumentCategories().data ?? [];
  const [state, setState] = useState<EditState>(() => initialEditState(file));
  const [replacement, setReplacement] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<EditState>) => setState((current) => ({ ...current, ...patch }));

  async function upload(picked: File): Promise<ReplacedFile> {
    const stored = await storeFile.mutateAsync({ file: picked });
    return { file_url: stored.fileUrl, file_name: picked.name, file_size: picked.size, mime_type: picked.type || 'application/octet-stream' };
  }

  async function save(): Promise<void> {
    const fileCheck = replacement ? checkUploadFile(replacement) : null;
    const problem =
      (!state.title.trim() ? 'A title is needed.' : folderError(folders, state.folder, state.newFolder)) ??
      (fileCheck && !fileCheck.ok ? fileCheck.error : null);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    if (movesToResidents(file, state) && !window.confirm(MOVE_QUESTION)) return;
    setSaving(true);
    try {
      const folderId = await resolveFolder(state.folder, state.newFolder);
      const body = editPayload(file, state, folderId, replacement ? await upload(replacement) : undefined);
      const saved = Object.keys(body).length > 0 ? await update.mutateAsync({ id: file.id, data: body }) : null;
      // An API from before FILE-11 saves the rest and leaves the file where it was.
      const stayed = body.folder_type && (saved?.data as { folder_type?: string } | undefined)?.folder_type !== body.folder_type;
      addToast(
        stayed
          ? { title: 'Saved, but the file was not moved', description: 'Moving files between roots is not available yet on this server.', variant: 'destructive' }
          : { title: 'Changes saved', variant: 'success' },
      );
      props.onSaved();
    } catch (failure) {
      addToast({ title: 'Could not save the file', description: friendlyError(failure), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormFrame
      mode={props.mode}
      open={props.open}
      title={`Edit File — ${file.title}`}
      description={props.mode === 'page' ? <ShowLogsButton recordTypes={['document']} recordId={file.id} /> : undefined}
      onClose={props.onClose}
      onSave={() => void save()}
      saving={saving}
      saveLabel="Save Changes"
      dialogClassName="max-w-2xl"
    >
      <EditFields file={file} versions={props.versions} state={state} set={set} replacement={replacement} onReplace={setReplacement} />
    </FormFrame>
  );
}

/** Edit File (FILE-S4): a page in classic, a dialog in standard; versions below. */
export function DocumentEditForm(props: DocumentEditFormProps): ReactNode {
  const query = useDocumentWithVersions(props.documentId);
  if (query.data) {
    return <LoadedEditForm key={query.data.document.id} {...props} file={query.data.document} versions={query.data.versions} />;
  }
  // The dialog opens once the file is loaded.
  if (props.mode === 'dialog') return null;
  return query.error ? (
    <p className="text-sm text-destructive">Could not load the file: {friendlyError(query.error)}</p>
  ) : (
    <Skeleton className="h-64 w-full" />
  );
}
