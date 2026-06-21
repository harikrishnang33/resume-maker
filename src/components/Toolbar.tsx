import { useRef } from 'react';
import { useStore } from '../store';
import { sampleResume } from '../sampleResume';
import { exportJson, downloadText, readFileText, parseDoc } from '../utils/io';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const { doc, dispatch, setSelectedId, locked, setLocked } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      const text = await readFileText(file);
      const parsed = parseDoc(text);
      dispatch({ kind: 'setDoc', doc: parsed });
      setSelectedId(null);
    } catch (err) {
      window.alert(`Could not import: ${(err as Error).message}`);
    }
  };

  const onExport = () => {
    const name = nameFromDoc(doc) || 'resume';
    downloadText(`${name}.json`, exportJson(doc));
  };

  const onReset = () => {
    if (window.confirm('Reset to the seeded resume? This replaces the current content.')) {
      dispatch({ kind: 'setDoc', doc: parseDoc(JSON.stringify(sampleResume)) });
      setSelectedId(null);
    }
  };

  return (
    <header className={`${styles.bar} no-print`}>
      <div className={styles.brand}>
        <span className={styles.logo}>▤</span>
        <span>Resume Maker</span>
      </div>

      <div className={styles.group}>
        <button className={styles.btn} onClick={() => fileRef.current?.click()}>
          ⬆ Import JSON
        </button>
        <button className={styles.btn} onClick={onExport}>
          ⬇ Export JSON
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </div>

      <div className={styles.group}>
        <label className={styles.field}>
          Page
          <select
            value={doc.page.size}
            onChange={(e) => dispatch({ kind: 'setPage', patch: { size: e.target.value as 'A4' | 'Letter' } })}
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </label>
        <label className={styles.field}>
          Margin
          <input
            type="number"
            min={6}
            max={30}
            step={1}
            value={doc.page.marginMm}
            onChange={(e) => dispatch({ kind: 'setPage', patch: { marginMm: clamp(+e.target.value, 6, 30) } })}
          />
          mm
        </label>
        <label className={styles.field}>
          Font
          <input
            type="number"
            min={8}
            max={13}
            step={0.5}
            value={doc.type.baseSizePt}
            onChange={(e) => dispatch({ kind: 'setType', patch: { baseSizePt: clamp(+e.target.value, 8, 13) } })}
          />
          pt
        </label>
        <label className={styles.field}>
          Leading
          <input
            type="number"
            min={1}
            max={1.8}
            step={0.02}
            value={doc.type.lineHeight}
            onChange={(e) => dispatch({ kind: 'setType', patch: { lineHeight: clamp(+e.target.value, 1, 1.8) } })}
          />
        </label>
      </div>

      <div className={styles.group} title="Vertical gaps, in em (relative to font size)">
        <span className={styles.groupLabel}>Spacing</span>
        <label className={styles.field}>
          Section
          <input
            type="number"
            min={0}
            max={3}
            step={0.05}
            value={doc.spacing.section}
            onChange={(e) => dispatch({ kind: 'setSpacing', patch: { section: clamp(+e.target.value, 0, 3) } })}
          />
        </label>
        <label className={styles.field}>
          Sub-section
          <input
            type="number"
            min={0}
            max={3}
            step={0.05}
            value={doc.spacing.subsection}
            onChange={(e) => dispatch({ kind: 'setSpacing', patch: { subsection: clamp(+e.target.value, 0, 3) } })}
          />
        </label>
        <label className={styles.field}>
          Point
          <input
            type="number"
            min={0}
            max={2}
            step={0.02}
            value={doc.spacing.bullet}
            onChange={(e) => dispatch({ kind: 'setSpacing', patch: { bullet: clamp(+e.target.value, 0, 2) } })}
          />
        </label>
      </div>

      <div className={styles.group}>
        <button
          className={locked ? styles.lockBtnActive : styles.lockBtn}
          onClick={() => setLocked(!locked)}
          title={locked ? 'Editing is locked — click to unlock' : 'Lock to prevent accidental edits'}
        >
          {locked ? '🔒 Locked' : '🔓 Lock'}
        </button>
        <button className={styles.ghost} onClick={onReset} disabled={locked}>
          Reset
        </button>
        <button className={styles.primary} onClick={() => window.print()}>
          ⎙ Download PDF
        </button>
      </div>
    </header>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function nameFromDoc(doc: { root: { children?: { type: string; content?: string }[] } }): string {
  const header = doc.root.children?.find((c) => c.type === 'header') as
    | { children?: { type: string; content?: string }[] }
    | undefined;
  const nameNode = header?.children?.find((c) => c.type === 'name');
  const plain = (nameNode?.content ?? '').replace(/<[^>]+>/g, '').trim();
  return plain.replace(/\s+/g, '_');
}
