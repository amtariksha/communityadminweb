'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SurveyAudience } from '@/hooks/use-surveys';
import { AUDIENCE_LABELS } from '../_parts/labels';
import { DESCRIPTION_MAX, TITLE_MAX, type SurveyDraft } from './survey-draft';

interface HeaderFieldsProps {
  draft: SurveyDraft;
  errors: Record<string, string>;
  /** Today in India: the earliest start date. */
  today: string;
  onChange: (patch: Partial<SurveyDraft>) => void;
}

function Problem({ text }: { text?: string }): ReactNode {
  return text ? <p role="alert" className="text-sm text-destructive">{text}</p> : null;
}

/** The survey's header (UNIT-S15): title, description, start and end dates, who can respond. */
export function HeaderFields({ draft, errors, today, onChange }: HeaderFieldsProps): ReactNode {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="survey-title">Title</Label>
        <Input id="survey-title" maxLength={TITLE_MAX} value={draft.title} onChange={(event) => onChange({ title: event.target.value })} />
        <Problem text={errors.title} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="survey-description">Description</Label>
        <Textarea id="survey-description" rows={4} maxLength={DESCRIPTION_MAX} value={draft.description} onChange={(event) => onChange({ description: event.target.value })} />
        <Problem text={errors.description} />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label htmlFor="survey-start">Start date</Label>
          <Input id="survey-start" type="date" lang="en-IN" className="w-44" min={today} value={draft.startsOn} onChange={(event) => onChange({ startsOn: event.target.value })} />
          <Problem text={errors.startsOn} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="survey-end">End date</Label>
          <Input id="survey-end" type="date" lang="en-IN" className="w-44" min={draft.startsOn || today} value={draft.endsOn} onChange={(event) => onChange({ endsOn: event.target.value })} />
          <Problem text={errors.endsOn} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="survey-audience">Who can respond</Label>
        <Select id="survey-audience" className="w-56" value={draft.audience} onChange={(event) => onChange({ audience: event.target.value as SurveyAudience })}>
          {(Object.keys(AUDIENCE_LABELS) as SurveyAudience[]).map((audience) => (
            <option key={audience} value={audience}>
              {AUDIENCE_LABELS[audience]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
