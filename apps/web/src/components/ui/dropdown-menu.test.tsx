import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';

function Menu({ trigger }: { trigger: React.ReactNode }): React.ReactNode {
  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent>
        <DropdownMenuItem>Rename</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenuTrigger', () => {
  it('does not wrap a Button child in a second button, even without asChild', () => {
    const { container } = render(
      <Menu trigger={<DropdownMenuTrigger><Button>Actions</Button></DropdownMenuTrigger>} />,
    );

    expect(container.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByText('Rename')).toBeTruthy();
  });

  it('does not wrap a plain <button> child either', () => {
    const { container } = render(
      <Menu trigger={<DropdownMenuTrigger><button type="button">More</button></DropdownMenuTrigger>} />,
    );

    expect(container.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByText('Rename')).toBeTruthy();
  });

  it('still renders its own button around non-button content', () => {
    render(<Menu trigger={<DropdownMenuTrigger><span>Society</span></DropdownMenuTrigger>} />);

    const trigger = screen.getByRole('button', { name: 'Society' });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Rename')).toBeTruthy();
  });
});
