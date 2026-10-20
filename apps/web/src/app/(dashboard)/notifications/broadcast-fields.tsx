'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RECIPIENT_CHOICES, recipientChoices } from '../announcements/_parts/labels';

/**
 * The Broadcast composer's recipients, channel and SMS length (ANN-S7,
 * ANN-08). Channels: classic shows theirs (Email · General SMS · Essential
 * SMS · App Notification); standard keeps its four and adds the two SMS ones.
 */
export const SMS_CHANNELS: ReadonlySet<string> = new Set(['sms_general', 'sms_essential']);

const STANDARD_CHANNELS = [
  { value: 'in_app', label: 'In-app only' },
  { value: 'push', label: 'In-app + Push' },
  { value: 'email', label: 'In-app + Email' },
  { value: 'both', label: 'In-app + Push + Email' },
  { value: 'sms_general', label: 'In-app + General SMS' },
  { value: 'sms_essential', label: 'In-app + Essential SMS' },
] as const;

const CLASSIC_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms_general', label: 'General SMS' },
  { value: 'sms_essential', label: 'Essential SMS' },
  { value: 'push', label: 'App Notification' },
] as const;

export function channelOptions(classic: boolean, mayEssential: boolean) {
  const list = classic ? CLASSIC_CHANNELS : STANDARD_CHANNELS;
  return list.filter((option) => option.value !== 'sms_essential' || mayEssential);
}

export function recipientAudience(recipient: string): { audience: string; byBlock: boolean } {
  const choice = RECIPIENT_CHOICES.find((c) => c.value === recipient) ?? RECIPIENT_CHOICES[0];
  return { audience: choice.audience, byBlock: choice.byBlock };
}

export function BroadcastRecipients(props: {
  recipient: string;
  blocks: readonly string[];
  allBlocks: readonly string[];
  classic: boolean;
  onChange: (patch: { recipient?: string; blocks?: string[] }) => void;
}): ReactNode {
  const { byBlock } = recipientAudience(props.recipient);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Recipients</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {recipientChoices(props.classic).map((choice) => (
          <label key={choice.value} className="flex items-center gap-2 text-sm">
            <input type="radio" name="broadcast-recipients" checked={props.recipient === choice.value}
              onChange={() => props.onChange({ recipient: choice.value, blocks: [] })} />
            {choice.label}
          </label>
        ))}
      </div>
      {byBlock && (
        <div className="space-y-1">
          <Label htmlFor="broadcast-block">Block</Label>
          <Select id="broadcast-block" value={props.blocks[0] ?? ''} onChange={(e) => props.onChange({ blocks: e.target.value ? [e.target.value] : [] })}>
            <option value="">Choose a block</option>
            {props.allBlocks.map((block) => <option key={block} value={block}>{block}</option>)}
          </Select>
        </div>
      )}
    </fieldset>
  );
}

export function BroadcastChannel(props: {
  channel: string;
  classic: boolean;
  smsAvailable: boolean;
  mayEssential: boolean;
  onChange: (channel: string) => void;
}): ReactNode {
  const options = channelOptions(props.classic, props.mayEssential);
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">Channel</legend>
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <input type="radio" name="broadcast-channel" value={option.value} checked={props.channel === option.value}
            disabled={SMS_CHANNELS.has(option.value) && !props.smsAvailable} onChange={() => props.onChange(option.value)} />
          {option.label}
        </label>
      ))}
      {!props.smsAvailable && <p className="text-xs text-muted-foreground">SMS is not set up.</p>}
    </fieldset>
  );
}

/** The SMS's length against SMS_MESSAGE_MAX, and the text exactly as it will go. */
export function SmsPreview({ body, max }: { body: string; max: number }): ReactNode {
  const text = body.replace(/\s+/g, ' ').trim();
  const over = text.length > max;
  return (
    <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
      <p className={over ? 'text-destructive' : 'text-muted-foreground'}>
        {text.length} / {max} characters{over ? ' — too long for an SMS' : ''}
      </p>
      <p aria-label="SMS preview">{text.slice(0, max)}</p>
    </div>
  );
}

export function smsTooLong(body: string, max: number): boolean {
  return body.replace(/\s+/g, ' ').trim().length > max;
}

/** Send's confirmation, with how many people the recipients name. */
export function BroadcastConfirm(props: {
  open: boolean;
  count: number | null | undefined;
  loading: boolean;
  sending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}): ReactNode {
  const none = props.count === 0;
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send this message?</DialogTitle>
          <DialogDescription>
            {props.loading
              ? 'Counting recipients…'
              : props.count === null || props.count === undefined
                ? 'It goes to everyone the recipients name.'
                : none
                  ? 'No one matches these recipients.'
                  : `It goes to ${props.count} ${props.count === 1 ? 'person' : 'people'}.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button type="button" disabled={props.loading || none || props.sending} onClick={props.onConfirm}>
            {props.sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * UNIT-37 — "Third-party deal or offer": residents who withdrew Third-Party
 * Deals and Offers (Consent Activity) get this message on no channel.
 */
export function BroadcastPromotional(props: { checked: boolean; onChange: (checked: boolean) => void }): ReactNode {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-0.5" checked={props.checked} onChange={(event) => props.onChange(event.target.checked)} />
      <span>
        Third-party deal or offer
        <span className="block text-xs text-muted-foreground">Not sent to residents who withdrew consent to third-party deals and offers.</span>
      </span>
    </label>
  );
}
