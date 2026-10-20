import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlatformFiles, POSTERS, posterHref } from './platform-files';

/** FILE-40 — every poster on Platform Files downloads as a print-ready A4 PDF that is in the build. */

const PUBLIC = join(__dirname, '..', '..', '..', '..', '..', 'public');

describe('Platform Files', () => {
  it('offers each poster with a Download link to its PDF', () => {
    render(<PlatformFiles />);

    const links = screen.getAllByRole('link', { name: 'Download PDF' });
    expect(links).toHaveLength(POSTERS.length);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(POSTERS.map(posterHref));
    for (const poster of POSTERS) expect(screen.getByText(poster.title)).toBeTruthy();
  });

  it.each(POSTERS.map((poster) => [poster.slug, poster] as const))('ships %s as an A4 PDF', (_slug, poster) => {
    const file = join(PUBLIC, posterHref(poster));
    expect(existsSync(file)).toBe(true);
    const pdf = readFileSync(file, 'latin1');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    // A4 in points.
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
  });
});
