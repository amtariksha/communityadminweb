import type { SurveyAudience, SurveyQuestionType, SurveyRow, SurveyStatus } from '@/hooks/use-surveys';

export const SURVEYS_LIST = '/units/surveys';
export const SURVEY_LOGS: readonly string[] = ['survey'];

export const surveyRoutes = {
  create: `${SURVEYS_LIST}/new`,
  edit: (id: string) => `${SURVEYS_LIST}/${id}/edit`,
  results: (id: string) => `${SURVEYS_LIST}/${id}/results`,
};

/** Who Can Respond, in the order the select offers it (UNIT-S15). */
export const AUDIENCE_LABELS: Readonly<Record<SurveyAudience, string>> = {
  all_members: 'All Members',
  owners_only: 'Owners Only',
  tenants_only: 'Tenants Only',
  primary_contact_only: 'Primary Contact Only',
};

export const STATUS_LABELS: Readonly<Record<SurveyStatus, string>> = {
  draft: 'Draft',
  live: 'Live',
  closed: 'Closed',
};

export const QUESTION_TYPE_LABELS: ReadonlyArray<readonly [SurveyQuestionType, string]> = [
  ['single', 'Single Choice'],
  ['multiple', 'Multiple Choice'],
  ['short', 'Short Answer'],
];

export function questionTypeLabel(type: SurveyQuestionType): string {
  return QUESTION_TYPE_LABELS.find(([value]) => value === type)?.[1] ?? type;
}

/** How a survey reads in the list: a live survey whose start is ahead is Scheduled (as the API words it). */
export function displayStatus(survey: Pick<SurveyRow, 'status' | 'starts_on'>, today: string): string {
  if (survey.status === 'live' && survey.starts_on !== null && survey.starts_on > today) return 'Scheduled';
  return STATUS_LABELS[survey.status];
}

/** `24/10/2026` for a stored day; `—` when there is none. */
export function formatDay(day: string | null | undefined): string {
  if (!day) return '—';
  const [year, month, date] = day.slice(0, 10).split('-');
  return year && month && date ? `${date}/${month}/${year}` : '—';
}
