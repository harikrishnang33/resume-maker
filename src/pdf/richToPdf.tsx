import { Text, Link } from '@react-pdf/renderer';
import { protectHyphens } from '../utils/richtext';
import { resolveFont, type FontOption } from './fonts';

interface Ctx {
  opt: FontOption;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** body links underline; contact-chip links don't (matches the preview) */
  linkUnderline: boolean;
}

// react-pdf needs stable-ish keys for sibling runs; a module counter is fine
// because the whole tree is rebuilt on every render.
let k = 0;

function runs(nodes: ChildNode[], ctx: Ctx): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.textContent ?? '');
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    const tag = el.tagName;
    if (tag === 'BR') {
      out.push('\n');
      continue;
    }
    const next: Ctx = {
      ...ctx,
      bold: ctx.bold || tag === 'B' || tag === 'STRONG',
      italic: ctx.italic || tag === 'I' || tag === 'EM',
      underline: ctx.underline || tag === 'U',
    };
    const kids = runs(Array.from(el.childNodes), next);
    const font = resolveFont(next.opt, next.bold, next.italic);
    const style: Record<string, unknown> = { ...font };
    if (next.underline) style.textDecoration = 'underline';

    if (tag === 'A') {
      const href = el.getAttribute('href') ?? undefined;
      const linkStyle = { ...style, color: '#000', textDecoration: ctx.linkUnderline ? 'underline' : 'none' };
      out.push(
        <Link key={k++} src={href} style={linkStyle as never}>
          {kids}
        </Link>,
      );
    } else {
      out.push(
        <Text key={k++} style={style as never}>
          {kids}
        </Text>,
      );
    }
  }
  return out;
}

/**
 * Parse a sanitized rich-text HTML string into react-pdf inline runs
 * (<Text>/<Link>). Meant to be placed inside a parent <Text>.
 *
 * `bold`/`italic`/`underline` seed the formatting context, so a plain-text
 * field that should render bold (section title, heading, grid label) resolves
 * to the bold variant even with no <b> in the content. Each run fully specifies
 * its own font, so this works for the embedded and built-in faces alike.
 */
export function richRuns(
  html: string | undefined,
  opt: FontOption,
  options?: { linkUnderline?: boolean; bold?: boolean; italic?: boolean; underline?: boolean },
): React.ReactNode[] {
  if (!html) return [];
  // U+2011 keeps compound words ("e-commerce") whole; only the embedded font
  // has that glyph, so skip it for the built-in (WinAnsi) faces.
  const src = opt.embedded ? protectHyphens(html) : html;
  const doc = new DOMParser().parseFromString(`<div>${src}</div>`, 'text/html');
  const root = doc.body.firstChild as Element | null;
  if (!root) return [];
  return runs(Array.from(root.childNodes), {
    opt,
    bold: !!options?.bold,
    italic: !!options?.italic,
    underline: !!options?.underline,
    linkUnderline: options?.linkUnderline ?? true,
  });
}
