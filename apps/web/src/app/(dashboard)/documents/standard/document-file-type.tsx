import type { ReactNode } from 'react';
import { File, FileText, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Document as SocietyDocument } from '@communityos/shared';

export function getFileIcon(fileType: string): ReactNode {
  switch (fileType) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'doc':
    case 'docx':
      return <File className="h-5 w-5 text-primary" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'image':
      return <Image className="h-5 w-5 text-success" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

/**
 * Derive a short file-type string (pdf, docx, jpg, …) from the stored
 * document row. The API returns `file_name` + `mime_type` but not a
 * discrete `file_type` field, and referencing `doc.file_type` directly
 * crashed the page with "Cannot read properties of undefined (reading
 * 'toUpperCase')". Prefer the extension on the file name, fall back
 * to the MIME subtype, then 'file' as a last resort.
 */
export function getFileType(doc: SocietyDocument): string {
  const name = doc.file_name ?? '';
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) {
    return name.slice(dot + 1).toLowerCase();
  }
  const mime = doc.mime_type ?? '';
  if (mime.includes('/')) {
    return mime.split('/')[1]?.toLowerCase() ?? 'file';
  }
  return 'file';
}

/** "Expires today / in N days" for a document inside the expiry window, else Active. */
export function ExpiryBadge({ daysLeft }: { daysLeft: number | undefined }): ReactNode {
  if (daysLeft === undefined) {
    return <Badge variant="success">Active</Badge>;
  }
  const label = daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  return <Badge variant="warning">{label}</Badge>;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Who uploaded a document (the list joins the uploader's name, FILE-10). */
export function uploaderName(doc: SocietyDocument): string {
  return (doc as SocietyDocument & { uploaded_by_name?: string | null }).uploaded_by_name || '—';
}
