import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusPicker } from './status-picker';

/**
 * HELP-14: the request's status can be set to On Hold or Awaiting Resident
 * Response, in the layout's words; a closed request can only be reopened.
 */

vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => 'classic' }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));

const optionLabels = (): string[] =>
  Array.from((screen.getByLabelText('Change status') as HTMLSelectElement).options).map((option) => option.text);

describe('StatusPicker', () => {
  it('offers both waiting states in the classic words', () => {
    render(<StatusPicker id="s" current="in_progress" onChange={vi.fn()} />);

    expect(optionLabels()).toEqual([
      'New',
      'In Progress',
      'On Hold',
      'Closed',
      'Awaiting Resident Response',
      'Job Completed',
    ]);
  });

  it('offers a closed request only Reopened', () => {
    render(<StatusPicker id="s" current="closed" onChange={vi.fn()} />);

    expect(optionLabels()).toEqual(['Closed', 'Reopened']);
  });

  it('sends the chosen status, and nothing when the current one is chosen again', () => {
    const onChange = vi.fn();
    render(<StatusPicker id="s" current="in_progress" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'awaiting_resident' } });
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'in_progress' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('awaiting_resident');
  });
});
