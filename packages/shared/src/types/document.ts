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
  file_type: string;
  file_size: number;
  access_level: DocumentAccessLevel;
  uploaded_by: string;
  is_active: boolean;
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
