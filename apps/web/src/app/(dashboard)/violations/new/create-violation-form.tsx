'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FormFrame } from '@/components/form-page';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { UnitSearchSelect } from '@/components/ui/unit-search-select';
import { useUploadFileToS3 } from '@/hooks/use-documents';
import { UNIT_PICKER_LIMIT, useUnits } from '@/hooks/use-units';
import { useViolationCategories } from '@/hooks/use-violations';
import { useRaiseViolation, type ViolationStage } from '@/hooks/use-violation-register';
import { ApiError, friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { isNotDeployed } from '@/lib/not-deployed';
import { attachmentError, AttachmentInputs } from './attachment-inputs';

const OPEN_LIST = '/violations/open/awaiting-approval';

interface Draft {
  categoryId: string;
  unitId: string;
  description: string;
  stage: ViolationStage;
  files: (File | null)[];
}

type Errors = Partial<Record<'category' | 'unit' | 'description' | 'files' | 'form', string>>;

function draftErrors(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.categoryId) errors.category = 'Pick a category';
  if (!draft.unitId) errors.unit = 'Pick a unit';
  const description = draft.description.trim();
  if (!description) errors.description = 'Add a description';
  else if (description.length > 2000) errors.description = 'Description is at most 2,000 characters';
  const files = attachmentError(draft.files.filter((file): file is File => file !== null));
  if (files) errors.files = files;
  return errors;
}

function serverError(failure: unknown): Errors {
  if (failure instanceof ApiError && failure.code === 'violation_approvers_missing') return { form: 'Set up approvers first.' };
  if (failure instanceof ApiError && failure.code === 'category_not_published') return { category: 'Pick a published category.' };
  return { form: friendlyError(failure) };
}

function useSubmit(draft: Draft, setErrors: (errors: Errors) => void) {
  const router = useRouter();
  const raise = useRaiseViolation();
  const upload = useUploadFileToS3();
  const { addToast } = useToast();
  async function submit(): Promise<void> {
    const found = draftErrors(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const files = draft.files.filter((file): file is File => file !== null);
      const uploaded = await Promise.all(files.map((file) => upload.mutateAsync({ file })));
      const saved = await raise.mutateAsync({
        category_id: draft.categoryId,
        unit_id: draft.unitId,
        description: draft.description.trim(),
        requested_stage: draft.stage,
        attachments: uploaded.map((file, index) => ({ url: file.fileUrl, name: files[index].name, size_bytes: files[index].size })),
      });
      addToast({ title: `${saved.violation_number} raised — awaiting approval`, variant: 'success' });
      router.push(`/violations/${saved.id}`);
    } catch (failure) {
      setErrors(serverError(failure));
    }
  }
  return { submit, saving: raise.isPending || upload.isPending };
}

/** Create Violation (RULE-S7): a page of its own; approval starts as soon as it is created. */
export function CreateViolationForm(): ReactNode {
  const layout = useAdminLayout();
  const router = useRouter();
  const categories = useViolationCategories({ status: 'published', limit: 100 });
  const units = useUnits({ limit: UNIT_PICKER_LIMIT }).data?.data ?? [];
  const [draft, setDraft] = useState<Draft>({ categoryId: '', unitId: '', description: '', stage: 'warning', files: [] });
  const [errors, setErrors] = useState<Errors>({});
  const { submit, saving } = useSubmit(draft, setErrors);
  const patch = (next: Partial<Draft>) => setDraft((current) => ({ ...current, ...next }));

  if (categories.isLoading) return <Skeleton className="h-64 w-full" />;
  if (categories.error && isNotDeployed(categories.error)) return <p className="text-sm text-muted-foreground">Rules & Violations is not available yet.</p>;
  if ((categories.data?.data ?? []).length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Publish a category in <Link href="/violations/setup/categories" className="text-primary underline">Category Set Up</Link> first.
      </p>
    );
  }

  return (
    <FormFrame mode="page" title="Create Violation" onClose={() => router.push(OPEN_LIST)} onSave={() => void submit()} saveLabel="Create" savingLabel="Creating…" saving={saving}>
      <div className="space-y-1">
        <Label htmlFor="violation-category">Category</Label>
        <Select id="violation-category" aria-label="Category" value={draft.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
          <option value="">Select a category</option>
          {(categories.data?.data ?? []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </Select>
        {errors.category && <p role="alert" className="text-sm text-destructive">{errors.category}</p>}
      </div>
      <div className="space-y-1">
        <span className="text-sm font-medium">Unit</span>
        <UnitSearchSelect value={draft.unitId} onChange={(unitId) => patch({ unitId })} units={units} placeholder="Search unit..." />
        {errors.unit && <p role="alert" className="text-sm text-destructive">{errors.unit}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="violation-description">Add Description</Label>
        <Textarea id="violation-description" rows={4} maxLength={2000} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
        {errors.description && <p role="alert" className="text-sm text-destructive">{errors.description}</p>}
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Stage</legend>
        {(['warning', 'penalty'] as const).map((stage) => (
          <label key={stage} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input type="radio" name="violation-stage" checked={draft.stage === stage} onChange={() => patch({ stage })} />
            {stage === 'warning' ? 'Warning' : 'Penalty'}
          </label>
        ))}
      </fieldset>
      <AttachmentInputs slots={layout === 'classic'} files={draft.files} onChange={(files) => patch({ files })} />
      {errors.files && <p role="alert" className="text-sm text-destructive">{errors.files}</p>}
      {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
    </FormFrame>
  );
}
