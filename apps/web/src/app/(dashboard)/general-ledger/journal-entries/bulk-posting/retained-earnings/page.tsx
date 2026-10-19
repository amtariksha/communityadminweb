import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { RetainedEarningsForm } from './retained-earnings-form';

// General Ledger › Journal Entries › Bulk Posting › Automatically Pass
// Retained Earnings (GL-09, screen GL-S9).
export default function Page(): ReactNode {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h3 className="font-semibold">Automatically Pass Retained Earnings</h3>
        <p className="text-sm text-muted-foreground">
          Moves the year&apos;s surplus or deficit to Retained Earnings (Current) and leaves the year open. Run it
          again after later postings to move only what changed.
        </p>
        <RetainedEarningsForm />
      </CardContent>
    </Card>
  );
}
