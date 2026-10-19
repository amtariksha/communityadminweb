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
