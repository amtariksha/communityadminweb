'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useAddMeetingAttachment, useRemoveMeetingAttachment } from '@/hooks/use-meeting-invites';
import type { MeetingDetail } from '@/hooks/use-meetings';
import { friendlyError } from '@/lib/api-error';
import { FileAttachButton, StoredFileLinks, type UploadedFile } from '../stored-files';

export const MAX_MEETING_FILES = 5;

/**
 * A meeting's attachments (PROJ-44): up to five files, added and removed
 * while the meeting is open; readable by whoever may read the meeting.
 * Absent on an API older than PROJ-44.
 */
export function MeetingAttachments({ meeting, editable }: { meeting: MeetingDetail; editable: boolean }): ReactNode {
  const { addToast } = useToast();
  const add = useAddMeetingAttachment();
  const remove = useRemoveMeetingAttachment();
  const files = meeting.attachments;
  if (!files) return null;
  const fail = (title: string) => (error: unknown) => addToast({ title, description: friendlyError(error), variant: 'destructive' });

  async function uploaded(chosen: UploadedFile[]): Promise<void> {
    for (const file of chosen) {
      try {
        await add.mutateAsync({ meetingId: meeting.id, file });
      } catch (error) {
        return fail('Could not attach the file')(error);
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.length === 0 && <p className="text-sm text-muted-foreground">No files attached.</p>}
        <StoredFileLinks files={files.map((file) => ({ url: file.file_url, name: file.file_name }))} />
        {editable && (
          <div className="flex flex-wrap items-center gap-2">
            <FileAttachButton room={MAX_MEETING_FILES - files.length} disabled={add.isPending} onUploaded={(chosen) => void uploaded(chosen)} label="Attach a file" />
            {files.map((file) => (
              <Button
                key={file.id}
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${file.file_name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ meetingId: meeting.id, attachmentId: file.id }, { onError: fail('Could not remove the file') })}
              >
                <X className="mr-1 h-3 w-3" />
                {file.file_name}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
