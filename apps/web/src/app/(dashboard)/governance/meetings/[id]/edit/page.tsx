'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MeetingAttachments } from '../../meeting-attachments';
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
          <div className="space-y-4">
            <MeetingForm mode="page" meeting={meeting} onClose={() => router.push(list)} onSaved={() => router.push(list)} />
            {/* PROJ-44 — files on the open meeting. */}
            <MeetingAttachments meeting={meeting} editable />
          </div>
        ) : (
          <ClosedNotice />
        )
      }
    </WithMeeting>
  );
}
