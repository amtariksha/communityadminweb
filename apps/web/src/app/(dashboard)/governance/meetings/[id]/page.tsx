'use client';

import { type ReactNode } from 'react';
import { WithMeeting } from '../meeting-loader';
import { MeetingView } from '../meeting-view';

// Projects & Meetings › Meetings › View (PROJ-S7, PROJ-10).
export default function Page(): ReactNode {
  return <WithMeeting>{(meeting) => <MeetingView meeting={meeting} />}</WithMeeting>;
}
