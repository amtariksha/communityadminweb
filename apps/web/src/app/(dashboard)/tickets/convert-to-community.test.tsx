import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvertToCommunityButton } from './convert-to-community';

/**
 * HELP-15: "Convert to Community Request" is offered on a Personal request,
 * to whoever the API lets convert it (the community admin).
 */

const mocks = vi.hoisted(() => ({ role: 'community_admin', mutateAsync: vi.fn(), addToast: vi.fn() }));
vi.mock('@/lib/current-role', () => ({ currentRole: () => mocks.role }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));
vi.mock('@/hooks', () => ({
  useConvertToCommunity: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

const button = () => screen.queryByRole('button', { name: 'Convert to Community Request' });

beforeEach(() => {
  mocks.role = 'community_admin';
  mocks.mutateAsync.mockReset().mockResolvedValue({ data: {} });
  mocks.addToast.mockReset();
});

describe('ConvertToCommunityButton', () => {
  it('converts a Personal request', async () => {
    render(<ConvertToCommunityButton ticket={{ id: 't-1', request_type: 'personal' }} />);

    await act(async () => {
      fireEvent.click(button() as HTMLElement);
    });

    expect(mocks.mutateAsync).toHaveBeenCalledWith('t-1');
  });

  it('is not offered on a Community request, nor by an API that does not know the type', () => {
    const { rerender } = render(<ConvertToCommunityButton ticket={{ id: 't-1', request_type: 'community' }} />);
    expect(button()).toBeNull();

    rerender(<ConvertToCommunityButton ticket={{ id: 't-1' }} />);
    expect(button()).toBeNull();
  });

  it('is not offered to an accountant', () => {
    mocks.role = 'accountant';
    render(<ConvertToCommunityButton ticket={{ id: 't-1', request_type: 'personal' }} />);

    expect(button()).toBeNull();
  });

  it('says "not available yet" while the API answers 404', async () => {
    mocks.mutateAsync.mockRejectedValue({ status: 404 });
    render(<ConvertToCommunityButton ticket={{ id: 't-1', request_type: 'personal' }} />);

    await act(async () => {
      fireEvent.click(button() as HTMLElement);
    });

    expect(mocks.addToast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Not available yet.' }));
  });
});
