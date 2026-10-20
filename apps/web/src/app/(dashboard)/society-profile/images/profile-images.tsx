'use client';

import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useUpdateSocietyProfile, type SocietyProfile, type SocietyProfileChange } from '@/hooks/use-society-profile';
import { useLocalPreviews } from '@/hooks/use-stored-file';
import { friendlyError } from '@/lib/api-error';
import { LOGO_BYTES, PICTURE_TYPES, SLOT_PICTURE_BYTES, pickFile, pictureProblem, useUploadPicture } from '../profile-pictures';
import { PictureSlot } from './picture-slot';
import { withSlot } from './picture-slots';
import { PROFILE_IMAGE_SLOTS_COUNT } from './slot-count';

interface ProfileImagesProps {
  profile: SocietyProfile;
  /** Committee and community admin: the six pictures. */
  canEditPictures: boolean;
  /** Community admin: the logo too (PROF-D6). */
  canEditLogo: boolean;
}

/**
 * Society Profile › Images (PROF-S2, PROF-22): six numbered pictures shown
 * as a banner on the resident home screens (decision PROF-D2), and the
 * society logo. Each slot uploads and removes on its own; no page Save.
 */
export function ProfileImages({ profile, canEditPictures, canEditLogo }: ProfileImagesProps): ReactNode {
  const { addToast } = useToast();
  const update = useUpdateSocietyProfile();
  const uploadPicture = useUploadPicture();
  const previews = useLocalPreviews();
  const [busy, setBusy] = useState(false);

  async function send(change: SocietyProfileChange, done: string): Promise<void> {
    try {
      await update.mutateAsync(change);
      addToast({ title: done, variant: 'success' });
    } catch (error) {
      addToast({ title: 'Could not save the picture', description: friendlyError(error), variant: 'destructive' });
    }
  }

  async function uploadInto(maxBytes: number, change: (url: string) => SocietyProfileChange): Promise<void> {
    const file = await pickFile(PICTURE_TYPES.join(','));
    if (!file) return;
    const problem = pictureProblem(file, maxBytes);
    if (problem) return addToast({ title: problem, variant: 'destructive' });
    setBusy(true);
    try {
      const stored = await uploadPicture(file);
      previews.remember(stored, file);
      await send(change(stored), 'Picture saved');
    } catch (error) {
      addToast({ title: 'Could not upload the picture', description: friendlyError(error), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const slots = Array.from({ length: PROFILE_IMAGE_SLOTS_COUNT }, (_, i) => profile.images[i] ?? null);
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">Residents see these pictures as a banner on the resident app and resident web home, in slot order.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((url, index) => (
            <PictureSlot
              key={index}
              label={`Image ${index + 1}`}
              url={previews.previewOf(url) ?? null}
              hint="300 × 200 px · PNG, JPEG or WebP up to 2 MB"
              busy={busy || update.isPending}
              canEdit={canEditPictures}
              onUpload={() => void uploadInto(SLOT_PICTURE_BYTES, (picked) => ({ images: withSlot(profile.images, index, picked) }))}
              onRemove={() => void send({ images: withSlot(profile.images, index, null) }, 'Picture removed')}
            />
          ))}
        </div>
        <h3 className="pt-2 font-semibold">Society Logo</h3>
        <div className="max-w-xs">
          <PictureSlot
            label="Society Logo"
            url={previews.previewOf(profile.logo_url) ?? null}
            hint="PNG, JPEG or WebP up to 1 MB"
            busy={busy || update.isPending}
            canEdit={canEditLogo}
            onUpload={() => void uploadInto(LOGO_BYTES, (picked) => ({ logo_url: picked }))}
            onRemove={() => void send({ logo_url: null }, 'Logo removed')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
