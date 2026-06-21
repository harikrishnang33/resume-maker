import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { ResumeDoc } from '../types';
import { ResumePdf } from './ResumePdf';
import { registerPdfFonts } from './registerFonts';

/**
 * Generate the resume as a vector PDF in the browser and download it directly —
 * no print dialog. Identical output on every device (the Charter font is
 * embedded), with selectable, copyable, ATS-readable text.
 */
export async function downloadResumePdf(doc: ResumeDoc, filename: string): Promise<void> {
  registerPdfFonts();
  // ResumePdf renders a <Document>; pdf() wants that element type specifically.
  const element = createElement(ResumePdf, { doc }) as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
