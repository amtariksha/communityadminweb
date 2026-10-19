/**
 * Client-side copy of the welcome message's allow-list (PROF-21), applied
 * before any HTML goes into the editor's innerHTML. The API sanitises on
 * every write; this is the second line, so a stored or tampered value can
 * never run script in the admin web. No dependency: the HTML is parsed in
 * an inert document (DOMParser runs no script and loads nothing) and
 * rebuilt from the allowed elements only, with no attribute but a checked
 * link href or picture src.
 */
const KEEP: Readonly<Record<string, string>> = {
  p: 'p',
  div: 'p',
  br: 'br',
  ol: 'ol',
  ul: 'ul',
  li: 'li',
  sub: 'sub',
  sup: 'sup',
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
};
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'textarea', 'select', 'svg', 'math']);
const HTTPS = /^https:\/\/[^\s"'<>`]+$/i;

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function rebuildElement(element: Element): string {
  const tag = element.tagName.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) return '';
  const inner = rebuildChildren(element);
  if (tag === 'img') {
    const src = (element.getAttribute('src') ?? '').trim();
    return HTTPS.test(src) ? `<img src="${escapeAttribute(src)}" alt="">` : '';
  }
  if (tag === 'a') {
    const href = (element.getAttribute('href') ?? '').trim();
    return HTTPS.test(href) ? `<a href="${escapeAttribute(href)}" rel="noopener noreferrer" target="_blank">${inner}</a>` : inner;
  }
  const kept = KEEP[tag];
  if (!kept) return inner;
  return kept === 'br' ? '<br>' : `<${kept}>${inner}</${kept}>`;
}

function rebuildChildren(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) out += escapeText(child.textContent ?? '');
    else if (child.nodeType === Node.ELEMENT_NODE) out += rebuildElement(child as Element);
  });
  return out;
}

/** The HTML cut down to the welcome message's allow-list. */
export function safeWelcomeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeText(html);
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return rebuildChildren(parsed.body);
}
