'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { SURVEY_LOGS } from '../../_parts/labels';
import { SurveysPage } from '../../_parts/surveys-page';
import { SurveyResultsView } from './survey-results';

// Units & Users › Survey › Survey Results (UNIT-33).
export default function Page(): ReactNode {
  const params = useParams<{ id: string }>();
  return (
    <SurveysPage title="Survey Results" logs={SURVEY_LOGS}>
      <SurveyResultsView surveyId={params.id} />
    </SurveysPage>
  );
}
