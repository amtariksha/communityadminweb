import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExportButton } from './export-button';

describe('ExportButton', () => {
  const rows = [{ name: 'Asha Rao', unit: 'A-101' }];
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'unit', label: 'Unit' },
  ];

  it('renders one button, never a button inside a button', () => {
    const { container } = render(<ExportButton data={rows} filename="members" columns={columns} />);

    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(container.querySelector('button button')).toBeNull();
  });

  it('opens the CSV / Excel choices from its own button', () => {
    render(<ExportButton data={rows} filename="members" columns={columns} label="Export list" />);

    const trigger = screen.getByRole('button', { name: /export list/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Download as CSV')).toBeTruthy();
    expect(screen.getByText('Download as Excel')).toBeTruthy();
  });
});
