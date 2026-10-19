import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModulesCard } from './modules-card';

const mocks = vi.hoisted(() => ({
  query: { data: ['invoices', 'tickets'] as string[] | undefined, isLoading: false, isError: false },
}));
vi.mock('@/hooks/use-tenant-features', () => ({ useEnabledFeatures: () => mocks.query }));

afterEach(() => {
  mocks.query = { data: ['invoices', 'tickets'], isLoading: false, isError: false };
});

function stateOf(label: string): string | null | undefined {
  const row = screen.getByText(label).closest('li') as HTMLElement;
  return within(row).getAllByText(/^(On|Off)$/)[0].textContent;
}

describe('ModulesCard (SB-15)', () => {
  it('shows each module as the menus see it: on only when the society has it', () => {
    render(<ModulesCard />);

    expect(stateOf('Invoices')).toBe('On');
    expect(stateOf('Tickets')).toBe('On');
    expect(stateOf('Gate Management')).toBe('Off');
  });

  it('has no switch to save: modules are set by the platform administrator', () => {
    render(<ModulesCard />);

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/switched on and off by the platform/)).toBeTruthy();
  });
});
