'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { UploadProgress } from '@/components/ui/upload-progress';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import { todayIST } from '@/lib/date';
import { checkUploadFile } from '@/lib/validation';
import { useUploadDocument, useUploadFileToS3 } from '@/hooks';
import type { DocumentCategory } from '@communityos/shared';
import { audienceFields, type UploadAudience } from './upload-audience';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface UnitOption {
  id: string;
  unit_number: string;
  block?: string | null;
}

interface UploadForm {
  title: string;
  categoryId: string;
  description: string;
  audience: UploadAudience;
  unitId: string;
  expiryDate: string;
}

const EMPTY_FORM: UploadForm = {
  title: '',
  categoryId: '',
  description: '',
  audience: 'all',
  unitId: '',
  expiryDate: '',
};

/**
 * Upload Document: the file goes straight to our storage through a signed
 * link, then POST /documents records it. The API refuses a file that is not
 * on our storage (FILE-01).
 */
export function UploadDocumentDialog({
  categories,
  units,
}: {
  categories: DocumentCategory[];
  units: UnitOption[];
}): ReactNode {
  const { addToast } = useToast();
  const uploadDocument = useUploadDocument();
  const uploadFileToS3 = useUploadFileToS3();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const set = <K extends keyof UploadForm>(key: K, value: UploadForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function reset(): void {
    setForm(EMPTY_FORM);
    setFile(null);
    setPercent(null);
    setFailed(false);
  }

  function refuse(title: string, description?: string): void {
    addToast({ title, description, variant: 'destructive' });
  }

  async function storeFile(picked: File): Promise<string | null> {
    setPercent(0);
    setFailed(false);
    try {
      const res = await uploadFileToS3.mutateAsync({ file: picked, onProgress: setPercent });
      return res.fileUrl;
    } catch (err) {
      setFailed(true);
      refuse('Upload failed', (err as Error).message ?? 'Could not upload file');
      return null;
    }
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!file) return refuse('Please choose a file');
    const fileCheck = checkUploadFile(file);
    if (!fileCheck.ok) return refuse('File rejected', fileCheck.error);
    if (form.audience === 'unit' && !form.unitId) {
      return refuse('Please select a unit', 'Choose a unit for the audience filter or pick another option.');
    }
    const fileUrl = await storeFile(file);
    if (!fileUrl) return;
    uploadDocument.mutate(
      {
        category_id: form.categoryId,
        title: form.title || file.name,
        description: form.description || null,
        file_url: fileUrl,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        expiry_date: form.expiryDate || undefined,
        ...audienceFields(form.audience, form.unitId),
      },
      {
        onSuccess() {
          setOpen(false);
          reset();
          addToast({ title: 'Document uploaded successfully', variant: 'success' });
        },
        onError(error) {
          refuse('Failed to save document', friendlyError(error));
        },
      },
    );
  }

  const busy = uploadFileToS3.isPending || uploadDocument.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a new document to the repository</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                placeholder="Document title"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-category">Category</Label>
              <Select
                id="upload-category"
                required
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Input
                id="upload-description"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <AudienceField form={form} units={units} onChange={set} />
            <div className="space-y-2">
              <Label htmlFor="upload-expiry">Expiry date</Label>
              <Input
                id="upload-expiry"
                type="date"
                min={todayIST()}
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional. The document shows under Expiring Soon from 30 days before, and the committee is told once.
              </p>
            </div>
            <FileField
              file={file}
              percent={percent}
              failed={failed}
              onPick={(picked) => {
                setFile(picked);
                if (picked && !form.title) set('title', picked.name);
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={!file || file.size > MAX_BYTES || busy}>
              {uploadFileToS3.isPending
                ? 'Uploading to storage...'
                : uploadDocument.isPending
                  ? 'Saving...'
                  : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AudienceField({
  form,
  units,
  onChange,
}: {
  form: UploadForm;
  units: UnitOption[];
  onChange: <K extends keyof UploadForm>(key: K, value: UploadForm[K]) => void;
}): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="upload-audience">Audience</Label>
      <Select
        id="upload-audience"
        value={form.audience}
        onChange={(e) => onChange('audience', e.target.value as UploadAudience)}
      >
        <option value="all">All residents</option>
        <option value="owner">Owners only</option>
        <option value="tenant_resident">Tenants only</option>
        <option value="committee_member">Committee members only</option>
        <option value="unit">Specific unit</option>
      </Select>
      {form.audience === 'unit' && (
        <Select
          aria-label="Audience unit"
          required
          value={form.unitId}
          onChange={(e) => onChange('unitId', e.target.value)}
        >
          <option value="">Select a unit</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unit_number}
              {u.block ? ` · Block ${u.block}` : ''}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

function FileField({
  file,
  percent,
  failed,
  onPick,
}: {
  file: File | null;
  percent: number | null;
  failed: boolean;
  onPick: (file: File | null) => void;
}): ReactNode {
  return (
    <div className="space-y-2">
      <Label htmlFor="upload-file">File</Label>
      <Input
        id="upload-file"
        type="file"
        required
        accept={ACCEPT}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="text-xs text-muted-foreground">
          {file.name} — {(file.size / 1024).toFixed(1)} KB
          {file.size > MAX_BYTES && (
            <span className="ml-2 font-medium text-destructive">exceeds 25 MB limit</span>
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Accepted: PDF, JPG, PNG, CSV, XLS/XLSX. Max 25 MB.</p>
      <UploadProgress
        percent={percent}
        fileName={file?.name}
        state={failed ? 'error' : percent === 100 ? 'done' : 'uploading'}
      />
    </div>
  );
}
