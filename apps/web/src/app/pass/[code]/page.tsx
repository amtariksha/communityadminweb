import { type ReactNode } from 'react';
import PassContent from './pass-content';

interface PassPageProps {
  params: Promise<{ code: string }>;
}

export default async function PassPage({ params }: PassPageProps): Promise<ReactNode> {
  const { code } = await params;
  return <PassContent code={code} />;
}
