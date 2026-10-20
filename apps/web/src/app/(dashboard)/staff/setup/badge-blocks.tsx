'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BADGE_BACK_TEXT_MAX, useSaveStaffSettings, useStaffSettings, type StaffSettings } from '@/hooks/use-staff-settings';
import { friendlyError } from '@/lib/api-error';
import { pickFile, useUploadPicture } from '../../society-profile/profile-pictures';
import { footerProblem } from '../../gate/setup/blocks/pass-footer-block';
import { SetupBlock } from '../../gate/setup/blocks/setup-block';

const IMAGE_TYPES = 'image/png,image/jpeg';

interface BadgeBlockProps {
  /** Whether the signed-in user may save (the API re-checks). */
  editable: boolean;
  /** Tests: the upload, instead of the S3 upload route. */
  upload?: (file: File) => Promise<string>;
}

/** Block 2 — Staff ID Card Header Image, with the badge back-side text (STAFF-43). */
export function IdCardBlock({ editable, upload }: BadgeBlockProps): ReactNode {
  const query = useStaffSettings();
  return (
    <SetupBlock title="Staff ID Card Header Image" description="PNG or JPEG, 1 MB at most. Printed at the top of every staff badge; with none, the society's name is printed.">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">The badge settings could not be loaded. Reload the page to try again.</p>
      ) : !query.data ? (
        <p className="text-sm text-muted-foreground">Badge settings are not available yet.</p>
      ) : (
        <div className="space-y-6">
          <HeaderEditor settings={query.data} editable={editable} upload={upload} />
          <BackTextEditor key={query.data.badge_back_text} settings={query.data} editable={editable} />
        </div>
      )}
    </SetupBlock>
  );
}

function useSaving() {
  const save = useSaveStaffSettings();
  const [error, setError] = useState<string | null>(null);
  async function run(work: () => Promise<unknown>): Promise<boolean> {
    setError(null);
    try {
      await work();
      return true;
    } catch (failure) {
      setError(friendlyError(failure));
      return false;
    }
  }
  return { save, error, setError, run };
}

function HeaderEditor({ settings, editable, upload }: BadgeBlockProps & { settings: StaffSettings }): ReactNode {
  const uploadPicture = useUploadPicture();
  const { save, error, setError, run } = useSaving();
  const current = settings.badge_header_image_url;

  async function choose(): Promise<void> {
    const file = await pickFile(IMAGE_TYPES);
    if (!file) return;
    const problem = footerProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    await run(async () => save.mutateAsync({ badge_header_image_url: await (upload ?? uploadPicture)(file) }));
  }

  return (
    <div className="space-y-3">
      {current && current.startsWith('https://') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="ID card header" style={{ maxWidth: 320, maxHeight: 90 }} className="rounded border object-contain" />
      ) : (
        <p className="text-sm text-muted-foreground">No header image. Badges show the society&apos;s name.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {editable && (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => void choose()}>
            Upload new image
          </Button>
          {current && (
            <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={() => void run(() => save.mutateAsync({ badge_header_image_url: null }))}>
              Remove image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BackTextEditor({ settings, editable }: { settings: StaffSettings; editable: boolean }): ReactNode {
  const { save, error, run } = useSaving();
  const [text, setText] = useState(settings.badge_back_text);
  const dirty = text !== settings.badge_back_text;
  return (
    <div className="space-y-2">
      <Label htmlFor="badge-back-text">Badge back-side text</Label>
      <Textarea
        id="badge-back-text"
        rows={4}
        maxLength={BADGE_BACK_TEXT_MAX}
        disabled={!editable}
        placeholder="e.g. If found, please return to the society office."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {text.length} / {BADGE_BACK_TEXT_MAX} characters. Printed on the back of every badge.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {editable && (
        <Button type="button" size="sm" disabled={!dirty || save.isPending} onClick={() => void run(() => save.mutateAsync({ badge_back_text: text }))}>
          Save text
        </Button>
      )}
    </div>
  );
}

/** Block 4 — Device Management: we have no attendance devices (decision STAFF-D4). */
export function DeviceBlock(): ReactNode {
  return (
    <SetupBlock title="Device Management">
      <p className="text-sm text-muted-foreground">No attendance devices are set up for this society.</p>
    </SetupBlock>
  );
}
