import { useEffect, useState } from 'react';
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
  // On narrow screens, show one pane at a time via Edit/Preview tabs. Both stay
  // mounted (CSS hides the inactive one) so printing always emits the resume.
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches,
  );
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const workspaceClass = narrow ? `workspace tab-${tab}` : 'workspace';

  return (
    <div className="app">
      <PrintStyles />
      <Toolbar />
      {narrow && (
        <div className="mobileTabs no-print">
          <button className={tab === 'edit' ? 'mobileTabActive' : ''} onClick={() => setTab('edit')}>
            ✎ Edit
          </button>
          <button className={tab === 'preview' ? 'mobileTabActive' : ''} onClick={() => setTab('preview')}>
            👁 Preview
          </button>
        </div>
      )}
      <div className={workspaceClass}>
        <OutlinePanel />
        <Preview />
      </div>
    </div>
  );
}
