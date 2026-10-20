'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { SurveyQuestionType } from '@/hooks/use-surveys';
import { QUESTION_TYPE_LABELS } from '../_parts/labels';
import { addOption, isChoice, MAX_OPTIONS, OPTION_MAX, QUESTION_MAX, type DraftQuestion } from './survey-draft';

interface QuestionBlockProps {
  number: number;
  question: DraftQuestion;
  errors: Record<string, string>;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}

function Problem({ text }: { text?: string }): ReactNode {
  return text ? <p role="alert" className="text-sm text-destructive">{text}</p> : null;
}

function Options({ question, number, error, onChange }: { question: DraftQuestion; number: number; error?: string; onChange: QuestionBlockProps['onChange'] }): ReactNode {
  const setOption = (index: number, value: string) => onChange({ options: question.options.map((option, i) => (i === index ? value : option)) });
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Answer options</span>
      {question.options.map((option, index) => (
        <Input
          key={index}
          aria-label={`Question ${number} option ${index + 1}`}
          maxLength={OPTION_MAX}
          value={option}
          onChange={(event) => setOption(index, event.target.value)}
        />
      ))}
      {question.options.length < MAX_OPTIONS && (
        <Button type="button" variant="outline" size="sm" aria-label={`Add an option to question ${number}`} onClick={() => onChange({ options: addOption(question).options })}>
          +
        </Button>
      )}
      <Problem text={error} />
    </div>
  );
}

/** One question of the survey (UNIT-S15): its number, type, text, Mandatory and, for a choice, its options. */
export function QuestionBlock({ number, question, errors, onChange, onRemove }: QuestionBlockProps): ReactNode {
  const at = `q${number}`;
  return (
    <fieldset aria-label={`Question ${number}`} className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Question {number}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRemove} aria-label={`Remove question ${number}`}>
          Remove
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Select
          aria-label={`Question ${number} type`}
          className="w-56"
          value={question.type}
          onChange={(event) => onChange({ type: event.target.value as SurveyQuestionType })}
        >
          {QUESTION_TYPE_LABELS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={question.mandatory} onChange={(event) => onChange({ mandatory: event.target.checked })} />
          Mandatory
        </label>
      </div>
      <Input
        aria-label={`Question ${number} text`}
        maxLength={QUESTION_MAX}
        placeholder="Question"
        value={question.text}
        onChange={(event) => onChange({ text: event.target.value })}
      />
      <Problem text={errors[`${at}.text`]} />
      {isChoice(question.type) && <Options question={question} number={number} error={errors[`${at}.options`]} onChange={onChange} />}
    </fieldset>
  );
}
