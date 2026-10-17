import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateRequestForm } from './create-request-form';
import { MAX_FILE_BYTES, requestSubject } from './request-fields';

/**
 * Create Request (HELP-13, screen HELP-S5): one form, a page in classic
 * and the dialog in standard. A unit can be chosen, up to five files of
 * 8 MB are attached, the first line becomes the subject, and classic's
 * "This is urgent!" replaces the standard Priority select.
 */

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  upload: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useHelpdeskCategories: () => ({
    data: [
      { id: 'c-plumbing', name: 'Plumbing' },
      { id: 'c-electrical', name: 'Electrical' },
    ],
  }),
  useTicketCategories: () => ({ data: [] }),
  useCreateTicket: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUploadFileToS3: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));
vi.mock('./use-unit-choices', () => ({
  useUnitChoices: () => ({
    data: [
      { id: 'unit-101', unit_number: 'A-101', block: 'A' },
      { id: 'unit-102', unit_number: 'A-102', block: 'A' },
    ],
  }),
}));
vi.mock('@/components/ui/unit-search-select', () => ({
  UnitSearchSelect: ({ value, onChange, units }: { value: string; onChange: (id: string) => void; units: Array<{ id: string; unit_number: string }> }) => (
    <select aria-label="Select Unit" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No unit</option>
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
      ))}
    </select>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: mocks.addToast }) }));

function file(name: string, bytes = 1024, type = 'image/jpeg'): File {
  const blob = new File(['x'], name, { type });
  Object.defineProperty(blob, 'size', { value: bytes });
  return blob;
}

function renderForm(mode: 'dialog' | 'page' = 'page') {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<CreateRequestForm mode={mode} open onClose={onClose} onSaved={onSaved} />);
  return { onSaved, onClose };
}

function pick(...files: File[]): void {
  fireEvent.change(screen.getByLabelText(/Drag & Drop your files or Browse/), { target: { files } });
}

function fillRequired(text = 'Kitchen tap leaking\nSince last night'): void {
  fireEvent.change(screen.getByLabelText('Write your Request'), { target: { value: text } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'c-plumbing' } });
}

async function submit(label = 'Submit'): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue({ data: { id: 't-1', ticket_number: 'TKT-0001' } });
  mocks.upload.mockReset().mockImplementation(async ({ file: picked }: { file: File }) => ({
    fileUrl: `https://files.test/${picked.name}`,
    key: picked.name,
  }));
  mocks.addToast.mockReset();
});

describe('requestSubject', () => {
  it('is the first line, without markup, at most 120 characters', () => {
    expect(requestSubject('Tap leaking\nmore detail')).toBe('Tap leaking');
    expect(requestSubject('\n\n  <b>Lift</b> stuck  \nfloor 3')).toBe('Lift stuck');
    expect(requestSubject('x'.repeat(300))).toHaveLength(120);
  });
});

describe('Create Request — classic page', () => {
  it('sends the chosen unit and all three files with their names', async () => {
    const { onSaved } = renderForm();
    fillRequired();
    fireEvent.change(screen.getByLabelText('Select Unit'), { target: { value: 'unit-101' } });
    pick(file('tap.jpg'), file('floor.png', 2048, 'image/png'), file('bill.pdf', 4096, 'application/pdf'));

    await submit();

    expect(mocks.upload).toHaveBeenCalledTimes(3);
    const body = mocks.create.mock.calls[0][0];
    expect(body.unit_id).toBe('unit-101');
    expect(body.attachment_urls).toEqual([
      'https://files.test/tap.jpg',
      'https://files.test/floor.png',
      'https://files.test/bill.pdf',
    ]);
    expect(body.attachment_names).toEqual(['tap.jpg', 'floor.png', 'bill.pdf']);
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 't-1' }));
  });

  it('refuses a sixth file before uploading anything', () => {
    renderForm();
    pick(...Array.from({ length: 6 }, (_, i) => file(`photo-${i}.jpg`)));

    expect(screen.getByRole('alert').textContent).toMatch(/at most 5 files/i);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('refuses a file over 8 MB, and a type it cannot take', () => {
    renderForm();
    pick(file('big.jpg', MAX_FILE_BYTES + 1), file('notes.docx', 100, 'application/msword'));

    const message = screen.getByRole('alert').textContent ?? '';
    expect(message).toContain('big.jpg');
    expect(message).toContain('notes.docx');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('sends urgent when the box is ticked, and no priority otherwise', async () => {
    renderForm();
    fillRequired();
    await submit();
    expect('priority' in mocks.create.mock.calls[0][0]).toBe(false);

    // A saved form starts blank again.
    fillRequired();
    fireEvent.click(screen.getByLabelText('This is urgent!'));
    await submit();
    expect(mocks.create.mock.calls[1][0].priority).toBe('urgent');
  });

  it('takes the subject from the first line and keeps the whole text', async () => {
    renderForm();
    const firstLine = 'y'.repeat(300);
    fillRequired(`${firstLine}\nSecond line`);

    await submit();

    const body = mocks.create.mock.calls[0][0];
    expect(body.subject).toBe(firstLine.slice(0, 120));
    expect(body.description).toBe(`${firstLine}\nSecond line`);
    expect(body.category_id).toBe('c-plumbing');
  });

  it('asks for the request and the category before sending', async () => {
    renderForm();

    await submit();

    expect(screen.getByText('Write your request.')).toBeTruthy();
    expect(screen.getByText('Choose a category.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('holds the request while a file has not uploaded, and retries it', async () => {
    mocks.upload.mockRejectedValueOnce(new Error('network'));
    renderForm();
    fillRequired();
    pick(file('tap.jpg'));

    await submit();

    expect(mocks.create).not.toHaveBeenCalled();
    const row = screen.getByRole('listitem');
    expect(within(row).getByText(/could not upload/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(within(row).getByRole('button', { name: 'Retry' }));
    });
    await submit();

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].attachment_urls).toEqual(['https://files.test/tap.jpg']);
  });

  it('offers Submit and Close on the page', () => {
    const { onClose } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByRole('heading', { name: 'Create a Request' })).toBeTruthy();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Create Request — standard dialog', () => {
  it('keeps the Priority select instead of the urgent box', async () => {
    renderForm('dialog');
    expect(document.querySelector('dialog')).not.toBeNull();
    expect(screen.queryByLabelText('This is urgent!')).toBeNull();
    fillRequired();
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });

    await submit('Create Ticket');

    expect(mocks.create.mock.calls[0][0].priority).toBe('high');
  });
});
