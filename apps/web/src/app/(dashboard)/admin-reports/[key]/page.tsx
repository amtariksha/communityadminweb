import { Suspense, type ReactNode } from 'react';
import { ReportRunPage } from '@/components/reports/run/report-run-page';

interface ReportRunRouteProps {
  params: Promise<{ key: string }>;
}

export default async function ReportRunRoute({ params }: ReportRunRouteProps): Promise<ReactNode> {
  const { key } = await params;
  // useSearchParams (?from=<module>) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ReportRunPage reportKey={decodeURIComponent(key)} />
    </Suspense>
  );
}
