'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EscalationRow, EscalationRowInput, HelpdeskAssignee } from '@/hooks';

const WHOLE_HOURS_MESSAGE = 'Enter whole hours from 1 to 720.';
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

/** The editor's fields as typed: hours stay text until they are checked. */
export interface EscalationDraft {
  ownerL1: string;
  windowL1L2: string;
  ownerL2: string;
  windowL2L3: string;
  ownerL3: string;
  slaHours: string;
  defaultPriority: string;
}

export type EscalationDraftErrors = Partial<Record<keyof EscalationDraft, string>>;

function isWholeHours(text: string): boolean {
  if (!/^\d+$/.test(text.trim())) return false;
  const value = Number(text);
  return value >= 1 && value <= 720;
}

/**
 * What is wrong with the draft, by field. Mirrors the API, which refuses a
 * window that has nowhere to send the request.
 */
export function validateEscalationDraft(draft: EscalationDraft): EscalationDraftErrors {
  const errors: EscalationDraftErrors = {};
  const first = draft.windowL1L2.trim();
  const second = draft.windowL2L3.trim();

  if (!draft.ownerL1) errors.ownerL1 = 'Choose the Level 1 owner.';
  if (first && !isWholeHours(first)) errors.windowL1L2 = WHOLE_HOURS_MESSAGE;
  if (second && !isWholeHours(second)) errors.windowL2L3 = WHOLE_HOURS_MESSAGE;
  if (!isWholeHours(draft.slaHours)) errors.slaHours = WHOLE_HOURS_MESSAGE;

  if (first && !errors.windowL1L2 && !draft.ownerL2) {
    errors.ownerL2 = 'Choose the Level 2 owner for this window.';
  }
  if (second && !errors.windowL2L3) {
    if (!first) {
      errors.windowL2L3 = 'Set the Level 1 to Level 2 window first.';
    } else if (!draft.ownerL3) {
      errors.ownerL3 = 'Choose the Level 3 owner for this window.';
    }
  }
  return errors;
}

function draftFrom(row: EscalationRow): EscalationDraft {
  return {
    ownerL1: row.owner_l1_user_id ?? '',
    windowL1L2: row.escalation_l1_l2_hours?.toString() ?? '',
    ownerL2: row.owner_l2_user_id ?? '',
    windowL2L3: row.escalation_l2_l3_hours?.toString() ?? '',
    ownerL3: row.owner_l3_user_id ?? '',
    slaHours: (row.sla_hours ?? 24).toString(),
    defaultPriority: row.default_priority ?? 'medium',
  };
}

function toInput(draft: EscalationDraft): EscalationRowInput {
  const hours = (text: string): number | null => (text.trim() ? Number(text) : null);
  return {
    owner_l1_user_id: draft.ownerL1,
    escalation_l1_l2_hours: hours(draft.windowL1L2),
    owner_l2_user_id: draft.ownerL2 || null,
    escalation_l2_l3_hours: hours(draft.windowL2L3),
    owner_l3_user_id: draft.ownerL3 || null,
    sla_hours: Number(draft.slaHours),
    default_priority: draft.defaultPriority,
  };
}

interface EscalationRowEditorProps {
  /** The row being viewed or edited; null keeps the dialog closed. */
  row: EscalationRow | null;
  owners: readonly HelpdeskAssignee[];
  canEdit: boolean;
  isSaving: boolean;
  onSave: (categoryId: string, body: EscalationRowInput) => Promise<void>;
  onClose: () => void;
}

export function EscalationRowEditor(props: EscalationRowEditorProps): ReactNode {
  return (
    <Dialog open={props.row !== null} onOpenChange={(open) => !open && props.onClose()}>
      {/* A new draft for each row: the form remounts when the row changes. */}
      {props.row && <EditorForm key={props.row.category_id} {...props} row={props.row} />}
    </Dialog>
  );
}

function OwnerSelect(props: {
  label: string;
  value: string;
  owners: readonly HelpdeskAssignee[];
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.label}>{props.label}</Label>
      <select
        id={props.label}
        value={props.value}
        disabled={props.disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="">{props.label === 'Owner L1' ? 'Select owner...' : 'None'}</option>
        {props.owners.map((owner) => (
          <option key={owner.user_id} value={owner.user_id}>
            {owner.name ?? 'Unnamed'}
          </option>
        ))}
      </select>
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
}

function HoursField(props: {
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}): ReactNode {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.label}>{props.label}</Label>
      <Input
        id={props.label}
        type="number"
        min={1}
        max={720}
        inputMode="numeric"
        disabled={props.disabled}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.error && <p className="text-xs text-destructive">{props.error}</p>}
    </div>
  );
}

function EditorForm({
  row,
  owners,
  canEdit,
  isSaving,
  onSave,
  onClose,
}: EscalationRowEditorProps & { row: EscalationRow }): ReactNode {
  const [draft, setDraft] = useState<EscalationDraft>(() => draftFrom(row));
  const [errors, setErrors] = useState<EscalationDraftErrors>({});
  const set = (patch: Partial<EscalationDraft>): void => setDraft((current) => ({ ...current, ...patch }));

  async function handleSave(): Promise<void> {
    const found = validateEscalationDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await onSave(row.category_id, toInput(draft));
  }

  const readOnly = !canEdit;
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle>{row.category_name}</DialogTitle>
        <DialogDescription>
          Who handles requests in this category, and how long each level has before the request moves on.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <OwnerSelect label="Owner L1" value={draft.ownerL1} owners={owners} disabled={readOnly}
          error={errors.ownerL1} onChange={(ownerL1) => set({ ownerL1 })} />
        <HoursField label="Escalation Window L1 to L2 (hours)" value={draft.windowL1L2} disabled={readOnly}
          error={errors.windowL1L2} onChange={(windowL1L2) => set({ windowL1L2 })} />
        <OwnerSelect label="Owner L2" value={draft.ownerL2} owners={owners} disabled={readOnly}
          error={errors.ownerL2} onChange={(ownerL2) => set({ ownerL2 })} />
        <HoursField label="Escalation Window L2 to L3 (hours)" value={draft.windowL2L3} disabled={readOnly}
          error={errors.windowL2L3} onChange={(windowL2L3) => set({ windowL2L3 })} />
        <OwnerSelect label="Owner L3" value={draft.ownerL3} owners={owners} disabled={readOnly}
          error={errors.ownerL3} onChange={(ownerL3) => set({ ownerL3 })} />
        <HoursField label="Resolve within (hours)" value={draft.slaHours} disabled={readOnly}
          error={errors.slaHours} onChange={(slaHours) => set({ slaHours })} />
        <div className="space-y-1">
          <Label htmlFor="Default priority">Default priority</Label>
          <select
            id="Default priority"
            value={draft.defaultPriority}
            disabled={readOnly}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(event) => set({ defaultPriority: event.target.value })}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {canEdit && (
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            Save
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
