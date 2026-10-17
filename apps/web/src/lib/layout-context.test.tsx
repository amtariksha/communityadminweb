import { describe, expect, it } from 'vitest';
import { resolveAdminLayout } from './layout-context';
import type { User } from './auth';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function user(societies: User['societies']): Pick<User, 'societies'> {
  return { societies };
}

const society = (id: string, admin_layout?: 'standard' | 'classic') => ({
  id,
  name: `Society ${id.slice(0, 1)}`,
  role: 'community_admin',
  ...(admin_layout ? { admin_layout } : {}),
});

describe('resolveAdminLayout', () => {
  it('uses the selected society’s layout from /auth/me', () => {
    expect(
      resolveAdminLayout({
        tenantId: A,
        freshUser: user([society(A, 'classic'), society(B, 'standard')]),
      }),
    ).toBe('classic');
  });

  it('switches with the selected society', () => {
    const fresh = user([society(A, 'classic'), society(B, 'standard')]);
    expect(resolveAdminLayout({ tenantId: B, freshUser: fresh })).toBe('standard');
  });

  it('prefers /auth/me over the copy cached at sign-in', () => {
    expect(
      resolveAdminLayout({
        tenantId: A,
        freshUser: user([society(A, 'standard')]),
        cachedUser: user([society(A, 'classic')]),
      }),
    ).toBe('standard');
  });

  it('uses the cached copy while /auth/me is loading', () => {
    expect(
      resolveAdminLayout({ tenantId: A, cachedUser: user([society(A, 'classic')]) }),
    ).toBe('classic');
  });

  it('uses the society settings for a super admin, who has no society entry', () => {
    expect(
      resolveAdminLayout({
        tenantId: A,
        freshUser: user([]),
        tenantSettings: { admin_layout: 'classic' },
      }),
    ).toBe('classic');
  });

  it('falls back to the copy stored in the browser when the API sends no layout', () => {
    expect(
      resolveAdminLayout({
        tenantId: A,
        freshUser: user([society(A)]),
        stored: 'classic',
      }),
    ).toBe('classic');
  });

  it('falls back to standard for unknown values and with nothing to go on', () => {
    expect(
      resolveAdminLayout({
        tenantId: A,
        tenantSettings: { admin_layout: 'fancy' as unknown as 'classic' },
      }),
    ).toBe('standard');
    expect(resolveAdminLayout({ tenantId: null })).toBe('standard');
  });
});
