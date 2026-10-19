import type { CatalogueRow } from '@/hooks/use-reports';

/**
 * The Admin Reports index as sections and groups (REP-S1). The catalogue
 * arrives in index order; numbers are the definitions' own and are never
 * recomputed after a search.
 */

export interface IndexGroup {
  /** "A. Frequently Used"; null for the un-grouped rows listed first. */
  heading: string | null;
  rows: CatalogueRow[];
}

export interface IndexSection {
  section: number;
  title: string;
  module: string;
  groups: IndexGroup[];
}

export const OTHER_REPORTS = 'Other reports';

/** Rows split into sections, and each section into its runs of one group. */
export function indexSections(rows: readonly CatalogueRow[]): IndexSection[] {
  const sections: IndexSection[] = [];
  for (const row of rows) {
    let section = sections.find((candidate) => candidate.section === row.section);
    if (!section) {
      section = { section: row.section, title: row.section_title, module: row.module, groups: [] };
      sections.push(section);
    }
    // Rows listed elsewhere in their module (no number) come last, under their own heading.
    const heading = row.number === null ? OTHER_REPORTS : row.group;
    const last = section.groups[section.groups.length - 1];
    if (last && last.heading === heading) last.rows.push(row);
    else section.groups.push({ heading, rows: [row] });
  }
  return sections.sort((a, b) => a.section - b.section);
}

// "Ageing" and "aging" are both in use; either finds the other.
const normalise = (text: string): string => text.toLowerCase().replace(/ageing/g, 'aging');

/** Whether a row's name or description holds the search text (any case). */
export function matchesSearch(row: CatalogueRow, text: string): boolean {
  const needle = normalise(text.trim());
  if (!needle) return true;
  return normalise(`${row.name} ${row.description ?? ''}`).includes(needle);
}

export function filterCatalogue(rows: readonly CatalogueRow[], text: string): CatalogueRow[] {
  return rows.filter((row) => matchesSearch(row, text));
}

/** The run page of a report; `from` names the module page it was opened from. */
export function runHref(key: string, from?: string): string {
  const path = `/admin-reports/${encodeURIComponent(key)}`;
  return from ? `${path}?from=${encodeURIComponent(from)}` : path;
}
