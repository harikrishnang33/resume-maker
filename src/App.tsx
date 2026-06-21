import { useEffect } from 'react';
import { useStore } from './store';
import { Toolbar } from './components/Toolbar';
import { OutlinePanel } from './components/OutlinePanel';
import { Preview } from './components/Preview';

const PAGE_MM = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
};

/** Keep the printed paper size + margin in sync with the chosen page. Using a
 *  real @page margin (rather than faking it with sheet padding) means every
 *  physical page — including interior breaks of a multi-page resume — gets the
 *  margin. The print CSS zeroes the on-screen sheet padding to match. */
function PrintStyles() {
  const { doc } = useStore();
  useEffect(() => {
    const id = 'rm-print-page';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    const { w, h } = PAGE_MM[doc.page.size];
    el.textContent = `@page { size: ${w}mm ${h}mm; margin: ${doc.page.marginMm}mm; }`;
  }, [doc.page.size, doc.page.marginMm]);
  return null;
}

export function App() {
  return (
    <div className="app">
      <PrintStyles />
      <Toolbar />
      <div className="workspace">
        <OutlinePanel />
        <Preview />
      </div>
    </div>
  );
}
