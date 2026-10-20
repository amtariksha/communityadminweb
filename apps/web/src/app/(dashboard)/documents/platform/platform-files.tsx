import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import posters from './posters.json';

export interface Poster {
  slug: string;
  title: string;
  summary: string;
  steps: string[];
  more: string;
}

/** Where a poster's print-ready PDF is served from (`public/posters`, made by scripts/posters). */
export function posterHref(poster: Pick<Poster, 'slug'>): string {
  return `/posters/${poster.slug}.pdf`;
}

export const POSTERS: readonly Poster[] = posters;

/** Admin Files › Platform Files (FILE-40, FILE-S7): our own printable notice-board posters, A4 PDFs. */
export function PlatformFiles(): ReactNode {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Print these for the notice board. Each is an A4 PDF with space at the bottom to write the society office&apos;s contact.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {POSTERS.map((poster) => (
          <Card key={poster.slug}>
            <CardHeader>
              <CardTitle>{poster.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{poster.summary}</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {poster.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <a
                href={posterHref(poster)}
                download={`${poster.slug}.pdf`}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
              >
                Download PDF
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
