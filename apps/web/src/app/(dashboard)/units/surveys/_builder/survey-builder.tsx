'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSurvey, type SurveyDetail } from '@/hooks/use-surveys';
import { todayIST } from '@/lib/date';
import { STATUS_LABELS, SURVEYS_LIST, surveyRoutes } from '../_parts/labels';
import { SurveyLoadError } from '../_parts/surveys-page';
import { HeaderFields } from './header-fields';
import { QuestionBlock } from './question-block';
import { addQuestion, draftFromSurvey, emptySurvey, MAX_QUESTIONS, removeQuestion, updateQuestion, type SurveyDraft } from './survey-draft';
import type { SurveyErrors } from './survey-errors';
import { useSurveySave } from './use-survey-save';

/** A live or closed survey is not editable (its questions are what people answer). */
function NotEditable({ survey }: { survey: SurveyDetail }): ReactNode {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p role="note" className="text-sm">
          “{survey.title}” is {STATUS_LABELS[survey.status].toLowerCase()}, so it cannot be edited.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={surveyRoutes.results(survey.id)} className={buttonVariants()} data-slot="button" data-size="default">
            View Results
          </Link>
          <Link href={SURVEYS_LIST} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
            Close
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuestionsSectionProps {
  draft: SurveyDraft;
  errors: SurveyErrors;
  setDraft: (change: (draft: SurveyDraft) => SurveyDraft) => void;
}

function QuestionsSection({ draft, errors, setDraft }: QuestionsSectionProps): ReactNode {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">Survey Questions</h3>
      {draft.questions.map((question, index) => (
        <QuestionBlock
          key={question.key}
          number={index + 1}
          question={question}
          errors={errors}
          onChange={(patch) => setDraft((d) => updateQuestion(d, index, patch))}
          onRemove={() => setDraft((d) => removeQuestion(d, index))}
        />
      ))}
      {errors.questions && <p role="alert" className="text-sm text-destructive">{errors.questions}</p>}
      {draft.questions.length < MAX_QUESTIONS && (
        <Button type="button" variant="outline" onClick={() => setDraft((d) => addQuestion(d))}>
          Add Questions
        </Button>
      )}
    </section>
  );
}

interface BuilderFormProps {
  surveyId?: string;
  initial: SurveyDraft;
}

function BuilderForm({ surveyId, initial }: BuilderFormProps): ReactNode {
  const router = useRouter();
  const today = useMemo(() => todayIST(), []);
  const [draft, setDraft] = useState<SurveyDraft>(initial);
  const [errors, setErrors] = useState<SurveyErrors>({});
  const [confirmed, setConfirmed] = useState(false);
  const { save, saving } = useSurveySave(surveyId, today, setErrors);

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <h2 className="text-lg font-semibold">{surveyId ? 'Edit Survey' : 'Create Survey'}</h2>
        <HeaderFields draft={draft} errors={errors} today={today} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
        <QuestionsSection draft={draft} errors={errors} setDraft={setDraft} />
        {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            Yes, I want to publish this survey.
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void save(draft, false)}>
              Save as Draft
            </Button>
            <Button type="button" disabled={saving || !confirmed} onClick={() => void save(draft, true)}>
              Post
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(SURVEYS_LIST)}>
              Close
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Create Survey / Edit Survey (UNIT-S15, SB-07 page): the header, the
 * "Survey Questions" block (Add Questions; numbers follow the order, so a
 * removed question renumbers the rest), then "Yes, I want to publish this
 * survey." and Save as Draft · Post — Post stays off until it is ticked.
 */
export function SurveyBuilder({ surveyId }: { surveyId?: string }): ReactNode {
  const existing = useSurvey(surveyId);
  // The survey as first loaded: later copies (after Save) must not reset
  // what is being typed, nor hide the form while a Post goes through.
  const [loaded, setLoaded] = useState<SurveyDetail | null>(null);

  useEffect(() => {
    if (existing.data && !loaded) setLoaded(existing.data);
  }, [existing.data, loaded]);

  if (!surveyId) return <BuilderForm initial={emptySurvey()} />;
  if (existing.error && !loaded) return <SurveyLoadError error={existing.error} />;
  if (!loaded) return <Skeleton className="h-64 w-full" />;
  if (loaded.status !== 'draft') return <NotEditable survey={loaded} />;
  return <BuilderForm surveyId={surveyId} initial={draftFromSurvey(loaded)} />;
}
