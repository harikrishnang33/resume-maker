import { createElement, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import styles from './Preview.module.css';

/**
 * The preview IS the PDF: we render the exact same react-pdf document that the
 * Download button produces and show it in an embedded viewer. That guarantees
 * the preview and the downloaded file are byte-for-byte identical — same fonts,
 * layout, and page breaks — on every device. Regeneration is debounced and the
 * previous render stays visible until the new one is ready (no blank flash).
 */
export function Preview() {
  const { doc } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const id = ++genRef.current;
      setBusy(true);
      try {
        const [{ pdf }, { ResumePdf }, { registerPdfFonts }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('../pdf/ResumePdf'),
          import('../pdf/registerFonts'),
        ]);
        registerPdfFonts();
        const element = createElement(ResumePdf, { doc }) as Parameters<typeof pdf>[0];
        const blob = await pdf(element).toBlob();
        if (id !== genRef.current) return; // a newer edit superseded this one
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
        setErr(null);
      } catch (e) {
        if (id === genRef.current) setErr((e as Error).message);
      } finally {
        if (id === genRef.current) setBusy(false);
      }
    }, 450);
    return () => clearTimeout(handle);
  }, [doc]);

  // revoke the last object URL on unmount
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  return (
    <div className={styles.canvas}>
      {busy && <div className={`${styles.badge} no-print`}>Updating…</div>}
      {err ? (
        <div className={styles.message}>Couldn’t render the preview: {err}</div>
      ) : url ? (
        <iframe title="Resume preview" src={`${url}#toolbar=0&navpanes=0&view=FitH`} className={styles.frame} />
      ) : (
        <div className={styles.message}>Rendering preview…</div>
      )}
    </div>
  );
}
