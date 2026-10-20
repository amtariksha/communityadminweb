import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Announcement } from '@/hooks';
import { notice } from '../_classic/test-notices';
import { linkableUrl, NoticeDetail } from './notice-detail';

/** Attachments open (through a signed link) only when they are http(s) addresses (never `javascript:`). */

const openFile = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-stored-file', () => ({ useOpenStoredFile: () => openFile }));
vi.mock('@/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks')>()),
  useAnnouncementDelivery: () => ({ data: null }),
}));

describe('NoticeDetail attachments', () => {
  it('opens https files and shows anything else as plain text', () => {
    const row: Announcement = notice(1, {
      attachment_urls: ['https://notices.example.test/plan.pdf', 'javascript:alert(1)'],
      attachment_names: ['Plan.pdf', 'Trap.pdf'],
    });
    render(<NoticeDetail notice={row} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan.pdf' }));
    expect(openFile).toHaveBeenCalledWith('https://notices.example.test/plan.pdf', { fileName: 'Plan.pdf' });
    expect(screen.queryByRole('button', { name: 'Trap.pdf' })).toBeNull();
    expect(screen.getByText('Trap.pdf')).toBeTruthy();
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'not a url', 'vbscript:x'])('does not link %s', (url) => {
    expect(linkableUrl(url)).toBeNull();
  });
});
