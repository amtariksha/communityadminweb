'use client';

import { type ReactNode, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { UploadProgress } from '@/components/ui/upload-progress';
import { useRenewAgreement, useUploadFileToS3 } from '@/hooks';

// Accept a narrow subset of document types — the presigned-URL
// endpoint has its own Zod allowlist but mirroring it client-side
// stops the file picker from offering `.exe` and friends.
const ACCEPTED_MIME =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MiB

interface Props {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitLabel: string; // "A-101" or "1203"
  tenantName?: string | null;
}

/**
 * Upload a fresh rental agreement and kick off a renewal approval.
 *
 * Intentionally dumb about "current" lease dates — the community
 * admin types in the new dates. Pre-filling from a stale directory
 * query would be misleading if the record has been renewed more than
 * once and the UI hasn't caught up.
 */
export function RenewLeaseDialog({
  open,
  onClose,
  unitId,
  unitLabel,
  tenantName,
}: Props): ReactNode {
  const [newStart, setNewStart] = useState<string>('');
  const [newEnd, setNewEnd] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  // QA #261 — upload progress UI for the agreement PDF.
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const uploadFile = useUploadFileToS3();
  const renew = useRenewAgreement();
  const { addToast } = useToast();

  const submitting = uploadFile.isPending || renew.isPending;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const picked = e.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_FILE_BYTES) {
      addToast({
        title: 'File too large',
        description: 'Max 10 MiB.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    setFile(picked);
  }

  async function handleSubmit(): Promise<void> {
    if (!newStart || !newEnd) {
      addToast({
        title: 'Dates required',
        description: 'Please pick both a start and end date for the renewed lease.',
        variant: 'destructive',
      });
      return;
    }
    if (new Date(newEnd) <= new Date(newStart)) {
      addToast({
        title: 'Invalid dates',
        description: 'End date must be after start date.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Step 1 — upload fresh agreement if provided. The file is
      // optional: some societies store agreements out of band and
      // only want the lease-end-date update.
      let fileUrl: string | undefined;
      let fileKey: string | undefined;
      if (file) {
        setUploadPercent(0);
        setUploadFailed(false);
        const uploaded = await uploadFile.mutateAsync({
          file,
          onProgress: setUploadPercent,
        });
        fileUrl = uploaded.fileUrl;
        fileKey = uploaded.key;
      }

      // Step 2 — hit the renewal endpoint. The approval request
      // created server-side holds the new dates + doc URL until
      // community_admin or committee_member approves.
      await renew.mutateAsync({
        unit_id: unitId,
        new_lease_start_date: newStart,
        new_lease_end_date: newEnd,
        new_agreement_document_url: fileUrl ?? null,
        new_agreement_document_key: fileKey ?? null,
      });

      addToast({
        title: 'Renewal submitted',
        description:
          'Approval request created. Community admin will see it in the Approvals queue.',
        variant: 'success',
      });
      setFile(null);
      setNewStart('');
      setNewEnd('');
      setUploadPercent(null);
      setUploadFailed(false);
      onClose();
    } catch (err) {
      setUploadFailed(true);
      addToast({
        title: 'Renewal failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew Lease — Unit {unitLabel}</DialogTitle>
          <DialogDescription>
            {tenantName
              ? `Renewing ${tenantName}'s tenancy.`
              : 'Upload the fresh agreement and set the new lease term.'}{' '}
            The renewal goes through the approval queue before the new end
            date takes effect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="renew-start">New lease start</Label>
              <Input
                id="renew-start"
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="renew-end">New lease end</Label>
              <Input
                id="renew-end"
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                min={newStart || undefined}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="renew-file" className="flex items-center gap-1">
              <FileUp className="h-3.5 w-3.5" />
              Fresh agreement (PDF / image / Word — optional)
            </Label>
            <Input
              id="renew-file"
              type="file"
              accept={ACCEPTED_MIME}
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <UploadProgress
              percent={uploadPercent}
              fileName={file?.name}
              state={
                uploadFailed
                  ? 'error'
                  : uploadPercent === 100
                    ? 'done'
                    : 'uploading'
              }
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose>
            <Button variant="outline" disabled={submitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting || !newStart || !newEnd}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploadFile.isPending
              ? 'Uploading…'
              : renew.isPending
                ? 'Submitting…'
                : 'Submit for approval'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
