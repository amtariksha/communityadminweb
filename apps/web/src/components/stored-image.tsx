'use client';

import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { useStoredFileUrl } from '@/hooks/use-stored-file';

export interface StoredImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** The picture's stored address as the API keeps it, or a local blob: / data: preview. */
  src: string | null | undefined;
  /** Shown when there is no picture, it is not available, or it does not load. */
  fallback?: ReactNode;
  /** Shown while the link is fetched; the fallback when not given. */
  placeholder?: ReactNode;
  /** Sign under this society instead of the selected one (super admin). */
  tenantId?: string;
}

/** A stored picture, shown through a short-lived signed link (lib/stored-file.ts). */
export function StoredImage({ src, fallback = null, placeholder, tenantId, alt = '', onError, ...img }: StoredImageProps): ReactNode {
  const link = useStoredFileUrl(src, { tenantId });
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  if (link.status === 'loading') return placeholder === undefined ? fallback : placeholder;
  const url = link.url;
  if (!url || url === brokenUrl) return fallback;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed object-store link on an arbitrary host
    <img
      {...img}
      src={url}
      alt={alt}
      onError={(event) => {
        setBrokenUrl(url);
        onError?.(event);
      }}
    />
  );
}
