import type { Announcement } from '@/hooks';

/** Made-up notices for the classic list tests. */
export function notice(index: number, overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: `n-${index}`,
    tenant_id: 't-1',
    title: `Notice ${index}`,
    body: `Water tank cleaning in block A on Sunday ${index}`,
    category: 'maintenance',
    priority: 'normal',
    target_audience: 'owners',
    target_blocks: ['A'],
    attachment_url: null,
    is_pinned: false,
    published_at: '2026-10-01T05:00:00Z',
    expires_at: null,
    created_by: 'u-1',
    author_name: 'Asha Menon',
    created_at: '2026-10-01T05:00:00Z',
    updated_at: '2026-10-01T05:00:00Z',
    status: 'active',
    state: 'active',
    classification: 'official',
    source: 'committee',
    ...overrides,
  };
}
