import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockLinks, UnitBlockLinks } from './block-links';
import type { UnitBlock } from '@/hooks/use-unit-blocks';

const mocks = vi.hoisted(() => ({ query: { data: undefined } as { data?: { data: UnitBlock[]; total_units: number } } }));
vi.mock('@/hooks/use-unit-blocks', () => ({ useUnitBlocks: () => mocks.query }));

const BLOCKS: UnitBlock[] = [
  { id: 'b1', name: 'TOWER A', display_order: 10, unit_count: 40 },
  { id: null, name: 'B', display_order: null, unit_count: 12 },
];

afterEach(() => {
  mocks.query = { data: undefined };
});

describe('BlockLinks (SB-10)', () => {
  it('lists All Blocks first, then each block in order, with unit counts', () => {
    render(<BlockLinks blocks={BLOCKS} totalUnits={53} value={null} onChange={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'All Blocks (53)',
      'TOWER A (40)',
      'B (12)',
    ]);
    expect(screen.getByRole('button', { name: 'All Blocks (53)' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('reports the block chosen, and null for All Blocks', () => {
    const onChange = vi.fn();
    render(<BlockLinks blocks={BLOCKS} totalUnits={53} value="B" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'B (12)' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'TOWER A (40)' }));
    fireEvent.click(screen.getByRole('button', { name: 'All Blocks (53)' }));
    expect(onChange.mock.calls).toEqual([['TOWER A'], [null]]);
  });

  it('renders real links for a list whose block is in the route', () => {
    render(
      <BlockLinks
        blocks={BLOCKS}
        totalUnits={53}
        value="TOWER A"
        hrefFor={(block) => (block ? `/income/members?block=${encodeURIComponent(block)}` : '/income/members')}
      />,
    );

    const link = screen.getByRole('link', { name: 'TOWER A (40)' });
    expect(link.getAttribute('href')).toBe('/income/members?block=TOWER%20A');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'All Blocks (53)' }).getAttribute('href')).toBe('/income/members');
  });

  it('shows nothing until the server lists blocks (older API, or no blocks yet)', () => {
    const { container, rerender } = render(<UnitBlockLinks value={null} onChange={vi.fn()} />);
    expect(container.innerHTML).toBe('');

    mocks.query = { data: { data: BLOCKS, total_units: 53 } };
    rerender(<UnitBlockLinks value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Blocks' })).toBeTruthy();
  });
});
