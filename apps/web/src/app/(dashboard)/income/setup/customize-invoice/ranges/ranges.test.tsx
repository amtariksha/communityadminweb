import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentRange, DocumentRangeList } from '@/hooks/use-billing-documents';
import { ApiError } from '@/lib/api-error';
import { htmlToLines, linesToHtml } from '../../rich-text';
import { RangeSections } from '../range-sections';
import { periodSample } from './range-rows';

/** INC-40 — Customize Invoice: footers, prefix, header title and period wording by number range. */

const TENANT = '11111111-1111-4111-8111-111111111111';

const mocks = vi.hoisted(() => ({
  lists: {} as Record<string, { data?: DocumentRangeList; error: unknown; dataUpdatedAt: number }>,
  save: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/hooks/use-billing-documents', () => ({
  useDocumentRanges: (series: string, kind: string) =>
    mocks.lists[`${series}:${kind}`] ?? { data: { data: [], current_number: 0 }, error: null, dataUpdatedAt: 1 },
  useSaveDocumentRanges: () => ({ mutateAsync: mocks.save, isPending: false }),
}));

function signIn(role: string): void {
  localStorage.setItem('communityos_tenant', TENANT);
  localStorage.setItem(
    'communityos_user',
    JSON.stringify({ id: 'me', name: 'Test User', phone: '+910000000010', isSuperAdmin: false, role, societies: [{ id: TENANT, name: 'Green Acres', role }] }),
  );
}

const range = (id: string, from: number, to: number | null, footer: string): DocumentRange => ({
  id,
  series: 'member_invoice',
  kind: 'footer',
  from_number: from,
  to_number: to,
  footer_html: footer,
  prefix: null,
  header_title: null,
  frequency: null,
  period_wording: null,
});

const memberFooters = () => within(screen.getByRole('region', { name: 'Footer – Member Income Invoice' }));

beforeEach(() => {
  signIn('accountant');
  mocks.lists = {};
  mocks.save.mockResolvedValue([]);
});
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Customize Invoice number ranges (INC-40)', () => {
  it('draws the five footer tables and the three member invoice grids', () => {
    render(<RangeSections />);

    for (const name of [
      'Footer – Member Income Invoice',
      'Footer – Member Income Receipt',
      'Footer – Utility Income',
      'Footer – Non Member Income Invoice',
      'Footer – Non Member Income Receipt',
      'Invoice Period & Frequency',
      'Prefix Invoice With',
      'Invoice Header Title',
    ]) {
      expect(screen.getByRole('table', { name })).toBeTruthy();
    }
    expect(within(screen.getByRole('region', { name: 'Footer – Member Income Receipt' })).getByText('From Receipt#')).toBeTruthy();
  });

  it('hides Delete on a range already in use and locks its start and footer', () => {
    mocks.lists['member_invoice:footer'] = {
      data: { data: [range('a', 1, 500, '<p>Old footer</p>'), range('b', 501, null, '<p>New footer</p>')], current_number: 300 },
      error: null,
      dataUpdatedAt: 1,
    };
    render(<RangeSections />);

    expect(memberFooters().queryByRole('button', { name: 'Delete row 1' })).toBeNull();
    expect(memberFooters().getByText('In use')).toBeTruthy();
    expect(memberFooters().getByRole('button', { name: 'Delete row 2' })).toBeTruthy();
    expect((memberFooters().getByLabelText('From Invoice#, row 1') as HTMLInputElement).disabled).toBe(true);
    expect((memberFooters().getByLabelText('Footer, row 1') as HTMLTextAreaElement).disabled).toBe(true);
    expect((memberFooters().getByLabelText('To Invoice#, row 1') as HTMLInputElement).disabled).toBe(false);
  });

  it('closes the range in use and sends it unchanged, with the new range as paragraphs', async () => {
    mocks.lists['member_invoice:footer'] = { data: { data: [range('a', 1, null, '<p>Thank you</p>')], current_number: 120 }, error: null, dataUpdatedAt: 1 };
    render(<RangeSections />);

    fireEvent.change(memberFooters().getByLabelText('To Invoice#, row 1'), { target: { value: '200' } });
    fireEvent.click(memberFooters().getByRole('button', { name: /Add row/ }));
    fireEvent.change(memberFooters().getByLabelText('From Invoice#, row 2'), { target: { value: '201' } });
    fireEvent.change(memberFooters().getByLabelText('Footer, row 2'), { target: { value: 'Pay by the 10th.\n<b>Late fee</b> applies.' } });
    fireEvent.click(memberFooters().getByRole('button', { name: /^Save$/ }));

    await vi.waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.save).toHaveBeenCalledWith({
      series: 'member_invoice',
      kind: 'footer',
      rows: [
        { id: 'a', from_number: 1, to_number: 200, footer_html: '<p>Thank you</p>', prefix: null, header_title: null, frequency: null, period_wording: null },
        { from_number: 201, to_number: null, footer_html: '<p>Pay by the 10th.</p><p><b>Late fee</b> applies.</p>' },
      ],
    });
  });

  it('refuses overlapping ranges before sending', () => {
    mocks.lists['member_invoice:footer'] = { data: { data: [range('a', 1, null, '<p>Thank you</p>')], current_number: 0 }, error: null, dataUpdatedAt: 1 };
    render(<RangeSections />);

    fireEvent.click(memberFooters().getByRole('button', { name: /Add row/ }));
    fireEvent.change(memberFooters().getByLabelText('From Invoice#, row 2'), { target: { value: '150' } });
    fireEvent.change(memberFooters().getByLabelText('Footer, row 2'), { target: { value: 'Second' } });

    expect(memberFooters().getByText('Range 1–∞ overlaps 150–∞.')).toBeTruthy();
    expect((memberFooters().getByRole('button', { name: /^Save$/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the ranges without controls to roles that cannot post', () => {
    signIn('committee_member');
    render(<RangeSections />);

    expect(screen.queryByRole('button', { name: /Add row/ })).toBeNull();
  });

  it('says "not available yet" once on a server without the route', () => {
    mocks.lists['member_invoice:footer'] = { error: new ApiError(404, { message: 'Cannot GET' } as never), dataUpdatedAt: 0 };
    render(<RangeSections />);

    expect(screen.getByText('Footers, prefixes and titles by number range are not available yet on this server.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('range helpers', () => {
  it('words the period of the frequency on the April–March year', () => {
    expect(periodSample('{from} to {to}', 'quarterly', '2026-10-20')).toBe('01-10-2026 to 31-12-2026');
    expect(periodSample('', 'yearly', '2026-02-10')).toBe('01-04-2025 to 31-03-2026');
    expect(periodSample('For {from}', '', '2026-02-10')).toBe('');
  });

  it('turns lines into paragraphs and back', () => {
    expect(linesToHtml('One\n\n<ul><li>Two</li></ul>\n')).toBe('<p>One</p><ul><li>Two</li></ul>');
    expect(linesToHtml('  \n ')).toBeNull();
    expect(htmlToLines('<p>A &amp; B</p><p>Line<br>break</p>')).toBe('A & B\nLine\nbreak');
  });
});
