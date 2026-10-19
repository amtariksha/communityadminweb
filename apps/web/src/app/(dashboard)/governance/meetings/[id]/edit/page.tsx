'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MeetingForm } from '../../meeting-form';
import { ClosedNotice, WithMeeting } from '../../meeting-loader';
import { MEETINGS_BASE } from '@/lib/meeting-states';

// Projects & Meetings › Edit Meeting (PROJ-S8, PROJ-11).
export default function Page(): ReactNode {
  const router = useRouter();
  const list = `${MEETINGS_BASE}/open`;
  return (
    <WithMeeting>
      {(meeting) =>
        meeting.status === 'scheduled' ? (
          <MeetingForm mode="page" meeting={meeting} onClose={() => router.push(list)} onSaved={() => router.push(list)} />
        ) : (
          <ClosedNotice />
        )
      }
    </WithMeeting>
  );
}
