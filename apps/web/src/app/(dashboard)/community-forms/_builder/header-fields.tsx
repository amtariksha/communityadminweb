'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FormAudience } from '@/hooks/use-community-forms';
import { AUDIENCE_LABELS } from '../_parts/labels';
import type { BuilderDraft } from './builder-state';

interface HeaderFieldsProps {
  draft: BuilderDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<BuilderDraft>) => void;
}

/** The builder's header (FORM-S3): name, description, who can respond, whether responses need approval. */
export function HeaderFields({ draft, errors, onChange }: HeaderFieldsProps): ReactNode {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="form-name">Form name</Label>
        <Input id="form-name" placeholder="Enter Name Here" maxLength={150} value={draft.name} onChange={(event) => onChange({ name: event.target.value })} />
        {errors.name && <p role="alert" className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="form-description">Description / instructions</Label>
        <Textarea id="form-description" rows={4} maxLength={5000} value={draft.description} onChange={(event) => onChange({ description: event.target.value })} />
        {errors.description && <p role="alert" className="text-sm text-destructive">{errors.description}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="form-audience">Who can respond</Label>
        <Select id="form-audience" aria-label="Who can respond" className="w-56" value={draft.audience} onChange={(event) => onChange({ audience: event.target.value as FormAudience })}>
          {(Object.keys(AUDIENCE_LABELS) as FormAudience[]).map((audience) => (
            <option key={audience} value={audience}>
              {AUDIENCE_LABELS[audience]}
            </option>
          ))}
        </Select>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Responses need approval?</legend>
        {[true, false].map((value) => (
          <label key={String(value)} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input type="radio" name="form-approval" checked={draft.requiresApproval === value} onChange={() => onChange({ requiresApproval: value })} />
            {value ? 'Yes' : 'No'}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
