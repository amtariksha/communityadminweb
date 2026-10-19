import { describe, expect, it } from 'vitest';
import { isBlankHtml, isSafeLink, normaliseEditorHtml } from './editor-html';

/** The editor's HTML in the API's words (PROF-21). */
describe('editor html', () => {
  it('turns b, i and div into strong, em and p, dropping their attributes', () => {
    expect(normaliseEditorHtml('<div style="x"><b>Gym</b> <i>open</i></div><div>6 a.m.<br></div>')).toBe(
      '<p><strong>Gym</strong> <em>open</em></p><p>6 a.m.<br></p>',
    );
    expect(normaliseEditorHtml('<ul><li>a</li></ul><img src="https://x/y.png">')).toBe('<ul><li>a</li></ul><img src="https://x/y.png">');
  });

  it('knows an empty editor', () => {
    expect(isBlankHtml('<p><br></p>&nbsp;')).toBe(true);
    expect(isBlankHtml('<p><img src="https://x/y.png"></p>')).toBe(false);
    expect(isBlankHtml('<p>Hi</p>')).toBe(false);
  });

  it('inserts https links only', () => {
    expect(isSafeLink('https://example.in/rules')).toBe(true);
    expect(isSafeLink('http://example.in')).toBe(false);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
  });
});
