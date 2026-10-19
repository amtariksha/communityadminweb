/** Small display helpers shared by the Assets page and its tabs. */

export const ASSET_TYPE_ICONS: Record<string, string> = {
  equipment: '\uD83D\uDD27',
  furniture: '\uD83D\uDECB',
  vehicle: '\uD83D\uDE97',
  infrastructure: '\uD83C\uDFD7',
  electrical: '\u26A1',
  plumbing: '\uD83D\uDD27',
  fire_safety: '\uD83D\uDD25',
  security: '\uD83D\uDD12',
  hvac: '\u2744\uFE0F',
  elevator: '\uD83D\uDED7',
  generator: '\u26A1',
  cctv: '\uD83D\uDCF9',
};

export function conditionBadgeVariant(condition: string): 'success' | 'default' | 'warning' | 'destructive' {
  switch (condition) {
    case 'excellent':
    case 'good':
      return 'success';
    case 'fair':
      return 'warning';
    case 'poor':
    case 'non_functional':
      return 'destructive';
    default:
      return 'default';
  }
}

export function warrantyStatus(expiryDate: string): { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } {
  if (!expiryDate) return { label: 'N/A', variant: 'secondary' };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { label: 'Expired', variant: 'destructive' };
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'warning' };
  return { label: 'Active', variant: 'success' };
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ASSET-06 — the frequencies the API accepts; older free text is read as one of them.
export const CHECKLIST_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-yearly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

const LEGACY_FREQUENCY: Readonly<Record<string, string>> = {
  'half yearly': 'half_yearly',
  'half-yearly': 'half_yearly',
  annual: 'yearly',
  annually: 'yearly',
};

export function frequencyLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const key = value.trim().toLowerCase();
  const slug = LEGACY_FREQUENCY[key] ?? key;
  return CHECKLIST_FREQUENCY_OPTIONS.find((option) => option.value === slug)?.label ?? value;
}

// 2026-05-09 (QA #350) \u2014 Asset type list must match the backend
// Zod enum exactly:
//   apps/api/src/modules/asset/asset.controller.ts \u2192
//   z.enum(['equipment','furniture','vehicle','infrastructure',
//           'electrical','plumbing','fire_safety','security','hvac',
//           'elevator','generator','cctv','other'])
// The previous UI exposed `heater`, `stp`, `pump`, `ac`, `gas_bank`,
// `transformer`, `fire_system`, `gym_equipment`, `lift` \u2014 none of
// which the backend accepts \u2192 every Save click 400'd with an enum
// validation error. We could have expanded the backend enum but
// the user preferred tightening the UI to the 13 sanctioned
// values (per the bug-triage decision log). The label is the
// human-readable label; the value is the wire format.
export const ASSET_TYPES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'security', label: 'Security' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'elevator', label: 'Elevator' },
  { value: 'generator', label: 'Generator' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'other', label: 'Other' },
];

// Values must match the backend enum + DB CHECK (migration 036); there
// is no 'critical' — the worst state is 'non_functional'.
export const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'non_functional', label: 'Non-functional' },
];

/** The label of an asset category (today's 13 types). */
export function categoryLabel(value: string | null | undefined): string {
  return ASSET_TYPES.find((type) => type.value === value)?.label ?? (value ?? '').replace(/_/g, ' ');
}
