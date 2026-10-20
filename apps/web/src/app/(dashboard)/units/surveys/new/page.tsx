import type { ReactNode } from 'react';
import { SurveyBuilder } from '../_builder/survey-builder';
import { SurveysPage } from '../_parts/surveys-page';

// Units & Users › Survey › Create Survey (UNIT-S15): a page of its own in both layouts.
export default function Page(): ReactNode {
  return (
    <SurveysPage title="Create Survey">
      <SurveyBuilder />
    </SurveysPage>
  );
}
