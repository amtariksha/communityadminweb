'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { NoticeEditor } from '../_parts/notice-editor';
import { noticeStarter } from './starters';

function CreateAnnouncement(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <NoticeEditor
      mode="page"
      starter={noticeStarter(params.get('draft'))}
      onClose={() => router.push('/announcements/active')}
      onSaved={() => router.push('/announcements/active')}
    />
  );
}

// Announcements › Create Announcement as a page (ANN-S5, SB-07); `?draft=`
// names a starting text of ours (starters.ts).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <CreateAnnouncement />
    </Suspense>
  );
}
