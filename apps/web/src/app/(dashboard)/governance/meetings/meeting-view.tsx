'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { ShowLogsButton } from '@/components/show-logs';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { LoadedMeeting } from './meeting-loader';
import { MEETINGS_BASE } from '@/lib/meeting-states';

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="space-y-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const STATUS_WORDS: Readonly<Record<string, string>> = { scheduled: 'Open', completed: 'Closed', cancelled: 'Cancelled' };

/** View of a closed meeting (PROJ-S7): agenda, minutes and its tasks, read only. */
export function MeetingView({ meeting }: { meeting: LoadedMeeting }): ReactNode {
  const back = `${MEETINGS_BASE}/${meeting.status === 'scheduled' ? 'open' : 'closed'}`;
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{meeting.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(meeting.meeting_date)} · {meeting.start_time.slice(0, 5)} – {meeting.end_time.slice(0, 5)}
              {meeting.location ? ` · ${meeting.location}` : ''} · {STATUS_WORDS[meeting.status] ?? meeting.status}
            </p>
            <p className="text-sm text-muted-foreground">Initiated by {meeting.created_by_name ?? '—'}</p>
          </div>
          <div className="flex gap-2">
            <ShowLogsButton recordTypes={['meeting']} recordId={meeting.id} />
            <Link href={back} className={buttonVariants({ variant: 'outline' })} data-slot="button" data-size="default">
              Back
            </Link>
          </div>
        </div>
        <Section title="Agenda">
          <p className="whitespace-pre-wrap text-sm">{meeting.agenda || '—'}</p>
        </Section>
        <Section title="Minutes">
          <p className="whitespace-pre-wrap text-sm">{meeting.minutes || 'No minutes were recorded.'}</p>
        </Section>
        <Section title="Tasks">
          {meeting.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks came from this meeting.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {meeting.tasks.map((task) => (
                <li key={task.id}>
                  {task.title} — {task.assignee_name ?? 'Unassigned'}
                  {task.due_date ? `, due ${formatDate(task.due_date)}` : ''} ({task.status === 'completed' ? 'Closed' : 'Open'})
                </li>
              ))}
            </ul>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
