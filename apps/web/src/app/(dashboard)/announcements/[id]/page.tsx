import type { ReactNode } from 'react';
import { NoticePage } from '../_classic/notice-page';

// One announcement (ANN-S6).
export default async function Page({ params }: { params: Promise<{ id: string }> }): Promise<ReactNode> {
  const { id } = await params;
  return <NoticePage id={id} />;
}
