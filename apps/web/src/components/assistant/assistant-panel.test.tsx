import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AssistantAnswer, AssistantStatus } from '@/hooks/use-assistant';
import { AssistantPanel, GEMINI_NOTICE } from './assistant-panel';

const mocks = vi.hoisted(() => ({
  status: { data: undefined as AssistantStatus | null | undefined, isLoading: false, isError: false },
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('@/hooks/use-assistant', () => ({
  useAssistantStatus: () => mocks.status,
  useAskAssistant: () => ({ mutate: mocks.mutate, isPending: mocks.isPending }),
}));
vi.mock('./assistant-screens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./assistant-screens')>()),
  useAssistantScreens: () => [{ path: 'Income Tracker › Defaulters', href: '/income/defaulters' }],
}));

const ON: AssistantStatus = { enabled: true, configured: true, can_change: false, limits: { per_hour: 30, per_day: 150 } };

function ask(question: string): void {
  fireEvent.change(screen.getByLabelText('Ask the Assistant'), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

afterEach(() => {
  vi.clearAllMocks();
  mocks.status = { data: undefined, isLoading: false, isError: false };
});

describe('AssistantPanel', () => {
  it('says it is not available yet while the API has no Assistant (404)', () => {
    mocks.status = { data: null, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    expect(screen.getByText('The Assistant is not available yet.')).toBeTruthy();
    expect(screen.queryByLabelText('Ask the Assistant')).toBeNull();
  });

  it('says it is off for the society, pointing a community admin to Settings', () => {
    mocks.status = { data: { ...ON, enabled: false, can_change: true }, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    expect(screen.getByText(/off for this society/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Settings › Assistant' }).getAttribute('href')).toBe('/settings');
  });

  it('says plainly what is sent to Google Gemini', () => {
    mocks.status = { data: ON, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    expect(screen.getByText(GEMINI_NOTICE)).toBeTruthy();
  });

  it('sends the question with the person’s own menu and shows the answer with its screens', () => {
    mocks.status = { data: ON, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    ask('What does B-204 owe?');

    expect(mocks.mutate).toHaveBeenCalledWith(
      { message: 'What does B-204 owe?', history: [], screens: [{ path: 'Income Tracker › Defaulters', href: '/income/defaulters' }] },
      expect.anything(),
    );
    const answer: AssistantAnswer = {
      reply: 'B-204 owes ₹3,250.00. <img src=x onerror=alert(1)>',
      citations: [
        { label: 'Account Statement', href: '/income/members/u1/statement' },
        { label: 'Elsewhere', href: 'https://example.com/steal' },
        { label: 'Script', href: 'javascript:alert(1)' },
      ],
      cards: [],
      tools: [{ name: 'unit_dues', status: 'ok' }],
      configured: true,
    };
    act(() => mocks.mutate.mock.calls[0][1].onSuccess(answer));

    expect(screen.getByText(/B-204 owes ₹3,250.00/).textContent).toContain('<img');
    expect(document.querySelector('img')).toBeNull();
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/income/members/u1/statement']);
  });

  it('shows the dues figures exactly as returned', () => {
    mocks.status = { data: ON, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    ask('What does B-204 owe?');
    act(() => mocks.mutate.mock.calls[0][1].onSuccess({
      reply: 'B-204 owes ₹3,250.00.',
      citations: [],
      cards: [
        {
          type: 'unit_dues',
          unit_number: 'B-204',
          block: 'B',
          current_due: 3250,
          current_advances: 0,
          from: '2026-04-01',
          to: '2026-10-20',
          rows: [{ date: '2026-10-01', document: 'Invoice', number: 'INV-7', account: 'Maintenance', due: 3250, paid: 0, balance: 3250 }],
          href: '/income/members/u1/statement',
        },
      ],
      tools: [],
      configured: true,
    } satisfies AssistantAnswer));
    expect(screen.getByText(/Current Due/).textContent).toMatch(/B-204 · Current Due ₹3,250(\.00)?/);
    expect(screen.getByText('Invoice INV-7')).toBeTruthy();
  });

  it('shows an error from the API, such as the rate limit, in the conversation', () => {
    mocks.status = { data: ON, isLoading: false, isError: false };
    render(<AssistantPanel onClose={vi.fn()} />);
    ask('Hello');
    act(() => mocks.mutate.mock.calls[0][1].onError(new Error('You have asked the Assistant 30 times this hour.')));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
