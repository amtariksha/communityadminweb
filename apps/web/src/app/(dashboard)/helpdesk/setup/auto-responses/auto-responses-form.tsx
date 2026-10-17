'use client';

import { useState, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  HelpdeskCategory,
  HelpdeskCategoryRow,
  HelpdeskSettings,
  HelpdeskSettingsUpdate,
} from '@/hooks';

const MAX_REPLY_LENGTH = 1000;

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
] as const;

/** What the form saves: the settings, and the category rows when a reply changed. */
export interface AutoResponsesPayload {
  settings: HelpdeskSettingsUpdate & { auto_reply_outside_hours_text?: string };
  categoryRows: HelpdeskCategoryRow[] | null;
}

interface AutoResponsesFormProps {
  settings: HelpdeskSettings;
  categories: readonly HelpdeskCategory[];
  canEdit: boolean;
  isSaving: boolean;
  onSave: (payload: AutoResponsesPayload) => Promise<void> | void;
}

interface FieldErrors {
  message?: string;
  days?: string;
  hours?: string;
  replies: Record<string, string>;
}

const clock = (time: string): string => time.slice(0, 5);

function validate(input: {
  outsideOn: boolean;
  message: string;
  days: readonly string[];
  start: string;
  end: string;
  replies: Record<string, string>;
}): FieldErrors {
  const errors: FieldErrors = { replies: {} };
  if (input.outsideOn) {
    if (!input.message.trim()) errors.message = 'Write the message residents get outside office hours.';
    if (input.days.length === 0) errors.days = 'Choose at least one office day.';
  }
  if (!input.start || !input.end || input.start >= input.end) {
    errors.hours = 'Office hours must end after they start.';
  }
  for (const [id, reply] of Object.entries(input.replies)) {
    if (reply.length > MAX_REPLY_LENGTH) {
      errors.replies[id] = `A reply can be at most ${MAX_REPLY_LENGTH} characters.`;
    }
  }
  return errors;
}

const hasErrors = (errors: FieldErrors): boolean =>
  Boolean(errors.message || errors.days || errors.hours || Object.keys(errors.replies).length > 0);

