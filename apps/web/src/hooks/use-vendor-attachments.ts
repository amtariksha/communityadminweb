'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** VEND-08 — a vendor's files (up to five PDF / JPEG / PNG, 5 MB each). */
export interface VendorAttachment {
  id: string;
  file_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by_name: string | null;
}

export const MAX_VENDOR_FILES = 5;
export const MAX_VENDOR_FILE_BYTES = 5 * 1024 * 1024;
export const VENDOR_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const vendorAttachmentKeys = {
  list: (vendorId: string) => ['vendors', 'attachments', vendorId] as const,
};

export function useVendorAttachments(vendorId: string) {
  return useQuery({
    queryKey: vendorAttachmentKeys.list(vendorId),
    queryFn: function fetchVendorAttachments() {
      return api.get<{ data: VendorAttachment[] }>(`/vendors/${vendorId}/attachments`).then((res) => res.data);
    },
    enabled: Boolean(vendorId),
    retry: false,
  });
}

interface AttachInput {
  file_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}

export function useAddVendorAttachment(vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function addVendorAttachment(input: AttachInput) {
      return api.post<{ data: VendorAttachment[] }>(`/vendors/${vendorId}/attachments`, input);
    },
    onSuccess(result) {
      queryClient.setQueryData(vendorAttachmentKeys.list(vendorId), result.data);
    },
  });
}

export function useRemoveVendorAttachment(vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function removeVendorAttachment(attachmentId: string) {
      return api.delete<{ data: VendorAttachment[] }>(`/vendors/${vendorId}/attachments/${attachmentId}`);
    },
    onSuccess(result) {
      queryClient.setQueryData(vendorAttachmentKeys.list(vendorId), result.data);
    },
  });
}

/** A signed link to download one stored file by its key. */
export async function vendorFileLink(file: Pick<VendorAttachment, 'file_key' | 'file_name'>): Promise<string> {
  const response = await api.post<{ data: { downloadUrl: string } }>('/upload/download-url', {
    key: file.file_key,
    disposition: 'attachment',
    file_name: file.file_name,
  });
  return response.data.downloadUrl;
}

/** The picked file may be attached, or why not. */
export function vendorFileProblem(file: Pick<File, 'name' | 'type' | 'size'>, alreadyHeld: number): string | null {
  if (!(VENDOR_FILE_TYPES as readonly string[]).includes(file.type)) return `${file.name}: attach a PDF, JPEG or PNG`;
  if (file.size > MAX_VENDOR_FILE_BYTES) return `${file.name}: each file must be 5 MB or smaller`;
  if (alreadyHeld >= MAX_VENDOR_FILES) return 'A vendor can hold five files';
  return null;
}
