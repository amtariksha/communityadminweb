'use client';

import { useId, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { FormMode } from './form-mode';

export interface FormFrameProps {
  mode: FormMode;
  title: string;
  description?: ReactNode;
  /** Dialog only: whether it is showing. A page is always showing. */
  open?: boolean;
  /** Cancel (dialog), Close (page), Escape or a click outside the dialog. */
  onClose: () => void;
  /** Save, or Enter in a field. */
  onSave: () => void;
  /** Page only, where the screen has it: save, then start a blank form. */
  onSaveAndNew?: () => void;
  /** A second way to save, in both presentations, e.g. "Save and Close Meeting". */
  secondaryAction?: { label: string; onClick: () => void };
  saving?: boolean;
  /** Save stays disabled, e.g. while a journal does not balance. */
  saveDisabled?: boolean;
  /** The screen's own word for Save, e.g. "Submit". */
  saveLabel?: string;
  /** Shown on the save button while saving, e.g. "Submitting…". */
  savingLabel?: string;
  /** Extra classes for the dialog panel (its width). */
  dialogClassName?: string;
  children: ReactNode;
}

/**
 * The two presentations of one form (SB-07): a dialog with Cancel and
 * Save in the standard layout, a page section with Save, Save and New
 * (where the screen has it) and Close in the classic layout. The form's
 * fields go in as children and validate the same way in both.
 */
export function FormFrame(props: FormFrameProps): ReactNode {
  const { mode, title, description, onClose, onSave, saving = false } = props;
  const { saveLabel = 'Save', savingLabel = 'Saving…' } = props;
  const headingId = useId();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!saving && !props.saveDisabled) onSave();
  }

  const saveButton = (
    <Button type="submit" form={headingId + '-form'} disabled={saving || props.saveDisabled}>
      {saving ? savingLabel : saveLabel}
    </Button>
  );
  const secondary = props.secondaryAction && (
    <Button type="button" variant="outline" disabled={saving} onClick={props.secondaryAction.onClick}>
      {props.secondaryAction.label}
    </Button>
  );
  const form = (
    <form id={headingId + '-form'} aria-labelledby={headingId} noValidate onSubmit={submit} className="space-y-4">
      {props.children}
    </form>
  );

  if (mode === 'dialog') {
    return (
      <Dialog open={props.open ?? false} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={cn('max-h-[85vh] overflow-y-auto', props.dialogClassName)}>
          <DialogHeader>
            <DialogTitle id={headingId}>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="py-4">{form}</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {secondary}
            {saveButton}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1">
          <h2 id={headingId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        {form}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {saveButton}
          {secondary}
          {props.onSaveAndNew && (
            <Button type="button" variant="outline" disabled={saving} onClick={props.onSaveAndNew}>
              Save and New
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
