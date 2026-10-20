import { describe, expect, it } from 'vitest';
import { footerImageOf } from './pass-content';

/** GATE-46 — the visitor pass shows the society's footer, https addresses only. */
describe('pass footer image', () => {
  it('shows an https footer and nothing else', () => {
    expect(footerImageOf({ pass_footer_image_url: 'https://store.example.com/files/tenants/t/f.png' })).toBe(
      'https://store.example.com/files/tenants/t/f.png',
    );
    expect(footerImageOf({ pass_footer_image_url: null })).toBeNull();
    expect(footerImageOf({ pass_footer_image_url: 'javascript:alert(1)' })).toBeNull();
    expect(footerImageOf({})).toBeNull();
  });
});
