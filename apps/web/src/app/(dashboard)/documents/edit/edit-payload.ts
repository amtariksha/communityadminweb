import type { DocumentFile } from '@/hooks/use-document-files';
import type { UpdateDocumentInput } from '@/hooks/use-documents';
import { rootOf, type FileRoot, type ResidentAudience } from '../files/file-roots';

export interface EditState {
  title: string;
  description: string;
  folder: string;
  newFolder: string;
  root: FileRoot;
  audience: ResidentAudience;
  expiry: string;
  changeNotes: string;
}

export interface ReplacedFile {
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

export type EditPayload = UpdateDocumentInput;

function residentAudience(role: string | null): ResidentAudience {
  return role === 'owner' || role === 'tenant_resident' ? role : 'all';
}

/** The form as it opens for a stored file. */
export function initialEditState(file: DocumentFile): EditState {
  return {
    title: file.title,
    description: file.description ?? '',
    folder: file.category_id ?? '',
    newFolder: '',
    root: rootOf(file),
    audience: residentAudience(file.audience_role),
    expiry: file.expiry_date ?? '',
    changeNotes: '',
  };
}

/** Whether saving moves the file where residents will see it (asks first, FILE-D2). */
export function movesToResidents(file: DocumentFile, state: EditState): boolean {
  return rootOf(file) === 'admin' && state.root === 'residents';
}

function placementChange(file: DocumentFile, state: EditState): EditPayload {
  const before = initialEditState(file);
  if (state.root === before.root && (state.root !== 'residents' || state.audience === before.audience)) return {};
  if (state.root === 'admin') return { folder_type: 'committee' };
  if (state.root === 'residents') {
    return { folder_type: 'common', audience_role: state.audience === 'all' ? null : state.audience };
  }
  return {};
}

/**
 * PATCH /documents/:id body (FILE-11): only what changed. A move between
 * the roots sends the folder and, for Resident Documents, the audience;
 * a replaced file sends the new file and its change notes, and becomes
 * the next version.
 */
export function editPayload(
  file: DocumentFile,
  state: EditState,
  folderId: string,
  replaced?: ReplacedFile,
): EditPayload {
  const before = initialEditState(file);
  const body: EditPayload = { ...placementChange(file, state) };
  if (state.title.trim() !== before.title) body.title = state.title.trim();
  if (state.description.trim() !== before.description) body.description = state.description.trim() || null;
  if (folderId && folderId !== before.folder) body.category_id = folderId;
  if (state.expiry !== before.expiry) body.expiry_date = state.expiry || null;
  if (replaced) {
    Object.assign(body, replaced);
    if (state.changeNotes.trim()) body.change_notes = state.changeNotes.trim();
  }
  return body;
}
