'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useCloseSurvey, useDeleteSurvey, type SurveyRow } from '@/hooks/use-surveys';
import { friendlyError } from '@/lib/api-error';
import { surveyRoutes } from './_parts/labels';

export interface SurveyRowHandlers {
  close: (survey: SurveyRow) => void;
  remove: (survey: SurveyRow) => void;
  busy: boolean;
}

/** Close Survey and Delete, each after a confirm (UNIT-S14). */
export function useSurveyRowHandlers(): SurveyRowHandlers {
  const closeSurvey = useCloseSurvey();
  const deleteSurvey = useDeleteSurvey();
  const { addToast } = useToast();
  const failed = (title: string) => (failure: unknown) => addToast({ title, description: friendlyError(failure), variant: 'destructive' });

  return {
    close(survey) {
      if (!window.confirm(`Close "${survey.title}"? Members can no longer respond; the responses so far are kept.`)) return;
      closeSurvey.mutate(survey.id, {
        onSuccess: () => addToast({ title: 'Survey closed', variant: 'success' }),
        onError: failed('Could not close the survey'),
      });
    },
    remove(survey) {
      if (!window.confirm(`Delete the draft "${survey.title}"? This cannot be undone.`)) return;
      deleteSurvey.mutate(survey.id, {
        onSuccess: () => addToast({ title: 'Draft deleted', variant: 'success' }),
        onError: failed('Could not delete the draft'),
      });
    },
    busy: closeSurvey.isPending || deleteSurvey.isPending,
  };
}

const LINK = { className: buttonVariants({ variant: 'outline', size: 'sm' }), 'data-slot': 'button', 'data-size': 'sm' } as const;

/**
 * The Action column: Edit and Delete for a draft, Close Survey while it is
 * live, View Results always — so a closed survey offers View Results only.
 */
export function SurveyRowActions({ survey, handlers }: { survey: SurveyRow; handlers: SurveyRowHandlers }): ReactNode {
  const draft = survey.status === 'draft';
  return (
    <div className="flex flex-wrap gap-1">
      {draft && (
        <Link href={surveyRoutes.edit(survey.id)} {...LINK}>
          Edit
        </Link>
      )}
      <Link href={surveyRoutes.results(survey.id)} {...LINK}>
        View Results
      </Link>
      {survey.status === 'live' && (
        <Button type="button" variant="outline" size="sm" disabled={handlers.busy} onClick={() => handlers.close(survey)}>
          Close Survey
        </Button>
      )}
      {draft && (
        <Button type="button" variant="outline" size="sm" disabled={handlers.busy} onClick={() => handlers.remove(survey)}>
          Delete
        </Button>
      )}
    </div>
  );
}
