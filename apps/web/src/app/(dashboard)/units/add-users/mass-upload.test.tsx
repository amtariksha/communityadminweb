import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MassUpload } from './mass-upload';

/** UNIT-29 — Add Users › Mass Upload sends the members file, with invites only when ticked. */

const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: mocks.get, download: vi.fn() } }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

function renderUpload(props: Partial<Parameters<typeof MassUpload>[0]> = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MassUpload allowed invitesOffered invitesEnabled {...props} />
    </QueryClientProvider>,
  );
}

async function preview(): Promise<void> {
  fireEvent.change(screen.getByLabelText('Upload members data: file'), { target: { files: [new File(['x'], 'members.xlsx')] } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  });
}

describe('Add Users › Mass Upload', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.get.mockResolvedValue({ data: [], total: 0 });
    mocks.post.mockResolvedValue({ data: { batch_id: 'b', type: 'members', file_name: 'members.xlsx', total_rows: 0, valid_rows: 0, error_rows: 0, skip_rows: 0, invalid_rows: 'skip', can_apply: false, already_applied: null, rows: [] } });
  });

  it('previews the members file through the members import, invites off by default', async () => {
    renderUpload();
    await preview();
    const [path, body] = mocks.post.mock.calls[0];
    expect(path).toBe('/units/imports/members/preview');
    expect((body as FormData).get('options')).toBe('{"send_invites":false}');
  });

  it('asks for invites when ticked', async () => {
    renderUpload();
    fireEvent.click(screen.getByLabelText('Also send invites to the members added'));
    await preview();
    expect((mocks.post.mock.calls[0][1] as FormData).get('options')).toBe('{"send_invites":true}');
  });

  it('sends no invite option where the society has no resident invites', async () => {
    renderUpload({ invitesOffered: false });
    expect(screen.queryByLabelText('Also send invites to the members added')).toBeNull();
    await preview();
    expect((mocks.post.mock.calls[0][1] as FormData).get('options')).toBeNull();
  });
});
