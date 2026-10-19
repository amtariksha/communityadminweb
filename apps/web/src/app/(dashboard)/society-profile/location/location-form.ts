import type { SocietyProfile, SocietyProfileChange } from '@/hooks/use-society-profile';

/**
 * Society Profile › Location (PROF-S3, PROF-20): the values as typed, the
 * change to send (only what changed; latitude and longitude together), the
 * checks the API also makes, and the map preview address (OpenStreetMap,
 * decision PROF-D1). Pure, so it is tested without a browser.
 */
export interface LocationValues {
  address: string;
  address_line2: string;
  city: string;
  state: string;
  pin_code: string;
  phone: string;
  builder_url: string;
  amenities_text: string;
  latitude: string;
  longitude: string;
}

const TEXT_KEYS = ['address', 'address_line2', 'city', 'state', 'pin_code', 'phone', 'builder_url', 'amenities_text'] as const;
const REQUIRED: ReadonlyArray<[keyof LocationValues, string]> = [
  ['address', 'Address line 1'],
  ['city', 'City'],
  ['state', 'State'],
];

const text = (value: string | null | undefined): string => value ?? '';
const coordinate = (value: number | null | undefined): string => (value == null ? '' : String(value));

export function locationFromProfile(profile: SocietyProfile): LocationValues {
  return {
    address: text(profile.address),
    address_line2: text(profile.address_line2),
    city: text(profile.city),
    state: text(profile.state),
    pin_code: text(profile.pin_code),
    phone: text(profile.phone),
    builder_url: text(profile.builder_url),
    amenities_text: text(profile.amenities_text),
    latitude: coordinate(profile.latitude),
    longitude: coordinate(profile.longitude),
  };
}

/** The typed point, or null when either box is blank or not a number. */
export function typedPoint(values: Pick<LocationValues, 'latitude' | 'longitude'>): { lat: number; lng: number } | null {
  if (values.latitude.trim() === '' || values.longitude.trim() === '') return null;
  const lat = Number(values.latitude);
  const lng = Number(values.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** What is wrong with the form, in the order the fields appear, or null. */
export function locationError(values: LocationValues): string | null {
  for (const [key, label] of REQUIRED) {
    if (values[key].trim() === '') return `${label} is required.`;
  }
  if (values.pin_code.trim() && !/^\d{6}$/.test(values.pin_code.trim())) return 'A pin code is 6 digits.';
  const digits = values.phone.replace(/\D/g, '');
  if (values.phone.trim() && (digits.length < 10 || digits.length > 12)) return 'A phone number has 10 to 12 digits.';
  if (values.builder_url.trim() && !/^https:\/\/\S+$/i.test(values.builder_url.trim())) return 'The builder address must start with https://';
  const oneBlank = (values.latitude.trim() === '') !== (values.longitude.trim() === '');
  if (oneBlank) return 'Give latitude and longitude together.';
  const point = typedPoint(values);
  if (values.latitude.trim() && !point) return 'Latitude and longitude are numbers.';
  if (point && (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180)) return 'Latitude is −90 to 90 and longitude −180 to 180.';
  return null;
}

/** Only the fields that changed; blanks clear; the point is sent whole when either part changed. */
export function locationChange(before: LocationValues, after: LocationValues): SocietyProfileChange {
  const change: SocietyProfileChange = {};
  for (const key of TEXT_KEYS) {
    const value = after[key].trim();
    if (value !== before[key].trim()) (change as Record<string, string | null>)[key] = value || null;
  }
  if (after.latitude.trim() !== before.latitude.trim() || after.longitude.trim() !== before.longitude.trim()) {
    const point = typedPoint(after);
    change.latitude = point ? point.lat : null;
    change.longitude = point ? point.lng : null;
  }
  return change;
}

/** An OpenStreetMap embed centred on the point with a marker (no key, no billing). */
export function mapEmbedUrl(point: { lat: number; lng: number }): string {
  const span = 0.005;
  const bbox = [point.lng - span, point.lat - span, point.lng + span, point.lat + span].map((n) => n.toFixed(6)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.lat},${point.lng}`;
}
