export interface DocumentCategory {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
}

export type DocumentAccessLevel = 'public' | 'committee' | 'admin';

export interface Document {
  id: string;
  tenant_id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_url: string;
  // The API stores file_name + mime_type; file_type is derived client-side.
  // Kept optional so legacy callers (and admin-web code still referencing it)
  // don't crash on the absence of this synthetic field.
  file_type?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  access_level?: DocumentAccessLevel;
  uploaded_by: string;
  is_archived?: boolean;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_size: number;
  change_notes: string | null;
  uploaded_by: string;
  created_at: Date;
}
