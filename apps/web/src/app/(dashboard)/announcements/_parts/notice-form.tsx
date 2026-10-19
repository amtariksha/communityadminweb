'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { todayIST } from '@/lib/date';
import { useWord } from '@/lib/vocabulary';
import {
  CATEGORY_OPTIONS,
  CLASSIFICATION_HELP,
  CLASSIFICATION_LABELS,
  PRIORITY_OPTIONS,
  recipientChoices,
} from './labels';
import { NoticeAttachments } from './notice-attachments';
import { choiceOf, type NoticeDraft, type NoticeErrors } from './notice-form-state';
import type { NoticeFiles } from './use-notice-files';

export interface NoticeFormProps {
  draft: NoticeDraft;
  onChange: (patch: Partial<NoticeDraft>) => void;
  errors: NoticeErrors;
  /** Classic: radios, no category / priority / pin / channel choice (the Setup defaults apply). */
  classic: boolean;
  /** The society's blocks (SB-10), for the "… of Block" choices. */
  blocks: readonly string[];
  /** Whether the notice goes by email (its ticks, or the Setup defaults in classic). */
  emailed: boolean;
  /** SMS is set up on this server (GET /notifications/channels). */
  smsAvailable: boolean;
  files: NoticeFiles;
}

function FieldError({ id, message }: { id: string; message?: string }): ReactNode {
  return message ? <p id={id} className="text-xs text-destructive">{message}</p> : null;
}

function RecipientsField({ draft, onChange, classic, blocks, errors }: NoticeFormProps): ReactNode {
  const choices = recipientChoices(classic);
  const byBlock = choiceOf(draft).byBlock;
  const toggleBlock = (block: string, on: boolean) =>
    onChange({ blocks: on ? [...draft.blocks, block] : draft.blocks.filter((b) => b !== block) });
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Recipients</legend>
      {classic ? (
        <div className="grid gap-1 sm:grid-cols-2">
          {choices.map((choice) => (
            <label key={choice.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="notice-recipients" checked={draft.recipient === choice.value}
                onChange={() => onChange({ recipient: choice.value })} />
              {choice.label}
            </label>
          ))}
        </div>
      ) : (
        <Select id="form-audience" aria-label="Recipients" value={draft.recipient} onChange={(e) => onChange({ recipient: e.target.value })}>
          {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </Select>
      )}
      {byBlock && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Block</p>
          {blocks.length === 0 && <p className="text-xs text-muted-foreground">No blocks are set up for this society.</p>}
          <div className="flex flex-wrap gap-3">
            {blocks.map((block) => (
              <label key={block} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={draft.blocks.includes(block)} onChange={(e) => toggleBlock(block, e.target.checked)} />
                {block}
              </label>
            ))}
          </div>
          <FieldError id="notice-blocks-error" message={errors.blocks} />
        </div>
      )}
    </fieldset>
  );
}

function ChannelsField({ draft, onChange, smsAvailable, classification }: NoticeFormProps & { classification: string }): ReactNode {
  const promotional = classification === 'promotional';
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">Send by</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked disabled /> Push notification
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.email} onChange={(e) => onChange({ email: e.target.checked })} /> Email
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.sms && smsAvailable} disabled={!smsAvailable}
          onChange={(e) => onChange({ sms: e.target.checked })} /> General SMS
      </label>
      {!smsAvailable && <p className="text-xs text-muted-foreground">SMS is not set up.</p>}
      {smsAvailable && promotional && draft.sms && (
        <p className="text-xs text-muted-foreground">A promotional notice is never sent by SMS.</p>
      )}
    </fieldset>
  );
}

function ClassificationField({ draft, onChange, errors }: NoticeFormProps): ReactNode {
  return (
    <fieldset className="space-y-1" aria-describedby="notice-classification-help">
      <legend className="text-sm font-medium">Classification</legend>
      <div className="flex gap-4">
        {(['official', 'promotional'] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="notice-classification" checked={draft.classification === value}
              onChange={() => onChange({ classification: value })} />
            {CLASSIFICATION_LABELS[value]}
          </label>
        ))}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">What is the difference?</summary>
        <p id="notice-classification-help">{CLASSIFICATION_HELP}</p>
      </details>
      <FieldError id="notice-classification-error" message={errors.classification} />
    </fieldset>
  );
}

function StandardExtras({ draft, onChange }: NoticeFormProps): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="form-category">Category</Label>
        <Select id="form-category" value={draft.category} onChange={(e) => onChange({ category: e.target.value })}>
          {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-priority">Priority</Label>
        <Select id="form-priority" value={draft.priority} onChange={(e) => onChange({ priority: e.target.value })}>
          {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.isPinned} onChange={(e) => onChange({ isPinned: e.target.checked })} />
        Pin to top
      </label>
    </div>
  );
}

/** The fields of Create / Edit Announcement (ANN-S5), for the dialog and the page alike. */
export function NoticeForm(props: NoticeFormProps): ReactNode {
  const { draft, onChange, errors, classic, emailed } = props;
  const word = useWord();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="form-title">Title</Label>
        <Input id="form-title" value={draft.title} maxLength={255} aria-invalid={Boolean(errors.title)}
          onChange={(e) => onChange({ title: e.target.value })} />
        <FieldError id="notice-title-error" message={errors.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-body">{word('Body')}</Label>
        <Textarea id="form-body" rows={5} value={draft.body} maxLength={10000} aria-invalid={Boolean(errors.body)}
          onChange={(e) => onChange({ body: e.target.value })} />
        <FieldError id="notice-body-error" message={errors.body} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-expires">Expiry Date</Label>
        <Input id="form-expires" type="date" value={draft.expiresAt} min={todayIST()} aria-describedby="form-expires-hint"
          onChange={(e) => onChange({ expiresAt: e.target.value })} />
        <p id="form-expires-hint" className="text-xs text-muted-foreground">Expires at the end of this day</p>
      </div>
      <RecipientsField {...props} />
      <ClassificationField {...props} />
      {!classic && <StandardExtras {...props} />}
      {!classic && <ChannelsField {...props} classification={draft.classification} />}
      {emailed && (
        <div className="space-y-2">
          <Label htmlFor="form-reply-to">Reply To Email</Label>
          <Input id="form-reply-to" type="email" value={draft.replyTo} aria-invalid={Boolean(errors.replyTo)}
            onChange={(e) => onChange({ replyTo: e.target.value })} />
          <FieldError id="notice-reply-error" message={errors.replyTo} />
        </div>
      )}
      <NoticeAttachments files={props.files} />
    </div>
  );
}
