'use client';

import { useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { Button } from '@/components/ui/button';
import { announcementState, type Announcement } from '@/hooks';
import { NoticeForm } from './notice-form';
import { NoticePreviewDialog } from './notice-preview';
import { useNoticeEditor } from './use-notice-editor';

export interface NoticeEditorProps {
  mode: FormMode;
  /** Editing this notice; a new notice when absent. */
  notice?: Announcement;
  open?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create / Edit Announcement (ANN-S5) in its two presentations (SB-07):
 * a dialog with Preview · Save as Draft · Post in standard, a page with
 * Preview · Post in classic (no channel choice: the Setup defaults apply).
 * A posted notice's edit only saves.
 */
export function NoticeEditor(props: NoticeEditorProps): ReactNode {
  const classic = props.mode === 'page';
  const editor = useNoticeEditor({ notice: props.notice, classic, onSaved: props.onSaved });
  const [previewing, setPreviewing] = useState(false);
  const posted = props.notice !== undefined && announcementState(props.notice) !== 'draft';
  const isDraftEdit = props.notice !== undefined && !posted;

  return (
    <>
      <FormFrame
        mode={props.mode}
        title={props.notice ? 'Edit Announcement' : classic ? 'Create Announcement' : 'New Announcement'}
        open={props.open}
        onClose={props.onClose}
        onSave={posted ? editor.saveDraft : editor.post}
        saveLabel={posted ? 'Save' : 'Post'}
        savingLabel={posted ? 'Saving…' : 'Posting…'}
        saving={editor.saving}
        secondaryAction={!classic && !posted ? { label: isDraftEdit ? 'Save Draft' : 'Save as Draft', onClick: editor.saveDraft } : undefined}
        dialogClassName="max-w-2xl"
      >
        <NoticeForm
          draft={editor.draft}
          onChange={editor.change}
          errors={editor.errors}
          classic={classic}
          blocks={editor.blocks}
          emailed={editor.emailed}
          smsAvailable={editor.smsAvailable}
          files={editor.files}
        />
        <Button type="button" variant="outline" onClick={() => setPreviewing(true)}>
          Preview
        </Button>
      </FormFrame>
      <NoticePreviewDialog
        open={previewing}
        onClose={() => setPreviewing(false)}
        notice={{
          title: editor.draft.title,
          body: editor.draft.body,
          expiresAt: editor.draft.expiresAt || null,
          attachmentNames: editor.files.files.map((file) => file.name),
        }}
      />
    </>
  );
}
