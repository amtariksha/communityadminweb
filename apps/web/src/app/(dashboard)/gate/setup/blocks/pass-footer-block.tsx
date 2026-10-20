'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/api-error';
import type { GateSwitches } from '@/hooks/use-gate-settings';
import { pickFile, useUploadPicture } from '../../../society-profile/profile-pictures';
import { NotAvailableYet, SetupBlock } from './setup-block';

const FOOTER_TYPES = ['image/png', 'image/jpeg'];
const FOOTER_BYTES = 1024 * 1024;

/** Why a picked footer cannot be used (PNG or JPEG, at most 1 MB), or null. */
export function footerProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!FOOTER_TYPES.includes(file.type)) return 'Choose a PNG or JPEG image.';
  if (file.size > FOOTER_BYTES) return 'The image must be 1 MB or smaller.';
  return null;
}

interface PassFooterBlockProps {
  switches: GateSwitches | undefined;
  editable: boolean;
  save: (changes: Partial<GateSwitches>) => Promise<unknown>;
  upload?: (file: File) => Promise<string>;
}

/** Block 6 — Visitor Pass Footer Image (GATE-46): shown at most 286 × 81 under every pass. */
export function PassFooterBlock(props: PassFooterBlockProps): ReactNode {
  const supported = props.switches !== undefined && props.switches.pass_footer_image_url !== undefined;
  return (
    <SetupBlock title="Visitor Pass Footer Image" description="PNG or JPEG, 1 MB at most. Shown under every visitor pass, at most 286 × 81 pixels.">
      {supported ? <FooterEditor {...props} current={props.switches?.pass_footer_image_url ?? null} /> : <NotAvailableYet what="Pass footer images" />}
    </SetupBlock>
  );
}

function FooterEditor({ current, editable, save, upload }: PassFooterBlockProps & { current: string | null }): ReactNode {
  const uploadPicture = useUploadPicture();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(work: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function choose(): Promise<void> {
    const file = await pickFile(FOOTER_TYPES.join(','));
    if (!file) return;
    const problem = footerProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    await run(async () => save({ pass_footer_image_url: await (upload ?? uploadPicture)(file) }));
  }

  return (
    <div className="space-y-3">
      {current && current.startsWith('https://') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="Pass footer" style={{ maxWidth: 286, maxHeight: 81 }} className="rounded border object-contain" />
      ) : (
        <p className="text-sm text-muted-foreground">No footer image. Passes show only the society&apos;s name.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {editable && (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void choose()}>
            Upload image
          </Button>
          {current && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void run(() => save({ pass_footer_image_url: null }))}>
              Remove image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
