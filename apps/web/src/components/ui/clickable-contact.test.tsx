import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClickablePhone } from './clickable-contact';

describe('ClickablePhone', () => {
  it('dials a full number', () => {
    render(<ClickablePhone phone="+910000000047" />);
    expect(screen.getByRole('link', { name: '+910000000047' }).getAttribute('href')).toBe('tel:+910000000047');
  });

  it('shows a masked number as text, with nothing to dial (Q5)', () => {
    render(<ClickablePhone phone="••••••0047" />);
    expect(screen.getByText('••••••0047')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows a dash without a number', () => {
    render(<ClickablePhone phone={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
