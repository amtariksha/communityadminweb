'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSurveyResults, type SurveyResults } from '@/hooks/use-surveys';
import { todayIST } from '@/lib/date';
import { AUDIENCE_LABELS, displayStatus, formatDay, SURVEYS_LIST } from '../../_parts/labels';
import { SurveyLoadError } from '../../_parts/surveys-page';
import { QuestionResult } from './question-result';
import { ResponsesExport } from './responses-export';

function Summary({ results }: { results: SurveyResults }): ReactNode {
  const { survey } = results;
  const today = useMemo(() => todayIST(), []);
  const count = results.response_count;
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{survey.title}</h2>
            <p className="text-sm text-muted-foreground">
              {displayStatus(survey, today)} · {formatDay(survey.starts_on)} to {formatDay(survey.ends_on)} · {AUDIENCE_LABELS[survey.audience]}
            </p>
          </div>
          <Link href={SURVEYS_LIST} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
            Close
          </Link>
        </div>
        <p className="text-base font-medium" data-testid="response-count">
          {count} {count === 1 ? 'response' : 'responses'}
        </p>
        <ResponsesExport surveyId={survey.id} />
      </CardContent>
    </Card>
  );
}

/**
 * Survey Results (UNIT-33): the response count, per choice question a bar
 * of counts, per short-answer question the answers, and Export responses.
 */
export function SurveyResultsView({ surveyId }: { surveyId: string }): ReactNode {
  const results = useSurveyResults(surveyId);
  if (results.isLoading) return <Skeleton className="h-64 w-full" />;
  if (results.error || !results.data) return <SurveyLoadError error={results.error} />;
  const { questions } = results.data;
  return (
    <div className="space-y-4">
      <Summary results={results.data} />
      {questions.length === 0 && <p className="text-sm text-muted-foreground">This survey has no questions yet.</p>}
      {questions.map((question) => (
        <QuestionResult key={question.id} question={question} />
      ))}
    </div>
  );
}
