import { describe, expect, it } from 'vitest';
import { plainText, safeAmenityHtml } from './amenity-text';

/** AMEN-22 — Notes and Terms: plain in lists, sanitised again before any innerHTML. */
describe('amenity text', () => {
  it('reads the text out of the markup', () => {
    expect(plainText('<p>No <b>music</b> after 10&nbsp;pm</p><ul><li>Shoes &amp; bags</li></ul>')).toBe('No music after 10 pm Shoes & bags');
    expect(plainText(null)).toBe('');
  });

  it('drops scripts, handlers and links that are not https before showing it', () => {
    const html = safeAmenityHtml('<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src=x onerror=alert(1)>');
    expect(html).toBe('<p>Hi</p>x');
  });
});
