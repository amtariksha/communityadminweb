'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { SurveyQuestionResult } from '@/hooks/use-surveys';
import { questionTypeLabel } from '../../_parts/labels';

const BAR_ROW_PX = 36;
const MIN_CHART_PX = 120;

function share(count: number, answered: number): string {
  return answered > 0 ? `${Math.round((count / answered) * 100)}%` : '0%';
}

/** A choice question: a bar of counts per option, with the counts written out beside it. */
function ChoiceResult({ question }: { question: SurveyQuestionResult }): ReactNode {
  const height = Math.max(MIN_CHART_PX, question.options.length * BAR_ROW_PX);
  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <div style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={question.options} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={160} />
            <Tooltip />
            <Bar dataKey="count" name="Responses" fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul aria-label={`Counts for question ${question.position}`} className="space-y-1 text-sm">
        {question.options.map((option) => (
          <li key={option.id} className="flex justify-between gap-2 border-b py-1">
            <span>{option.label}</span>
            <span className="tabular-nums" data-testid={`count-${option.id}`}>
              {option.count} ({share(option.count, question.answered)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A short-answer question: the answers, newest first. */
function ShortAnswers({ question }: { question: SurveyQuestionResult }): ReactNode {
  if (question.short_answers.length === 0) return <p className="text-sm text-muted-foreground">No answers yet.</p>;
  return (
    <ul aria-label={`Answers to question ${question.position}`} className="max-h-80 space-y-1 overflow-y-auto text-sm">
      {question.short_answers.map((answer, index) => (
        <li key={index} className="whitespace-pre-wrap rounded-md bg-muted px-2 py-1">
          {answer}
        </li>
      ))}
    </ul>
  );
}

/** One question's results (UNIT-33): its text, how many answered, then the counts or the answers. */
export function QuestionResult({ question }: { question: SurveyQuestionResult }): ReactNode {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="space-y-1">
          <h3 className="font-semibold">
            Q{question.position}. {question.text}
          </h3>
          <p className="text-xs text-muted-foreground">
            {questionTypeLabel(question.type)}
            {question.is_mandatory ? ' · Mandatory' : ''} · Answered by {question.answered}
          </p>
        </div>
        {question.type === 'short' ? <ShortAnswers question={question} /> : <ChoiceResult question={question} />}
      </CardContent>
    </Card>
  );
}
