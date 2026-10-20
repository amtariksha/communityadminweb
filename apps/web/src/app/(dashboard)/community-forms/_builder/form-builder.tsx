'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import {
  useCommunityForm,
  useCreateCommunityForm,
  usePublishCommunityForm,
  useReplaceFormQuestions,
  useUpdateCommunityForm,
  type CommunityFormDetail,
} from '@/hooks/use-community-forms';
import { ApiError, friendlyError } from '@/lib/api-error';
import { isNotDeployed } from '@/lib/not-deployed';
import {
  addQuestion,
  builderErrors,
  draftFrom,
  emptyDraft,
  headerBody,
  moveQuestion,
  questionsBody,
  removeQuestion,
  updateQuestion,
  type BuilderDraft,
} from './builder-state';
import { HeaderFields } from './header-fields';
import { QuestionEditor } from './question-editor';

const LIST = '/community-forms/setup/forms';

function useBuilderSave(formId: string | undefined, setErrors: (errors: Record<string, string>) => void) {
  const router = useRouter();
  const create = useCreateCommunityForm();
  const update = useUpdateCommunityForm();
  const replace = useReplaceFormQuestions();
  const publish = usePublishCommunityForm();
  const { addToast } = useToast();

  async function save(draft: BuilderDraft, opts: { publish: boolean; questionsFrozen: boolean }): Promise<void> {
    const errors = builderErrors(draft, opts.publish);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      let saved: CommunityFormDetail;
      if (formId) {
        saved = await update.mutateAsync({ id: formId, header: headerBody(draft) });
        if (!opts.questionsFrozen) saved = await replace.mutateAsync({ id: formId, questions: questionsBody(draft) });
      } else {
        saved = await create.mutateAsync({ ...headerBody(draft), questions: questionsBody(draft) });
      }
      if (opts.publish) saved = await publish.mutateAsync({ id: saved.id, publish: true });
      addToast({ title: opts.publish ? 'Form published' : 'Form saved', variant: 'success' });
      router.push(opts.publish ? LIST : `/community-forms/${saved.id}/edit`);
    } catch (failure) {
      setErrors({ form: serverMessage(failure) });
    }
  }
  return { save, saving: create.isPending || update.isPending || replace.isPending || publish.isPending };
}

function serverMessage(failure: unknown): string {
  if (failure instanceof ApiError && failure.code === 'form_approvers_missing') return 'Set a Level 1 approver in Approvers Setup first.';
  if (failure instanceof ApiError && failure.code === 'approver_levels_gap') return 'Approver levels must follow on from Level 1 without an empty level.';
  return friendlyError(failure);
}

/**
 * Create Form / Edit Form (FORM-S3): its own page in both layouts. Header,
 * then the questions (move up / down / remove, "+ Add question"); Save as
 * draft, and Publish once "Yes, I want to publish the form." is ticked.
 * With responses, the questions are read-only and only the header saves.
 */
export function FormBuilder({ formId }: { formId?: string }): ReactNode {
  const router = useRouter();
  const existing = useCommunityForm(formId);
  const [draft, setDraft] = useState<BuilderDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const { save, saving } = useBuilderSave(formId, setErrors);

  useEffect(() => {
    if (existing.data) setDraft(draftFrom(existing.data));
  }, [existing.data]);

  if (formId && existing.isLoading) return <Skeleton className="h-64 w-full" />;
  if (formId && existing.error) {
    const missing = existing.error instanceof ApiError && existing.error.code === 'community_form_not_found';
    const text = !missing && isNotDeployed(existing.error) ? 'Community Forms is not available yet.' : 'Form not found.';
    return <p className="text-sm text-muted-foreground">{text}</p>;
  }
  const frozen = (existing.data?.response_count ?? 0) > 0;
  const published = existing.data?.status === 'published';
  const noQuestions = draft.questions.length === 0;

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <h2 className="text-lg font-semibold">{formId ? 'Edit Form' : 'Create Form'}</h2>
        <HeaderFields draft={draft} errors={errors} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Form Questions</h3>
          {frozen && <p role="note" className="rounded-md bg-muted p-2 text-sm">This form has responses, so its questions cannot change. You can still edit the name, description and who can respond.</p>}
          {draft.questions.map((question, index) => (
            <QuestionEditor
              key={question.key}
              number={index + 1}
              question={question}
              errors={errors}
              readOnly={frozen}
              first={index === 0}
              last={index === draft.questions.length - 1}
              onChange={(patch) => setDraft((d) => updateQuestion(d, index, patch))}
              onMove={(step) => setDraft((d) => moveQuestion(d, index, step))}
              onRemove={() => setDraft((d) => removeQuestion(d, index))}
            />
          ))}
          {!frozen && (
            <Button type="button" variant="link" onClick={() => setDraft((d) => addQuestion(d))}>
              + Add question
            </Button>
          )}
          {noQuestions && <p className="text-sm text-muted-foreground">Add at least one question</p>}
        </section>
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
        <div className="space-y-3 border-t pt-4">
          {!published && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              Yes, I want to publish the form.
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void save(draft, { publish: false, questionsFrozen: frozen })}>
              {published ? 'Save Changes' : 'Save as draft'}
            </Button>
            {!published && (
              <Button type="button" disabled={saving || !confirmed || noQuestions} onClick={() => void save(draft, { publish: true, questionsFrozen: frozen })}>
                Publish
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => router.push(LIST)}>
              Close
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
