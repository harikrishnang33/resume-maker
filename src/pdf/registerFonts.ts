import { Font } from '@react-pdf/renderer';
import { CHARTER_FONTS } from './fonts';

let registered = false;

/** Register the embedded Charter family with react-pdf (idempotent). */
export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;
  Font.register({ family: 'Charter', fonts: CHARTER_FONTS });
  // Don't auto-hyphenate words across line breaks — match the LaTeX/preview look
  // (lines wrap on spaces only; compound words stay whole via U+2011).
  Font.registerHyphenationCallback((word) => [word]);
}
