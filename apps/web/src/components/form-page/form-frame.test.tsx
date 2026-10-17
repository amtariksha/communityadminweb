import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '@/components/ui/input';
import { FormFrame } from './form-frame';
import { formModeFor } from './form-mode';
import { useOpenForm } from './use-open-form';

const layout = vi.hoisted(() => ({ value: 'standard' as 'standard' | 'classic' }));
const push = vi.hoisted(() => vi.fn());
vi.mock('@/lib/layout-context', () => ({ useAdminLayout: () => layout.value }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  layout.value = 'standard';
  push.mockReset();
});

function renderFrame(mode: 'dialog' | 'page', extra: Partial<Parameters<typeof FormFrame>[0]> = {}) {
  const handlers = { onSave: vi.fn(), onClose: vi.fn(), onSaveAndNew: vi.fn() };
  render(
    <FormFrame mode={mode} title="Create a Request" open onClose={handlers.onClose} onSave={handlers.onSave} {...extra}>
      <Input aria-label="Write your Request" />
    </FormFrame>,
  );
  return handlers;
}

describe('formModeFor', () => {
  it('opens forms as pages in classic and as dialogs in standard', () => {
    expect(formModeFor('classic')).toBe('page');
    expect(formModeFor('standard')).toBe('dialog');
  });
});

describe('FormFrame — dialog (standard)', () => {
  it('shows the fields in a dialog with Cancel and Save', () => {
    const handlers = renderFrame('dialog');

    expect(screen.getByRole('heading', { name: 'Create a Request' })).toBeTruthy();
    expect(document.querySelector('dialog')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(handlers.onSave).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('never offers Save and New in a dialog', () => {
    renderFrame('dialog', { onSaveAndNew: vi.fn() });

    expect(screen.queryByRole('button', { name: 'Save and New' })).toBeNull();
  });

  it('renders nothing while closed', () => {
    render(
      <FormFrame mode="dialog" title="Create a Request" open={false} onClose={vi.fn()} onSave={vi.fn()}>
        <Input aria-label="Write your Request" />
      </FormFrame>,
    );

    expect(screen.queryByLabelText('Write your Request')).toBeNull();
  });
});

describe('FormFrame — page (classic)', () => {
  it('shows the fields on the page with Save, Save and New and Close', () => {
    const handlers = renderFrame('page', { onSaveAndNew: vi.fn() });

    expect(document.querySelector('dialog')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Create a Request' })).toBeTruthy();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Save', 'Save and New', 'Close']);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('offers Save and New only where the form has it', () => {
    renderFrame('page');

    expect(screen.queryByRole('button', { name: 'Save and New' })).toBeNull();
  });

  it('saves on Enter in a field, through the same handler as Save', () => {
    const handlers = renderFrame('page');

    fireEvent.submit(screen.getByLabelText('Write your Request'));

    expect(handlers.onSave).toHaveBeenCalledTimes(1);
  });

  it('runs Save and New through its own handler', () => {
    const onSaveAndNew = vi.fn();
    const handlers = renderFrame('page', { onSaveAndNew });

    fireEvent.click(screen.getByRole('button', { name: 'Save and New' }));

    expect(onSaveAndNew).toHaveBeenCalledTimes(1);
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it('takes the screen’s own button words and locks them while saving', () => {
    renderFrame('page', { saveLabel: 'Submit', savingLabel: 'Submitting…', saving: true });

    expect((screen.getByRole('button', { name: 'Submitting…' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('useOpenForm', () => {
  it('goes to the form page in classic', () => {
    layout.value = 'classic';
    const openDialog = vi.fn();
    const { result } = renderHook(() => useOpenForm('/helpdesk/new', openDialog));

    result.current();

    expect(push).toHaveBeenCalledWith('/helpdesk/new');
    expect(openDialog).not.toHaveBeenCalled();
  });

  it('opens the dialog in standard', () => {
    const openDialog = vi.fn();
    const { result } = renderHook(() => useOpenForm('/helpdesk/new', openDialog));

    result.current();

    expect(openDialog).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
