'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useRemovePurchaseRequestAttachment } from '@/hooks/use-purchase-requests';
import { ApiError, friendlyError } from '@/lib/api-error';

/** An API without the route answers Nest's own 404 ("Cannot DELETE …"), not the service's "File not found". */
function isMissingRoute(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && /^Cannot DELETE /.test(error.message);
}

/**
 * Remove on a file already attached to a saved request (EXP-S6). The API
 * keeps the row on file and drops it from the request (migration 224); the
 * refreshed request comes back and replaces the cached one.
 */
export function useRemoveQuotation(requestId: string | null | undefined) {
  const removal = useRemovePurchaseRequestAttachment();
  const { addToast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeAttached(attachmentId: string): Promise<void> {
    if (!requestId) return;
    setRemovingId(attachmentId);
    try {
      await removal.mutateAsync({ id: requestId, attachmentId });
      addToast({ title: 'File removed', variant: 'success' });
    } catch (error) {
      addToast(
        isMissingRoute(error)
          ? { title: 'Removing a file is not available yet', variant: 'warning' }
          : { title: 'Could not remove the file', description: friendlyError(error), variant: 'destructive' },
      );
    } finally {
      setRemovingId(null);
    }
  }

  return { removingId, removeAttached };
}
