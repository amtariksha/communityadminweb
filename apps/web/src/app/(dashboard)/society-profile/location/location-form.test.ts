import { describe, expect, it } from 'vitest';
import type { SocietyProfile } from '@/hooks/use-society-profile';
import { locationChange, locationError, locationFromProfile, mapEmbedUrl } from './location-form';

/** Society Profile › Location (PROF-20): what is sent, what is refused, the map preview. */
const PROFILE: SocietyProfile = {
  name: 'Green Meadows',
  display_name: null,
  logo_url: null,
  address: '12 Lake Road',
  address_line2: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  pin_code: null,
  phone: null,
  builder_url: null,
  amenities_text: null,
  latitude: 12.9,
  longitude: 77.5,
  welcome_message_html: null,
  images: [],
};

describe('Location form', () => {
  const before = locationFromProfile(PROFILE);

  it('sends only what changed, a blank as null', () => {
    expect(locationChange(before, { ...before, pin_code: '560001', address_line2: ' Near the lake ' })).toEqual({
      pin_code: '560001',
      address_line2: 'Near the lake',
    });
    expect(locationChange({ ...before, phone: '080 1234 5678' }, { ...before, phone: '' })).toEqual({ phone: null });
  });

  it('sends the map point whole when either part changed', () => {
    expect(locationChange(before, { ...before, latitude: '12.971599' })).toEqual({ latitude: 12.971599, longitude: 77.5 });
    expect(locationChange(before, { ...before, latitude: '', longitude: '' })).toEqual({ latitude: null, longitude: null });
  });

  it('refuses a missing city, a short pin, an http address, a lone coordinate and an out-of-range one', () => {
    expect(locationError({ ...before, city: ' ' })).toBe('City is required.');
    expect(locationError({ ...before, pin_code: '5600' })).toBe('A pin code is 6 digits.');
    expect(locationError({ ...before, builder_url: 'http://builder.example.in' })).toMatch(/https:\/\//);
    expect(locationError({ ...before, longitude: '' })).toBe('Give latitude and longitude together.');
    expect(locationError({ ...before, latitude: '95' })).toMatch(/−90 to 90/);
    expect(locationError(before)).toBeNull();
  });

  it('previews the point on an OpenStreetMap embed with a marker', () => {
    expect(mapEmbedUrl({ lat: 12.9, lng: 77.5 })).toBe(
      'https://www.openstreetmap.org/export/embed.html?bbox=77.495000,12.895000,77.505000,12.905000&layer=mapnik&marker=12.9,77.5',
    );
  });
});
