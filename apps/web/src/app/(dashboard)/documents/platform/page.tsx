import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Admin Files › Platform Files (FILE-S7). Our own printable posters
// arrive with FILE-40; until then the page says so.
export default function Page(): ReactNode {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        Printable notice-board posters will be available here soon.
      </CardContent>
    </Card>
  );
}
