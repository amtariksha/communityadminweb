import { describe, expect, it } from 'vitest';
import { safeWelcomeHtml } from './safe-html';

/** The welcome message's allow-list on the client (PROF-21): nothing that runs survives. */
describe('safeWelcomeHtml', () => {
  it('drops scripts, styles and iframes with their content', () => {
    expect(safeWelcomeHtml('<p>Hi<script>alert(1)</script></p><style>p{}</style><iframe src="https://x"></iframe>')).toBe('<p>Hi</p>');
  });

  it('drops every on* handler and other attribute', () => {
    expect(safeWelcomeHtml('<p onclick="alert(1)" class="x" style="color:red">Hi</p><strong onmouseover="x()">b</strong>')).toBe(
      '<p>Hi</p><strong>b</strong>',
    );
    expect(safeWelcomeHtml('<img src="https://x/y.png" onerror="alert(1)">')).toBe('<img src="https://x/y.png" alt="">');
  });

  it('keeps https links only; javascript:, data: and http links lose their href', () => {
    expect(safeWelcomeHtml('<a href="https://example.in">ok</a>')).toBe(
      '<a href="https://example.in" rel="noopener noreferrer" target="_blank">ok</a>',
    );
    expect(safeWelcomeHtml('<a href="javascript:alert(1)">x</a><a href="JaVaScRiPt:alert(1)">y</a><a href="data:text/html,x">z</a>')).toBe('xyz');
    expect(safeWelcomeHtml('<img src="javascript:alert(1)"><img src="data:image/png;base64,AA">')).toBe('');
  });

  it('keeps lists, sub, sup and reads b, i, div as strong, em, p', () => {
    expect(safeWelcomeHtml('<ul><li><b>Gym</b> m<sup>2</sup></li></ul><div><i>H<sub>2</sub>O</i></div>')).toBe(
      '<ul><li><strong>Gym</strong> m<sup>2</sup></li></ul><p><em>H<sub>2</sub>O</em></p>',
    );
  });

  it('escapes text, so markup typed as text stays text', () => {
    expect(safeWelcomeHtml('3 &lt; 5 &amp;&lt;b&gt;')).toBe('3 &lt; 5 &amp;&lt;b&gt;');
  });
});
