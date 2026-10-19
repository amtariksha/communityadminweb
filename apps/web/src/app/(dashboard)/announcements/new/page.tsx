'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { NoticeEditor } from '../_parts/notice-editor';

// Announcements › Create Announcement as a page (ANN-S5, SB-07).
export default function Page(): ReactNode {
  const router = useRouter();
  return (
    <NoticeEditor
      mode="page"
      onClose={() => router.push('/announcements/active')}
      onSaved={() => router.push('/announcements/active')}
    />
  );
}
