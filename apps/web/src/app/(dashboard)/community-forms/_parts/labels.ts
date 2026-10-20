import type { FormAudience, FormStatus, QuestionType } from '@/hooks/use-community-forms';

export const AUDIENCE_LABELS: Readonly<Record<FormAudience, string>> = {
  all: 'All Members',
  owners: 'Owners Only',
  tenants: 'Tenants Only',
};

export const FORM_STATUS_LABELS: Readonly<Record<FormStatus, string>> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
};

/** The builder's type list, in the order the select offers it (FORM-S3). */
export const QUESTION_TYPE_LABELS: ReadonlyArray<readonly [QuestionType, string]> = [
  ['single_choice', 'Single Choice'],
  ['multiple_choice', 'Multiple Choice'],
  ['short_answer', 'Short Answer'],
  ['date', 'Date'],
  ['file_upload', 'File Upload'],
  ['acknowledgement', 'Acknowledgement Checkbox'],
  ['paragraph', 'Paragraph'],
  ['number', 'Number'],
];

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPE_LABELS.find(([value]) => value === type)?.[1] ?? type;
}
