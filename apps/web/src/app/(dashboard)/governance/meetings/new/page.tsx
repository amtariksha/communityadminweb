'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { MeetingForm } from '../meeting-form';
import { MEETINGS_BASE } from '@/lib/meeting-states';

// Projects & Meetings › Create Meeting (PROJ-S8, PROJ-11): the classic page.
export default function Page(): ReactNode {
  const router = useRouter();
  const list = `${MEETINGS_BASE}/open`;
  return <MeetingForm mode="page" onClose={() => router.push(list)} onSaved={() => router.push(list)} />;
}
