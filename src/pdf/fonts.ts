// Light module (no react-pdf import) so the preview/toolbar can use it without
// pulling the heavy PDF renderer into the main bundle.

// Where the bundled font files live (BASE_URL is '/' on the custom domain).
const BASE = import.meta.env.BASE_URL;

export type FontKey = 'Charter' | 'Times' | 'Helvetica';

export interface FontOption {
  key: FontKey;
  label: string;
  /** font stack used by the on-screen preview so it matches the PDF */
  css: string;
  /** Charter is embedded; Times/Helvetica are the PDF's built-in faces */
  embedded: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    key: 'Charter',
    label: 'Charter',
    css: `'Charter', 'XCharter', 'Bitstream Charter', Georgia, 'Times New Roman', serif`,
    embedded: true,
  },
  { key: 'Times', label: 'Times', css: `'Times New Roman', Times, serif`, embedded: false },
  { key: 'Helvetica', label: 'Helvetica', css: `Helvetica, Arial, sans-serif`, embedded: false },
];

export function fontOption(key?: string): FontOption {
  return FONT_OPTIONS.find((f) => f.key === key) ?? FONT_OPTIONS[0];
}

/** The embedded Charter (XCharter) files + their variants, for react-pdf. */
export const CHARTER_FONTS = [
  { src: `${BASE}fonts/XCharter-Roman.otf`, fontWeight: 'normal' as const, fontStyle: 'normal' as const },
  { src: `${BASE}fonts/XCharter-Bold.otf`, fontWeight: 'bold' as const, fontStyle: 'normal' as const },
  { src: `${BASE}fonts/XCharter-Italic.otf`, fontWeight: 'normal' as const, fontStyle: 'italic' as const },
  { src: `${BASE}fonts/XCharter-BoldItalic.otf`, fontWeight: 'bold' as const, fontStyle: 'italic' as const },
];

export interface RunFont {
  fontFamily: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
}

/** Resolve the concrete react-pdf font for a bold/italic variant of an option. */
export function resolveFont(opt: FontOption, bold: boolean, italic: boolean): RunFont {
  if (opt.embedded) {
    return {
      fontFamily: 'Charter',
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
    };
  }
  if (opt.key === 'Times') {
    const fam = bold && italic ? 'Times-BoldItalic' : bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
    return { fontFamily: fam };
  }
  // Helvetica (built-in uses "Oblique" rather than "Italic")
  const fam =
    bold && italic ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
  return { fontFamily: fam };
}
