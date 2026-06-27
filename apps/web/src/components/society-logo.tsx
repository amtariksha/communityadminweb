'use client';

import { useEffect, useState } from 'react';
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
        // Platform fallback when a society has no uploaded logo: the
        // official Mera Ghar mark (white house + amber window on brand
        // teal), served from /public. Reads well on both light and dark
        // sidebars. Society-uploaded logos still override it at runtime.
        // eslint-disable-next-line @next/next/no-img-element -- static
        // local SVG; next/image would need extra config for no benefit.
        <img
          src="/logo.svg"
          alt="Mera Ghar"
          className="h-8 w-8 rounded-lg"
        />
      )}
      <span className="truncate text-lg font-bold">{branding.name}</span>
    </div>
  );
}
