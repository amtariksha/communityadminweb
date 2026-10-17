import type { MenuNode } from './classic-menu';

/**
 * Status as menu items (requirements SB-05). A module with status lists
 * (HelpDesk: Open Requests, Closed Requests) declares them once; the menu
 * children, the routes and the counts all come from that list, and each
 * list page reads its status from its route instead of a dropdown.
 */
export interface StatusRoute {
  /** Last route segment, e.g. "open" for /helpdesk/open. */
  slug: string;
  /** Menu label, e.g. "Open Requests". */
  label: string;
}

/** The menu children of a module's status lists, each with its count. */
export function statusMenuChildren(
  moduleId: string,
  basePath: string,
  statuses: readonly StatusRoute[],
  extra: Partial<Omit<MenuNode, 'id' | 'label' | 'href' | 'badgeKey'>> = {},
): MenuNode[] {
  return statuses.map((status) => ({
    id: `${moduleId}.${status.slug}`,
    label: status.label,
    href: `${basePath}/${status.slug}`,
    badgeKey: `${moduleId}.${status.slug}`,
    ...extra,
  }));
}

/** The status a list page shows, from its path; undefined off the lists. */
export function statusFromPath(
  pathname: string,
  basePath: string,
  statuses: readonly StatusRoute[],
): StatusRoute | undefined {
  const rest = pathname.replace(/\/+$/, '');
  if (!rest.startsWith(`${basePath}/`)) return undefined;
  const slug = rest.slice(basePath.length + 1);
  return statuses.find((status) => status.slug === slug);
}

/** Counts by menu badge key: `{ open: 12 }` → `{ 'helpdesk.open': 12 }`. */
export function badgeCounts(
  moduleId: string,
  counts: object | undefined,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts ?? {})
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .map(([slug, count]) => [`${moduleId}.${slug}`, count]),
  );
}
