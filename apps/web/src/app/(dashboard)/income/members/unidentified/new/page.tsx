'use client';

import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { todayIST } from '@/lib/date';
import { UNIDENTIFIED_HREF } from '../../member-row-actions';
import { RecordUnidentifiedForm } from '../record-form';

// Income Tracker › Member Income › Record unidentified collection, as a page (classic, SB-07; INC-48).
export default function RecordUnidentifiedPage(): ReactNode {
  const router = useRouter();
  const back = () => router.push(UNIDENTIFIED_HREF);
  return <RecordUnidentifiedForm mode="page" today={todayIST()} onClose={back} onRecorded={back} />;
}
