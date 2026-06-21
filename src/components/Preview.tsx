import { useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { NodeView } from './PreviewNode';
import styles from './Preview.module.css';

const PAGE_DIMS = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
};

export function Preview() {
  const { doc, setSelectedId } = useStore();
  const dims = PAGE_DIMS[doc.page.size];
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // y-offsets (px, from the top of the sheet) where each printed page ends
  const [breaks, setBreaks] = useState<number[]>([]);

  const pageStyle = {
    '--page-w': `${dims.w}mm`,
    '--page-min-h': `${dims.h}mm`,
    '--page-margin': `${doc.page.marginMm}mm`,
    '--base-size': `${doc.type.baseSizePt}pt`,
    '--line-height': `${doc.type.lineHeight}`,
    '--space-section': `${doc.spacing.section}em`,
    '--space-subsection': `${doc.spacing.subsection}em`,
    '--space-bullet': `${doc.spacing.bullet}em`,
  } as React.CSSProperties;

  // Measure content vs the printable page height and place page-break guides so
  // the on-screen preview shows exactly how many pages will print.
  useLayoutEffect(() => {
    const pageEl = pageRef.current;
    const contentEl = contentRef.current;
    if (!pageEl || !contentEl) return;
    const recompute = () => {
      const pxPerMm = pageEl.getBoundingClientRect().width / dims.w;
      if (!pxPerMm || !isFinite(pxPerMm)) return;
      const printableMm = dims.h - 2 * doc.page.marginMm;
      if (printableMm <= 0) return setBreaks([]);
      const contentMm = contentEl.getBoundingClientRect().height / pxPerMm;
      const lines: number[] = [];
      for (let k = 1; k * printableMm < contentMm - 0.5; k++) {
        lines.push((doc.page.marginMm + k * printableMm) * pxPerMm);
      }
      setBreaks(lines);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [doc, dims.w, dims.h]);

  const pageCount = breaks.length + 1;

  return (
    <div className={styles.canvas} onClick={() => setSelectedId(null)}>
      <div
        className={`${styles.pageBadge} no-print ${pageCount > 1 ? styles.pageBadgeWarn : ''}`}
      >
        {pageCount === 1 ? '1 page' : `${pageCount} pages`}
      </div>
      <div
        ref={pageRef}
        className={`${styles.page} ${styles.rendered}`}
        id="resume-page"
        style={pageStyle}
      >
        <div ref={contentRef}>
          {(doc.root.children ?? []).map((node) => (
            <NodeView node={node} key={node.id} />
          ))}
        </div>
        {breaks.map((top, i) => (
          <div key={i} className={`${styles.pageBreak} no-print`} style={{ top }}>
            <span>page {i + 2}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
