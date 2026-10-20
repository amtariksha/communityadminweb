'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface TextDecisionProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  /** Reject needs a reason; Approve's comment is optional. */
  required: boolean;
  maxLength: number;
  actionLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: (text: string) => void;
  onClose: () => void;
}

/** A confirm with one text box: Approve (optional comment) or Reject (reason required). */
export function TextDecisionDialog(props: TextDecisionProps): ReactNode {
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const missing = props.required && trimmed.length === 0;
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decision-text">{props.label}</Label>
          <Textarea id="decision-text" rows={3} maxLength={props.maxLength} value={text} onChange={(event) => setText(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={props.destructive ? 'destructive' : 'default'}
            disabled={missing || props.busy}
            onClick={() => props.onConfirm(trimmed)}
          >
            {props.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