export function AutoResponsesForm({
  settings,
  categories,
  canEdit,
  isSaving,
  onSave,
}: AutoResponsesFormProps): ReactNode {
  const [outsideOn, setOutsideOn] = useState(settings.auto_reply_outside_hours);
  const [days, setDays] = useState<string[]>(settings.operational_days);
  const [start, setStart] = useState(clock(settings.operational_hours_start));
  const [end, setEnd] = useState(clock(settings.operational_hours_end));
  const [message, setMessage] = useState(settings.auto_reply_outside_hours_text ?? '');
  const [byCategory, setByCategory] = useState(settings.auto_reply_by_category);
  const [replies, setReplies] = useState<Record<string, string>>(() =>
    Object.fromEntries(categories.map((category) => [category.id, category.auto_reply_text ?? ''])),
  );
  const [errors, setErrors] = useState<FieldErrors>({ replies: {} });

  const replyChanged = categories.some(
    (category) => (replies[category.id] ?? '').trim() !== (category.auto_reply_text ?? '').trim(),
  );

  async function handleSave(): Promise<void> {
    const found = validate({ outsideOn, message, days, start, end, replies });
    setErrors(found);
    if (hasErrors(found)) return;

    const text = message.trim();
    await onSave({
      settings: {
        auto_reply_outside_hours: outsideOn,
        ...(text ? { auto_reply_outside_hours_text: text } : {}),
        operational_days: DAYS.map((day) => day.key).filter((key) => days.includes(key)),
        operational_hours_start: start,
        operational_hours_end: end,
        auto_reply_by_category: byCategory,
      },
      categoryRows: replyChanged ? replyRows(categories, replies) : null,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Enable Automated Responses</h2>
        <p className="text-sm text-muted-foreground">
          Residents get an automatic reply in their request thread when they raise a request.
        </p>
      </div>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4"
            aria-label="Auto-response for requests raised outside office hours"
            disabled={!canEdit}
            checked={outsideOn}
            onChange={(event) => setOutsideOn(event.target.checked)}
          />
          Auto-response for requests raised outside office hours
        </label>
        {outsideOn && (
          <div className="space-y-4 rounded-md border p-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Office days</legend>
              <div className="flex flex-wrap gap-4">
                {DAYS.map((day) => (
                  <label key={day.key} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      disabled={!canEdit}
                      checked={days.includes(day.key)}
                      onChange={(event) =>
                        setDays((current) =>
                          event.target.checked ? [...current, day.key] : current.filter((key) => key !== day.key),
                        )
                      }
                    />
                    {day.label}
                  </label>
                ))}
              </div>
              {errors.days && <p role="alert" className="text-xs text-destructive">{errors.days}</p>}
            </fieldset>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="office-from">Office hours from</Label>
                <Input id="office-from" type="time" disabled={!canEdit} value={start} onChange={(event) => setStart(event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="office-to">Office hours to</Label>
                <Input id="office-to" type="time" disabled={!canEdit} value={end} onChange={(event) => setEnd(event.target.value)} />
              </div>
            </div>
            {errors.hours && <p role="alert" className="text-xs text-destructive">{errors.hours}</p>}
            <div className="space-y-1">
              <Label htmlFor="outside-hours-message">Outside-hours message</Label>
              <Textarea
                id="outside-hours-message"
                rows={4}
                maxLength={MAX_REPLY_LENGTH}
                disabled={!canEdit}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              {errors.message && <p role="alert" className="text-xs text-destructive">{errors.message}</p>}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4"
            aria-label="Category-Specific Responses"
            disabled={!canEdit}
            checked={byCategory}
            onChange={(event) => setByCategory(event.target.checked)}
          />
          Category-Specific Responses
        </label>
        {byCategory && (
          <CategoryReplies
            categories={categories}
            replies={replies}
            errors={errors.replies}
            canEdit={canEdit}
            onChange={(id, text) => setReplies((current) => ({ ...current, [id]: text }))}
          />
        )}
      </section>

      {canEdit && (
        <Button type="button" disabled={isSaving} onClick={handleSave}>
          <Save className="mr-1 h-4 w-4" /> Save Changes
        </Button>
      )}
    </div>
  );
}

/** Every category that has an owner, with its reply as typed. */
function replyRows(
  categories: readonly HelpdeskCategory[],
  replies: Record<string, string>,
): HelpdeskCategoryRow[] {
  return categories.flatMap((category) =>
    category.owner_l1_user_id
      ? [
          {
            id: category.id,
            name: category.name,
            owner_l1_user_id: category.owner_l1_user_id,
            display_order: category.display_order,
            auto_reply_text: (replies[category.id] ?? '').trim(),
          },
        ]
      : [],
  );
}

function CategoryReplies(props: {
  categories: readonly HelpdeskCategory[];
  replies: Record<string, string>;
  errors: Record<string, string>;
  canEdit: boolean;
  onChange: (id: string, text: string) => void;
}): ReactNode {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Sl.No</TableHead>
          <TableHead className="w-48">Category</TableHead>
          <TableHead>Automatic reply</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.categories.map((category, index) => {
          const unowned = !category.owner_l1_user_id;
          return (
            <TableRow key={category.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{category.name}</TableCell>
              <TableCell>
                <Textarea
                  aria-label={`Automatic reply for ${category.name}`}
                  rows={2}
                  disabled={!props.canEdit || unowned}
                  value={props.replies[category.id] ?? ''}
                  onChange={(event) => props.onChange(category.id, event.target.value)}
                />
                {unowned && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose an owner for this category in Setup first.
                  </p>
                )}
                {props.errors[category.id] && (
                  <p role="alert" className="mt-1 text-xs text-destructive">
                    {props.errors[category.id]}
                  </p>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
