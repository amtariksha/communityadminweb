'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  announcementState,
  useAnnouncementChannels,
  useBlocks,
  useCreateAnnouncement,
  useNotificationChannels,
  usePublishAnnouncement,
  useUnitBlocks,
  useUpdateAnnouncement,
  type Announcement,
  type AnnouncementChannel,
} from '@/hooks';
import { useToast } from '@/components/ui/toast';
import { friendlyError } from '@/lib/api-error';
import {
  blankDraft,
  draftFrom,
  goesByEmail,
  noticePayload,
  validateNotice,
  type NoticeDraft,
  type NoticeErrors,
} from './notice-form-state';
import { storedFiles, useNoticeFiles } from './use-notice-files';

const FALLBACK_CHANNELS: readonly AnnouncementChannel[] = ['push', 'email'];

/** The society's blocks: the block master (SB-10), else the blocks on units. */
function useBlockNames(): string[] {
  const master = useUnitBlocks();
  const legacy = useBlocks();
  return useMemo(() => {
    const fromMaster = master.data?.data?.map((block) => block.name);
    return fromMaster && fromMaster.length > 0 ? fromMaster : legacy.data ?? [];
  }, [master.data, legacy.data]);
}

function postedMessage(row: Announcement | undefined): string {
  return row && announcementState(row) === 'awaiting_approval' ? 'Sent for approval' : 'Announcement posted';
}

/**
 * Create / Edit Announcement (ANN-S5): the draft, its files and the two
 * ways to save — Save as Draft and Post (Post goes through the approval
 * gate: live and sent, or Awaiting Approval).
 */
export function useNoticeEditor(opts: { notice?: Announcement; classic: boolean; onSaved: () => void }) {
  const { addToast } = useToast();
  const setup = useAnnouncementChannels();
  const channels = useNotificationChannels();
  const defaults = setup.data?.default_channels ?? FALLBACK_CHANNELS;
  const [draft, setDraft] = useState<NoticeDraft>(() => (opts.notice ? draftFrom(opts.notice) : blankDraft(defaults)));
  const [errors, setErrors] = useState<NoticeErrors>({});
  const files = useNoticeFiles(storedFiles(opts.notice?.attachment_urls, opts.notice?.attachment_names));
  const blocks = useBlockNames();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const publish = usePublishAnnouncement();
  const emailed = goesByEmail(draft, opts.classic, defaults);
  const editing = Boolean(opts.notice);

  // A new notice's "Send by" ticks start from Setup's defaults once they load.
  const synced = useRef(editing);
  useEffect(() => {
    if (synced.current || !setup.data) return;
    synced.current = true;
    const loaded = setup.data.default_channels;
    setDraft((current) => ({ ...current, email: loaded.includes('email'), sms: loaded.includes('sms_general') }));
  }, [setup.data]);

  function change(patch: Partial<NoticeDraft>): void {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function reset(): void {
    setDraft(blankDraft(defaults));
    setErrors({});
    files.reset();
  }

  async function payload() {
    const found = validateNotice(draft, emailed);
    setErrors(found);
    if (Object.keys(found).length > 0) return null;
    const stored = await files.storeAll();
    if (!stored) {
      addToast({ title: 'A file could not be uploaded', description: 'Retry it or remove it.', variant: 'destructive' });
      return null;
    }
    return { ...noticePayload(draft, { classic: opts.classic, editing }), attachment_urls: stored.urls, attachment_names: stored.names };
  }

  async function save(post: boolean): Promise<void> {
    const body = await payload();
    if (!body) return;
    try {
      let row: Announcement | undefined;
      if (opts.notice) {
        row = (await update.mutateAsync({ id: opts.notice.id, ...body })).data;
        if (post) row = (await publish.mutateAsync({ id: opts.notice.id })).data;
      } else {
        row = (await create.mutateAsync({ ...body, title: body.title ?? '', body: body.body ?? '', publish_now: post })).data;
      }
      addToast({ title: post ? postedMessage(row) : editing ? 'Announcement saved' : 'Saved as draft', variant: 'success' });
      opts.onSaved();
    } catch (error) {
      addToast({ title: 'The announcement was not saved', description: friendlyError(error), variant: 'destructive' });
    }
  }

  return {
    draft,
    change,
    errors,
    files,
    blocks,
    emailed,
    smsAvailable: channels.data?.sms ?? false,
    saving: create.isPending || update.isPending || publish.isPending,
    saveDraft: () => save(false),
    post: () => save(true),
    reset,
  };
}

export type NoticeEditor = ReturnType<typeof useNoticeEditor>;
