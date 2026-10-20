'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { QuestionType } from '@/hooks/use-community-forms';
import { QUESTION_TYPE_LABELS } from '../_parts/labels';
import { addOption, isChoice, MAX_OPTIONS, type DraftQuestion } from './builder-state';

interface QuestionEditorProps {
  number: number;
  question: DraftQuestion;
  errors: Record<string, string>;
  /** Questions are frozen once the form has a response (decision 4). */
  readOnly: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onMove: (step: -1 | 1) => void;
  onRemove: () => void;
}

function Problem({ text }: { text?: string }): ReactNode {
  return text ? <p role="alert" className="text-sm text-destructive">{text}</p> : null;
}

function Options({ question, readOnly, error, onChange }: { question: DraftQuestion; readOnly: boolean; error?: string; onChange: (patch: Partial<DraftQuestion>) => void }): ReactNode {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Answer options</span>
      {question.options.map((option, index) => (
        <Input
          key={index}
          aria-label={`Option ${index + 1}`}
          maxLength={200}
          value={option}
          disabled={readOnly}
          onChange={(event) => onChange({ options: question.options.map((o, i) => (i === index ? event.target.value : o)) })}
        />
      ))}
      {!readOnly && question.options.length < MAX_OPTIONS && (
        <Button type="button" variant="outline" size="sm" aria-label="Add an option" onClick={() => onChange({ options: addOption(question).options })}>
          +
        </Button>
      )}
      <Problem text={error} />
    </div>
  );
}

/** One question of the builder: number, text, type, Mandatory and the type's own inputs. */
export function QuestionEditor(props: QuestionEditorProps): ReactNode {
  const { number, question, errors, readOnly, onChange } = props;
  const at = `q${number}`;
  return (
    <fieldset aria-label={`Question ${number}`} className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Question {number}</span>
        {!readOnly && (
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" disabled={props.first} onClick={() => props.onMove(-1)} aria-label={`Move question ${number} up`}>
              ↑
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={props.last} onClick={() => props.onMove(1)} aria-label={`Move question ${number} down`}>
              ↓
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={props.onRemove} aria-label={`Remove question ${number}`}>
              Remove
            </Button>
          </div>
        )}
      </div>
      <Input
        aria-label={`Question ${number} text`}
        maxLength={500}
        placeholder="Question"
        value={question.text}
        disabled={readOnly}
        onChange={(event) => onChange({ text: event.target.value })}
      />
      <Problem text={errors[`${at}.text`]} />
      <div className="flex flex-wrap items-center gap-4">
        <Select
          aria-label={`Question ${number} type`}
          className="w-56"
          value={question.type}
          disabled={readOnly}
          onChange={(event) => onChange({ type: event.target.value as QuestionType })}
        >
          {QUESTION_TYPE_LABELS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={question.mandatory} disabled={readOnly} onChange={(event) => onChange({ mandatory: event.target.checked })} />
          Mandatory
        </label>
      </div>
      {isChoice(question.type) && <Options question={question} readOnly={readOnly} error={errors[`${at}.options`]} onChange={onChange} />}
      {question.type === 'acknowledgement' && (
        <>
          <Input
            aria-label={`Question ${number} statement`}
            maxLength={500}
            placeholder="Statement to acknowledge"
            value={question.ackText}
            disabled={readOnly}
            onChange={(event) => onChange({ ackText: event.target.value })}
          />
          <Problem text={errors[`${at}.ack`]} />
        </>
      )}
      {question.type === 'file_upload' && <p className="text-xs text-muted-foreground">Up to 3 files of 8 MB each: images or PDF.</p>}
    </fieldset>
  );
}
