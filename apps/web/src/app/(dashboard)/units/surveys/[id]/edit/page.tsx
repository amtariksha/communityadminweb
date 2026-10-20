'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { SurveyBuilder } from '../../_builder/survey-builder';
import { SURVEY_LOGS } from '../../_parts/labels';
import { SurveysPage } from '../../_parts/surveys-page';

// Units & Users › Survey › Edit Survey (UNIT-S15): drafts only.
export default function Page(): ReactNode {
  const params = useParams<{ id: string }>();
  return (
    <SurveysPage title="Edit Survey" logs={SURVEY_LOGS}>
      <SurveyBuilder surveyId={params.id} />
    </SurveysPage>
  );
}
