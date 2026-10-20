'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MeetingMinutesForm } from '../../meeting-minutes-form';
import { ClosedNotice, WithMeeting } from '../../meeting-loader';
import { LinkResolutions } from '../../meeting-resolutions';
import { MEETINGS_BASE } from '@/lib/meeting-states';

// Projects & Meetings › Meeting Minutes (PROJ-S9, PROJ-11). Save and Close
// Meeting moves the meeting to Closed.
export default function Page(): ReactNode {
  const router = useRouter();
  return (
    <WithMeeting>
      {(meeting) =>
        meeting.status === 'scheduled' ? (
          <MeetingMinutesForm
            mode="page"
            meeting={meeting}
            extra={<LinkResolutions meetingId={meeting.id} linked={meeting.resolutions} />}
            onClose={() => router.push(`${MEETINGS_BASE}/open`)}
            onSaved={(closed) => router.push(`${MEETINGS_BASE}/${closed ? 'closed' : 'open'}`)}
          />
        ) : (
          <ClosedNotice />
        )
      }
    </WithMeeting>
  );
}
