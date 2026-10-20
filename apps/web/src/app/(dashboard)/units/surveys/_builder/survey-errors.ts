import { ApiError, friendlyError } from '@/lib/api-error';
import { DESCRIPTION_MAX, isChoice, MAX_OPTIONS, MIN_OPTIONS, OPTION_MAX, QUESTION_MAX, TITLE_MAX, type DraftQuestion, type SurveyDraft } from './survey-draft';

/** Problems by place, e.g. { title: …, 'q2.options': … }. */
export type SurveyErrors = Record<string, string>;

function headerErrors(draft: SurveyDraft, forPost: boolean, today: string): SurveyErrors {
  const errors: SurveyErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'Enter the title';
  else if (title.length > TITLE_MAX) errors.title = 'The title is at most 90 characters';
  if (draft.description.trim().length > DESCRIPTION_MAX) errors.description = 'The description is at most 5,000 characters';
  if (forPost && !draft.startsOn) errors.startsOn = 'Set the start date';
  else if (forPost && draft.startsOn < today) errors.startsOn = 'The start date cannot be before today';
  if (forPost && !draft.endsOn) errors.endsOn = 'Set the end date';
  else if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn) errors.endsOn = 'The end date cannot be before the start date';
  return errors;
}

function optionsError(question: DraftQuestion, forPost: boolean): string | undefined {
  const options = question.options.map((option) => option.trim()).filter(Boolean);
  if (options.some((option) => option.length > OPTION_MAX)) return 'An option is at most 120 characters';
  if (!forPost) return undefined;
  const distinct = new Set(options.map((option) => option.toLowerCase())).size;
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS || distinct !== options.length) {
    return 'Give 2 to 20 different answer options';
  }
  return undefined;
}

/**
 * What stops a save: Save as Draft needs the title and every question's
 * text; Post also needs both dates (start not before today, end not
 * before start), a question, and 2–20 different options per choice question.
 */
export function surveyErrors(draft: SurveyDraft, forPost: boolean, today: string): SurveyErrors {
  const errors = headerErrors(draft, forPost, today);
  draft.questions.forEach((question, index) => {
    const at = `q${index + 1}`;
    const text = question.text.trim();
    if (!text) errors[`${at}.text`] = 'Enter the question';
    else if (text.length > QUESTION_MAX) errors[`${at}.text`] = 'A question is at most 300 characters';
    const options = isChoice(question.type) ? optionsError(question, forPost) : undefined;
    if (options) errors[`${at}.options`] = options;
  });
  if (forPost && draft.questions.length === 0) errors.questions = 'Add at least one question';
  return errors;
}

const FIELD_OF_CODE: Readonly<Record<string, string>> = {
  survey_has_no_questions: 'questions',
  survey_dates_required: 'startsOn',
  survey_start_in_past: 'startsOn',
  survey_end_before_start: 'endsOn',
};

/** A refused save or Post, put next to the field it is about (the server's message, else a general one). */
export function serverErrors(failure: unknown): SurveyErrors {
  if (failure instanceof ApiError) {
    const position = failure.details?.position;
    if (failure.code === 'question_options_invalid' && typeof position === 'number') return { [`q${position}.options`]: failure.message };
    if (failure.code === 'survey_not_draft') return { form: 'This survey is no longer a draft, so it cannot be changed.' };
    const field = failure.code ? FIELD_OF_CODE[failure.code] : undefined;
    if (field) return { [field]: failure.message };
  }
  return { form: friendlyError(failure) };
}
