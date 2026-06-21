import type { IconName } from '../types';

// ---------------------------------------------------------------------------
// Rich text is stored as a constrained HTML string. We only ever allow a tiny
// inline whitelist so that imported JSON and contentEditable output stay safe
// and predictable: <b>, <strong>, <i>, <em>, <u>, <a href>, and <br>.
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'BR']);

/** Sanitize an arbitrary HTML fragment down to the inline whitelist. */
export function sanitizeRich(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement | null;
  if (!root) return '';
  clean(root);
  return root.innerHTML.trim();
}

function clean(node: HTMLElement): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const el = child as HTMLElement;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // unwrap: keep the text/children, drop the tag
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }
    // strip every attribute except href on anchors
    for (const attr of Array.from(el.attributes)) {
      if (el.tagName === 'A' && attr.name === 'href') {
        if (!isSafeHref(attr.value)) el.removeAttribute('href');
        continue;
      }
      el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    clean(el);
  }
}

function isSafeHref(href: string): boolean {
  const v = href.trim().toLowerCase();
  return (
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('mailto:') ||
    v.startsWith('tel:') ||
    v.startsWith('/') ||
    v.startsWith('#')
  );
}

/** Plain-text view of a rich string (for labels / measuring emptiness). */
export function richToPlain(html?: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim();
}

export function isRichEmpty(html?: string): boolean {
  return richToPlain(html).length === 0;
}

/**
 * Replace ASCII hyphens that sit between two non-space characters with a
 * non-breaking hyphen (U+2011), so compound words like "e-commerce" or
 * "multi-tenant" never split across lines. Operates on TEXT NODES only, so it
 * never touches tags or href attributes. Used for the rendered (preview) text;
 * the stored/edited content keeps normal hyphens.
 */
export function protectHyphens(html?: string): string {
  if (!html) return '';
  if (html.indexOf('-') === -1) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent ?? '';
        if (t.indexOf('-') !== -1) child.textContent = t.replace(/(\S)-(\S)/g, '$1‑$2');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/**
 * Auto-build the link target for a contact chip from its icon + the raw text
 * the user typed, so they never have to type a scheme themselves:
 *   email → mailto:,  phone → tel:,  web → https://,
 *   linkedin/github → the profile URL from a handle (or a pasted URL as-is).
 * A value that already has a scheme (https:, mailto:, tel:) is used verbatim.
 * Returns null for non-linkable icons (location / none) or empty text.
 */
export function deriveContactHref(icon: IconName | undefined, text: string): string | null {
  const t = (text || '').trim();
  if (!t) return null;
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  const noScheme = t.replace(/^https?:\/\//i, '');
  switch (icon) {
    case 'email':
      return 'mailto:' + t;
    case 'phone':
      return 'tel:' + t.replace(/[^\d+]/g, '');
    case 'web':
      return 'https://' + t.replace(/^\/+/, '');
    case 'linkedin':
      return /linkedin\.com/i.test(t) ? 'https://' + noScheme : 'https://www.linkedin.com/in/' + t.replace(/^@/, '');
    case 'github':
      return /github\.com/i.test(t) ? 'https://' + noScheme : 'https://github.com/' + t.replace(/^@/, '');
    default:
      return null;
  }
}

/**
 * For a contact chip: if its content contains a link, return the href plus the
 * label HTML with any anchors unwrapped (so the whole chip — icon + text — can
 * be wrapped in ONE anchor without nesting <a> tags). Returns null if no link.
 */
export function contactLink(html?: string): { href: string; labelHtml: string } | null {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const a = doc.querySelector('a[href]');
  if (!a) return null;
  const href = a.getAttribute('href') ?? '';
  doc.body.querySelectorAll('a').forEach((el) => {
    const parent = el.parentNode!;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
  return { href, labelHtml: doc.body.innerHTML };
}
