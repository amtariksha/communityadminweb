'use client';

import { useEffect, useState } from 'react';
import { House } from 'lucide-react';
import { getUser, getCurrentTenant } from '@/lib/auth';

interface SocietyBranding {
  logoUrl: string | null;
  name: string;
}

const DEFAULT_NAME = 'Mera Ghar';

/**
 * Resolve the logged-in society's branding from the cached user +
 * selected-tenant in localStorage. Returns the default platform
 * branding when no society is selected or it has no `display_name`.
 */
function resolveBranding(): SocietyBranding {
  const user = getUser();
  const tenantId = getCurrentTenant();
  const society = user?.societies.find((s) => s.id === tenantId);
  return {
    logoUrl: society?.logo_url ?? null,
    name:
      society?.display_name?.trim() ||
      society?.name?.trim() ||
      DEFAULT_NAME,
  };
}

/**
 * Sidebar brand block — shows the logged-in society's own logo +
 * name (white-label runtime branding, backend migration 099), falling
 * back to the default platform badge when the society isn't branded.
 *
 * Branding is read on mount (not during render) to avoid an SSR /
 * hydration mismatch — localStorage is client-only.
 */
export function SocietyLogo() {
  const [branding, setBranding] = useState<SocietyBranding>({
    logoUrl: null,
    name: DEFAULT_NAME,
  });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setBranding(resolveBranding());
  }, []);

  const showImage = branding.logoUrl && !imgFailed;

  return (
    <div className="flex h-16 items-center gap-2 px-6">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- S3 URL,
        // arbitrary host; avoids next.config remotePatterns wiring.
        <img
          src={branding.logoUrl ?? ''}
          alt=""
          className="h-8 w-8 rounded-lg object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        // Platform fallback when a society has no uploaded logo. Brand
        // house glyph (Mera Ghar = "my home") in the brand teal —
        // replaces the old Eassy "e" badge. Swapped for the official
        // Mera Ghar logo image once it's wired in.
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <House className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      <span className="truncate text-lg font-bold">{branding.name}</span>
    </div>
  );
}
