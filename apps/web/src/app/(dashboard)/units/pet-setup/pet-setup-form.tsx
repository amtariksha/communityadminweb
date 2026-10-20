'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { RichTextEditor, type PickedPicture } from '@/components/rich-text/rich-text-editor';
import { isBlankHtml } from '@/components/rich-text/editor-html';
import { runHref } from '@/components/reports/report-index-model';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { PET_AGREEMENT_MAX, usePetSettings, usePetStats, useSavePetSettings, type PetSettings } from '@/hooks/use-pets';
import { friendlyError } from '@/lib/api-error';
import { currentRole } from '@/lib/current-role';
import { PICTURE_TYPES, SLOT_PICTURE_BYTES, pickFile, pictureProblem, useUploadPicture } from '../../society-profile/profile-pictures';

// Matches PATCH /tenant-settings/pets.
const WRITE_ROLES: ReadonlySet<string> = new Set(['super_admin', 'community_admin', 'committee_member']);
const PAGE_PATH = '/units/pet-setup';

function usePicturePicker(): () => Promise<PickedPicture | null> {
  const { addToast } = useToast();
  const upload = useUploadPicture();
  return async () => {
    const file = await pickFile(PICTURE_TYPES.join(','));
    if (!file) return null;
    const problem = pictureProblem(file, SLOT_PICTURE_BYTES);
    if (problem) {
      addToast({ title: problem, variant: 'destructive' });
      return null;
    }
    try {
      return { url: await upload(file), file };
    } catch (error) {
      addToast({ title: 'Could not upload the picture', description: friendlyError(error), variant: 'destructive' });
      return null;
    }
  };
}

function UnitsWithPets(): ReactNode {
  const stats = usePetStats();
  const count = stats.data?.units_with_pets ?? 0;
  return (
    <p className="text-sm">
      Total Number of Units having Pets: <span className="font-semibold" data-testid="units-with-pets">{count}</span>
    </p>
  );
}

function SetupFields({ saved }: { saved: PetSettings }): ReactNode {
  const { addToast } = useToast();
  const save = useSavePetSettings();
  const pickPicture = usePicturePicker();
  const editable = WRITE_ROLES.has(currentRole() ?? '');
  const [enabled, setEnabled] = useState(saved.enabled);
  const [agreement, setAgreement] = useState(saved.agreement ?? '');
  const tooLong = agreement.length > PET_AGREEMENT_MAX;

  function submit(): void {
    if (tooLong) return;
    save.mutate(
      { enabled, agreement: isBlankHtml(agreement) ? null : agreement },
      {
        onSuccess: () => addToast({ title: 'Pet Setup saved', variant: 'success' }),
        onError: (error) => addToast({ title: 'Could not save Pet Setup', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={enabled} disabled={!editable} onChange={(event) => setEnabled(event.target.checked)} />
        <span>
          <span className="font-medium">Enable Pet Option — Allow Residents to Add Pets</span>
          <span className="block text-xs text-muted-foreground">
            Off: the resident app hides My Pets and residents cannot add or change pets. The committee can always keep the register.
          </span>
        </span>
      </label>
      <RichTextEditor id="pet-agreement" label="Pet User Agreement" initialHtml={agreement} onChange={setAgreement} onPickImage={pickPicture} readOnly={!editable} />
      <p className={tooLong ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
        {tooLong
          ? `The agreement is at most ${PET_AGREEMENT_MAX.toLocaleString('en-IN')} characters.`
          : "When set, a resident accepts it before their unit's first pet is saved. Changing it does not ask anyone to accept again."}
      </p>
      <UnitsWithPets />
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button type="button" onClick={submit} disabled={save.isPending || tooLong}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
        <Link href={runHref('unit.pets_reports', PAGE_PATH)} className={buttonVariants({ variant: 'outline' })}>
          View pet register
        </Link>
      </div>
    </div>
  );
}

/**
 * Pet Setup (UNIT-35, screen UNIT-S16): whether residents may add pets, the
 * society's pet agreement and how many units have pets. The classic frame
 * adds Show Logs (this setup's saves and the register's changes) and Close.
 */
export function PetSetupForm(): ReactNode {
  const query = usePetSettings();
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold">Pet Setup</h2>
        {query.isLoading && <Skeleton className="h-48 w-full" />}
        {query.isError && <p role="alert" className="text-sm text-destructive">Pet Setup could not be loaded. Reload the page to try again.</p>}
        {query.data === null && <p className="text-sm text-muted-foreground">Pet Setup is not available yet on this server.</p>}
        {query.data && <SetupFields key={query.dataUpdatedAt} saved={query.data} />}
      </CardContent>
    </Card>
  );
}
