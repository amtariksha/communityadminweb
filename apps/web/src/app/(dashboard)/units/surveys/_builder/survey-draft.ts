import type { SurveyAudience, SurveyDetail, SurveyInput, SurveyQuestionType } from '@/hooks/use-surveys';

/** The survey builder's draft (UNIT-S15): header and questions as typed. */
export interface SurveyDraft {
  title: string;
  description: string;
  audience: SurveyAudience;
  /** `YYYY-MM-DD` from the date input; '' = not set yet. */
  startsOn: string;
  endsOn: string;
  questions: DraftQuestion[];
}

export interface DraftQuestion {
  /** Stable key for React while questions are removed. */
  key: string;
  type: SurveyQuestionType;
  text: string;
  mandatory: boolean;
  options: string[];
}

export const MAX_QUESTIONS = 50;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 20;
export const TITLE_MAX = 90;
export const DESCRIPTION_MAX = 5000;
export const QUESTION_MAX = 300;
export const OPTION_MAX = 120;

let keySeed = 0;
const nextKey = (): string => `sq${++keySeed}`;

export function isChoice(type: SurveyQuestionType): boolean {
  return type !== 'short';
}

export function blankQuestion(): DraftQuestion {
  return { key: nextKey(), type: 'single', text: '', mandatory: false, options: ['', ''] };
}

export function emptySurvey(): SurveyDraft {
  return { title: '', description: '', audience: 'all_members', startsOn: '', endsOn: '', questions: [blankQuestion()] };
}

export function draftFromSurvey(survey: SurveyDetail): SurveyDraft {
  return {
    title: survey.title,
    description: survey.description ?? '',
    audience: survey.audience,
    startsOn: survey.starts_on ?? '',
    endsOn: survey.ends_on ?? '',
    questions: survey.questions.map((question) => ({
      key: nextKey(),
      type: question.type,
      text: question.text,
      mandatory: question.is_mandatory,
      options: isChoice(question.type) ? question.options.map((option) => option.label) : [],
    })),
  };
}

export function addQuestion(draft: SurveyDraft): SurveyDraft {
  if (draft.questions.length >= MAX_QUESTIONS) return draft;
  return { ...draft, questions: [...draft.questions, blankQuestion()] };
}

/** The questions after it move up one; their numbers follow their place. */
export function removeQuestion(draft: SurveyDraft, index: number): SurveyDraft {
  return { ...draft, questions: draft.questions.filter((_, i) => i !== index) };
}

/** Changes one question; a new type keeps only what that type uses. */
export function updateQuestion(draft: SurveyDraft, index: number, patch: Partial<DraftQuestion>): SurveyDraft {
  const questions = draft.questions.map((question, i) => {
    if (i !== index) return question;
    const next = { ...question, ...patch };
    if (patch.type && patch.type !== question.type) {
      const keep = question.options.length >= MIN_OPTIONS ? question.options : ['', ''];
      next.options = isChoice(patch.type) ? keep : [];
    }
    return next;
  });
  return { ...draft, questions };
}

export function addOption(question: DraftQuestion): DraftQuestion {
  return question.options.length >= MAX_OPTIONS ? question : { ...question, options: [...question.options, ''] };
}

function filledOptions(question: DraftQuestion): string[] {
  return question.options.map((option) => option.trim()).filter(Boolean);
}

/** The survey as the API takes it; blank option rows are left out. */
export function surveyBody(draft: SurveyDraft): SurveyInput {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    audience: draft.audience,
    starts_on: draft.startsOn || null,
    ends_on: draft.endsOn || null,
    questions: draft.questions.map((question) => ({
      type: question.type,
      text: question.text.trim(),
      is_mandatory: question.mandatory,
      options: isChoice(question.type) ? filledOptions(question) : [],
    })),
  };
}
