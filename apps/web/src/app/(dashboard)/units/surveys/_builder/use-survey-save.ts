'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useCreateSurvey, usePostSurvey, useUpdateSurvey, type SurveyDetail } from '@/hooks/use-surveys';
import { SURVEYS_LIST, surveyRoutes } from '../_parts/labels';
import { surveyBody, type SurveyDraft } from './survey-draft';
import { serverErrors, surveyErrors, type SurveyErrors } from './survey-errors';

/**
 * Save as Draft and Post (UNIT-S15). A new survey is created once: when
 * its Post is refused after the draft was saved, the next try changes
 * that draft instead of creating another.
 */
export function useSurveySave(initialId: string | undefined, today: string, setErrors: (errors: SurveyErrors) => void) {
  const router = useRouter();
  const create = useCreateSurvey();
  const update = useUpdateSurvey();
  const post = usePostSurvey();
  const { addToast } = useToast();
  const [surveyId, setSurveyId] = useState(initialId);

  async function persist(draft: SurveyDraft): Promise<SurveyDetail> {
    const input = surveyBody(draft);
    if (surveyId) return update.mutateAsync({ id: surveyId, input });
    const created = await create.mutateAsync(input);
    setSurveyId(created.id);
    return created;
  }

  async function postSaved(saved: SurveyDetail): Promise<void> {
    const posted = await post.mutateAsync(saved.id);
    const scheduled = posted.starts_on !== null && posted.starts_on > today;
    addToast({ title: scheduled ? 'Survey scheduled' : 'Survey posted', variant: 'success' });
    router.push(SURVEYS_LIST);
  }

  async function save(draft: SurveyDraft, wantPost: boolean): Promise<void> {
    const errors = surveyErrors(draft, wantPost, today);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      const saved = await persist(draft);
      if (wantPost) return await postSaved(saved);
      addToast({ title: 'Survey saved as draft', variant: 'success' });
      if (!initialId) router.replace(surveyRoutes.edit(saved.id));
    } catch (failure) {
      setErrors(serverErrors(failure));
    }
  }

  return { save, saving: create.isPending || update.isPending || post.isPending };
}
