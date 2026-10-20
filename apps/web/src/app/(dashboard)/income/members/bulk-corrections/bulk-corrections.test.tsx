import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BulkCorrectionsContent } from './bulk-corrections-content';
import { correctionOf } from './corrections';

/** INC-S24 — the four corrections as links, each opening its own grid. */

let type = 'reverse-run';
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: () => type }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/lib/finance-roles', () => ({ canWriteFinance: () => true }));
vi.mock('./invoice-corrections', () => ({ DueDateCorrection: () => <p>due grid</p>, WaiveInterestCorrection: () => <p>waive grid</p> }));
vi.mock('./unit-run-corrections', () => ({ ReallocateCorrection: () => <p>units grid</p>, ReverseRunCorrection: () => <p>runs grid</p> }));

describe('Member Income › Bulk Corrections', () => {
  it('lists the four corrections and opens the chosen one', () => {
    render(<BulkCorrectionsContent />);
    const nav = screen.getByRole('navigation', { name: 'Corrections' });
    expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Change due date', 'Re-allocate FIFO', 'Waive interest', 'Reverse a billing run']);
    expect(screen.getByText('runs grid')).toBeTruthy();
  });

  it('opens Change due date for an unknown or missing type', () => {
    type = 'nothing';
    render(<BulkCorrectionsContent />);
    expect(screen.getByText('due grid')).toBeTruthy();
    expect(correctionOf(null)).toBe('due-date');
  });
});
