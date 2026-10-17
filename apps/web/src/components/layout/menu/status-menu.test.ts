import { describe, expect, it } from 'vitest';
import { badgeCounts, statusFromPath, statusMenuChildren, type StatusRoute } from './status-menu';

const SCOPES: readonly StatusRoute[] = [
  { slug: 'open', label: 'Open Requests' },
  { slug: 'closed', label: 'Closed Requests' },
];

describe('statusMenuChildren', () => {
  it('makes one menu entry per status, each its own route with a count', () => {
    expect(statusMenuChildren('helpdesk', '/helpdesk', SCOPES)).toEqual([
      { id: 'helpdesk.open', label: 'Open Requests', href: '/helpdesk/open', badgeKey: 'helpdesk.open' },
      { id: 'helpdesk.closed', label: 'Closed Requests', href: '/helpdesk/closed', badgeKey: 'helpdesk.closed' },
    ]);
  });

  it('passes extra fields on to every entry', () => {
    const [first] = statusMenuChildren('helpdesk', '/helpdesk', SCOPES, { logs: ['ticket'] });

    expect(first.logs).toEqual(['ticket']);
  });
});

describe('statusFromPath', () => {
  it.each([
    ['/helpdesk/open', 'open'],
    ['/helpdesk/closed', 'closed'],
    ['/helpdesk/closed/', 'closed'],
  ])('%s shows %s', (path, slug) => {
    expect(statusFromPath(path, '/helpdesk', SCOPES)?.slug).toBe(slug);
  });

  it.each(['/helpdesk', '/helpdesk/setup/categories', '/helpdesk/opened', '/tickets/open'])(
    '%s is no status list',
    (path) => {
      expect(statusFromPath(path, '/helpdesk', SCOPES)).toBeUndefined();
    },
  );
});

describe('badgeCounts', () => {
  it('keys a module’s counts by its status entries', () => {
    expect(badgeCounts('helpdesk', { open: 12, closed: 40 })).toEqual({
      'helpdesk.open': 12,
      'helpdesk.closed': 40,
    });
  });

  it('gives nothing when the counts are unknown', () => {
    expect(badgeCounts('helpdesk', undefined)).toEqual({});
  });
});
