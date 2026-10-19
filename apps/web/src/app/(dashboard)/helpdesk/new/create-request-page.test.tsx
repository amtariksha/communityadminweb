import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateRequestFormProps } from './create-request-form';
import { CreateRequestPage } from './create-request-page';

const push = vi.hoisted(() => vi.fn());
const layout = vi.hoisted(() => ({ value: 'classic' as 'classic' | 'standard' }));
const form = vi.hoisted(() => ({ props: undefined as CreateRequestFormProps | undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => layout.value }));
vi.mock('./create-request-form', () => ({
  CreateRequestForm: (props: CreateRequestFormProps) => {
    form.props = props;
    return null;
  },
}));

beforeEach(() => {
  push.mockReset();
  layout.value = 'classic';
});

describe('Create Request page', () => {
  it('shows the form as a page', () => {
    render(<CreateRequestPage />);

    expect(form.props?.mode).toBe('page');
  });

  it('opens the new request’s record page once saved, in classic (HELP-19)', () => {
    render(<CreateRequestPage />);

    form.props?.onSaved({ id: 't-9' } as never);

    expect(push).toHaveBeenCalledWith('/helpdesk/requests/t-9');
  });

  it('closes to Open Requests in classic and to /tickets in standard', () => {
    render(<CreateRequestPage />);
    form.props?.onClose();
    layout.value = 'standard';
    render(<CreateRequestPage />);
    form.props?.onClose();

    expect(push.mock.calls).toEqual([['/helpdesk/open'], ['/tickets']]);
  });
});
