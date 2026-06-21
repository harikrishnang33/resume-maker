import { useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { NodeView } from './PreviewNode';
import styles from './Preview.module.css';

const PAGE_DIMS = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
};

// CSS px per mm (absolute unit: 96px / 25.4mm). Independent of any transform.
const MM = 96 / 25.4;

export function Preview() {
  const { doc, setSelectedId } = useStore();
  const dims = PAGE_DIMS[doc.page.size];
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // y-offsets (CSS px, unscaled) where each printed page ends
  const [breaks, setBreaks] = useState<number[]>([]);
  // fit-to-width scale (≤ 1) so the A4 sheet never overflows the canvas
  const [scale, setScale] = useState(1);
  const [naturalH, setNaturalH] = useState(dims.h * MM);

  const pageWpx = dims.w * MM;

  const pageStyle = {
    '--page-w': `${dims.w}mm`,
    '--page-min-h': `${dims.h}mm`,
    '--page-margin': `${doc.page.marginMm}mm`,
    '--base-size': `${doc.type.baseSizePt}pt`,
    '--line-height': `${doc.type.lineHeight}`,
    '--space-section': `${doc.spacing.section}em`,
    '--space-subsection': `${doc.spacing.subsection}em`,
    '--space-bullet': `${doc.spacing.bullet}em`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  } as React.CSSProperties;

  // Measure (in unscaled CSS px, via offsetHeight + the constant mm→px factor,
  // so the transform never skews it): page-break guides + the fit-to-width scale.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const content = contentRef.current;
    if (!canvas || !page || !content) return;
    const recompute = () => {
      const pad = parseFloat(getComputedStyle(canvas).paddingLeft) || 0;
      const avail = canvas.clientWidth - 2 * pad;
      setScale(avail > 0 ? Math.min(1, avail / pageWpx) : 1);
      setNaturalH(page.offsetHeight);

      const printableMm = dims.h - 2 * doc.page.marginMm;
      if (printableMm <= 0) return setBreaks([]);
      const contentMm = content.offsetHeight / MM;
      const lines: number[] = [];
      for (let k = 1; k * printableMm < contentMm - 0.5; k++) {
        lines.push((doc.page.marginMm + k * printableMm) * MM);
      }
      setBreaks(lines);
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(content);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [doc, dims.w, dims.h, pageWpx]);

  const pageCount = breaks.length + 1;

  return (
    <div ref={canvasRef} className={styles.canvas} onClick={() => setSelectedId(null)}>
      <div className={`${styles.pageBadge} no-print ${pageCount > 1 ? styles.pageBadgeWarn : ''}`}>
        {pageCount === 1 ? '1 page' : `${pageCount} pages`}
      </div>
      {/* the scaler reserves only the SCALED footprint, so the canvas never
          scrolls horizontally and the grey margin stays minimal */}
      <div
        className={styles.scaler}
        style={{ width: `${pageWpx * scale}px`, height: `${naturalH * scale}px` }}
      >
        <div ref={pageRef} className={`${styles.page} ${styles.rendered}`} id="resume-page" style={pageStyle}>
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
    </div>
  );
}
