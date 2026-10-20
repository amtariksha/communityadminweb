import type { CommunityFormDetail, FormAudience, FormQuestion, QuestionType } from '@/hooks/use-community-forms';

/** The form builder's draft (FORM-S3): header and questions as typed. */
export interface BuilderDraft {
  name: string;
  description: string;
  audience: FormAudience;
  requiresApproval: boolean;
  questions: DraftQuestion[];
}

export interface DraftQuestion {
  /** Stable key for React while questions move. */
  key: string;
  text: string;
  type: QuestionType;
  mandatory: boolean;
  options: string[];
  ackText: string;
}

const CHOICE: ReadonlySet<QuestionType> = new Set(['single_choice', 'multiple_choice']);
export const MAX_QUESTIONS = 50;
export const MAX_OPTIONS = 20;

let keySeed = 0;
const nextKey = (): string => `q${++keySeed}`;

export function isChoice(type: QuestionType): boolean {
  return CHOICE.has(type);
}

export function blankQuestion(): DraftQuestion {
  return { key: nextKey(), text: '', type: 'single_choice', mandatory: false, options: ['', ''], ackText: '' };
}

export function emptyDraft(): BuilderDraft {
  return { name: '', description: '', audience: 'all', requiresApproval: true, questions: [] };
}

export function draftFrom(form: CommunityFormDetail): BuilderDraft {
  return {
    name: form.name,
    description: form.description ?? '',
    audience: form.audience,
    requiresApproval: form.requires_approval,
    questions: form.questions.map((question) => ({
      key: nextKey(),
      text: question.question_text,
      type: question.question_type,
      mandatory: question.is_mandatory,
      options: question.options,
      ackText: question.ack_text ?? '',
    })),
  };
}

export function addQuestion(draft: BuilderDraft): BuilderDraft {
  if (draft.questions.length >= MAX_QUESTIONS) return draft;
  return { ...draft, questions: [...draft.questions, blankQuestion()] };
}

export function removeQuestion(draft: BuilderDraft, index: number): BuilderDraft {
  return { ...draft, questions: draft.questions.filter((_, i) => i !== index) };
}

/** Moves question `index` up (-1) or down (+1); at the ends nothing changes. */
export function moveQuestion(draft: BuilderDraft, index: number, step: -1 | 1): BuilderDraft {
  const target = index + step;
  if (target < 0 || target >= draft.questions.length) return draft;
  const questions = [...draft.questions];
  [questions[index], questions[target]] = [questions[target], questions[index]];
  return { ...draft, questions };
}

/** Changes one question; a new type keeps only what that type uses. */
export function updateQuestion(draft: BuilderDraft, index: number, patch: Partial<DraftQuestion>): BuilderDraft {
  const questions = draft.questions.map((question, i) => {
    if (i !== index) return question;
    const next = { ...question, ...patch };
    if (patch.type && patch.type !== question.type) {
      next.options = isChoice(patch.type) ? (question.options.length >= 2 ? question.options : ['', '']) : [];
      next.ackText = patch.type === 'acknowledgement' ? question.ackText : '';
    }
    return next;
  });
  return { ...draft, questions };
}

export function addOption(question: DraftQuestion): DraftQuestion {
  return question.options.length >= MAX_OPTIONS ? question : { ...question, options: [...question.options, ''] };
}

/** Problems by place, e.g. { name: …, 'q2.options': … }; Save as draft needs only the header and texts. */
export function builderErrors(draft: BuilderDraft, forPublish: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Enter the form name';
  else if (draft.name.trim().length > 150) errors.name = 'The name is at most 150 characters';
  if (draft.description.length > 5000) errors.description = 'The description is at most 5,000 characters';
  draft.questions.forEach((question, index) => {
    const at = `q${index + 1}`;
    if (!question.text.trim()) errors[`${at}.text`] = 'Enter the question';
    if (!forPublish) return;
    // Blank rows are left out (as the save leaves them out); the rest must be two or more, all different.
    const options = question.options.map((option) => option.trim().toLowerCase()).filter(Boolean);
    if (isChoice(question.type) && (options.length < 2 || new Set(options).size !== options.length)) {
      errors[`${at}.options`] = 'Give at least two different answer options';
    }
    if (question.type === 'acknowledgement' && !question.ackText.trim()) errors[`${at}.ack`] = 'Enter the statement to acknowledge';
  });
  if (forPublish && draft.questions.length === 0) errors.questions = 'Add at least one question';
  return errors;
}

/** The questions as the API takes them. */
export function questionsBody(draft: BuilderDraft): FormQuestion[] {
  return draft.questions.map((question) => ({
    question_text: question.text.trim(),
    question_type: question.type,
    is_mandatory: question.mandatory,
    options: isChoice(question.type) ? question.options.map((option) => option.trim()).filter(Boolean) : [],
    ack_text: question.type === 'acknowledgement' ? question.ackText.trim() : null,
  }));
}

export function headerBody(draft: BuilderDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    audience: draft.audience,
    requires_approval: draft.requiresApproval,
  };
}
