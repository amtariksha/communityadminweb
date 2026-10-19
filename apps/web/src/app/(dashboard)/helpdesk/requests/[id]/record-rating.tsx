'use client';

import { type ReactNode } from 'react';
import { Star } from 'lucide-react';
import type { Ticket } from '@/hooks';
import { formatDate } from '@/lib/utils';

/** The raiser's rating and feedback once given (HELP-20). */
export function RecordRating({ survey }: { survey: Ticket['survey'] }): ReactNode {
  if (!survey) return null;
  return (
    <section aria-label="Resident feedback" className="space-y-1 rounded-md border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Resident feedback</span>
        <span className="flex" aria-label={`Rated ${survey.rating} of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={n <= survey.rating ? 'h-4 w-4 fill-current text-primary' : 'h-4 w-4 text-muted-foreground'} />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">{formatDate(survey.submitted_at)}</span>
      </div>
      {survey.feedback && <p className="whitespace-pre-line">{survey.feedback}</p>}
    </section>
  );
}
