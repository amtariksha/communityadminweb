'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FormFrame, type FormMode } from '@/components/form-page';
import { ShowLogsButton } from '@/components/show-logs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useCreateCategory,
  usePublishCategory,
  useUpdateCategory,
  useViolationCategory,
  type ViolationCategory,
} from '@/hooks/use-violations';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import { CategoryFields } from './category-fields';
import {
  categoryErrors,
  EMPTY_CATEGORY,
  formActions,
  STATUS_LABELS,
  toInput,
  valuesFrom,
  type CategoryFormErrors,
  type CategoryFormValues,
} from './category-form-state';

export interface CategoryFormProps {
  mode: FormMode;
  /** Edit this category; absent = Create Category. */
  categoryId?: string;
  /** Dialog only. */
  open?: boolean;
  onClose: () => void;
  onSaved: (category: ViolationCategory) => void;
}

/** The server's field error (e.g. charge_head_required names income_account_id). */
function serverFieldError(error: unknown): CategoryFormErrors {
  if (!(error instanceof ApiError)) return {};
  const field = error.details?.field;
  return typeof field === 'string' ? { [field]: error.userMessage } : {};
}

function useCategorySave(categoryId: string | undefined, onSaved: (category: ViolationCategory) => void) {
  const create = useCreateCategory();
  const update = useUpdateCategory(categoryId ?? '');
  const toggle = usePublishCategory();
  const { addToast } = useToast();
  const [errors, setErrors] = useState<CategoryFormErrors>({});

  async function run(values: CategoryFormValues, status: ViolationCategory['status'] | undefined, publish: 'publish' | 'unpublish' | null) {
    const found = categoryErrors(values, publish === 'publish' || status === 'published');
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      let saved = categoryId ? await update.mutateAsync(toInput(values)) : await create.mutateAsync(toInput(values));
      if (publish) saved = await toggle.mutateAsync({ id: saved.id, publish: publish === 'publish' });
      addToast({ title: `Category saved — ${STATUS_LABELS[saved.status]}`, variant: 'success' });
      onSaved(saved);
    } catch (error) {
      setErrors(serverFieldError(error));
      addToast({ title: 'Could not save the category', description: friendlyError(error), variant: 'destructive' });
    }
  }
  return { run, errors, saving: create.isPending || update.isPending || toggle.isPending };
}

/**
 * Add / Edit Category (RULE-S3): a page in classic, a dialog in standard
 * (SB-07). New and Draft: Save as Draft · Publish. Published: Save Changes ·
 * Unpublish. Inactive: Save Changes · Publish.
 */
export function CategoryForm({ mode, categoryId, open, onClose, onSaved }: CategoryFormProps): ReactNode {
  const existing = useViolationCategory(categoryId);
  const [values, setValues] = useState<CategoryFormValues>(EMPTY_CATEGORY);
  const save = useCategorySave(categoryId, onSaved);
  const status = existing.data?.status;
  const actions = formActions(status);

  useEffect(() => {
    if (existing.data) setValues(valuesFrom(existing.data));
  }, [existing.data]);

  if (categoryId && existing.isLoading) return <Skeleton className="h-64 w-full" />;
  if (categoryId && existing.error) {
    const missing = existing.error instanceof ApiError && existing.error.code === 'violation_category_not_found';
    const text = !missing && isNotDeployed(existing.error) ? 'Rules & Violations is not available yet.' : 'Category not found.';
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }

  return (
    <FormFrame
      mode={mode}
      open={open}
      title={categoryId ? 'Edit Category' : 'Create Category'}
      description={status ? `Status: ${STATUS_LABELS[status]}` : undefined}
      onClose={onClose}
      onSave={() => void save.run(values, status, null)}
      saveLabel={actions.save}
      saving={save.saving}
      secondaryAction={{
        label: actions.toggle === 'publish' ? 'Publish' : 'Unpublish',
        onClick: () => void save.run(values, status, actions.toggle),
      }}
    >
      <CategoryFields values={values} errors={save.errors} onChange={(patch) => setValues((current) => ({ ...current, ...patch }))} />
      {categoryId && mode === 'page' && <ShowLogsButton recordTypes={['violation_category']} recordId={categoryId} />}
    </FormFrame>
  );
}
