import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryContent } from './directory-content';

/**
 * PROF-01 — an emergency number could be added and deleted but never
 * corrected: useUpdateEmergencyContact was imported and unused. Edit now
 * opens the number's details and Save sends PATCH /directory/emergency-contacts/:id.
 */

const mocks = vi.hoisted(() => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    update: mutation(),
    create: mutation(),
    other: mutation(),
    addToast: vi.fn(),
    contact: {
      id: 'contact-1',
      tenant_id: 'tenant-1',
      name: 'City Hospital Emergency',
      phone: '080 1111 2222',
      category: 'hospital' as const,
      address: 'Main Road',
      available_24_7: true,
      created_at: '2026-10-01',
      updated_at: '2026-10-01',
    },
  };
});

vi.mock('@/hooks', () => ({
  useBusinessCategories: () => ({ data: [] }),
  useCreateBusinessCategory: () => mocks.other,
  useBusinessListings: () => ({ data: [], isLoading: false }),
  useCreateBusinessListing: () => mocks.other,
  useUpdateBusinessListing: () => mocks.other,
  useDeleteBusinessListing: () => mocks.other,
  useEmergencyContacts: () => ({ data: [mocks.contact], isLoading: false }),
  useCreateEmergencyContact: () => mocks.create,
  useUpdateEmergencyContact: () => mocks.update,
  useDeleteEmergencyContact: () => mocks.other,
  useOffers: () => ({ data: [], isLoading: false }),
  useCreateOffer: () => mocks.other,
  useDeleteOffer: () => mocks.other,
  useClubMembers: () => ({ data: [], isLoading: false }),
  useUpdateClubMemberStatus: () => mocks.other,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ addToast: mocks.addToast }),
}));

describe('Directory — Emergency Desk', () => {
  beforeEach(() => {
    mocks.update.mutateAsync.mockClear();
    mocks.create.mutateAsync.mockClear();
  });

  it('edits a number and sends the change as a PATCH', async () => {
    render(<DirectoryContent />);
    fireEvent.click(screen.getByRole('button', { name: /emergency desk/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit City Hospital Emergency' }));
    const phone = screen.getByLabelText('Phone Number *') as HTMLInputElement;
    expect(phone.value).toBe('080 1111 2222');
    fireEvent.change(phone, { target: { value: '108' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.update.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
      id: 'contact-1',
      data: {
        name: 'City Hospital Emergency',
        phone: '108',
        category: 'hospital',
        address: 'Main Road',
        available_24_7: true,
      },
    });
    expect(mocks.create.mutateAsync).not.toHaveBeenCalled();
  });

  it('still adds a new number with an empty form', async () => {
    render(<DirectoryContent />);
    fireEvent.click(screen.getByRole('button', { name: /emergency desk/i }));

    fireEvent.click(screen.getByRole('button', { name: /add emergency contact/i }));
    expect((screen.getByLabelText('Phone Number *') as HTMLInputElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('Contact / Authority Name *'), { target: { value: 'Fire Station' } });
    fireEvent.change(screen.getByLabelText('Phone Number *'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Contact' }));

    await waitFor(() => expect(mocks.create.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.create.mutateAsync.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Fire Station', phone: '101' }),
    );
    expect(mocks.update.mutateAsync).not.toHaveBeenCalled();
  });
});
