import { useEffect, useRef, useState } from 'react';
import { protectHyphens, sanitizeRich } from '../utils/richtext';
import styles from './RichText.module.css';

interface Props {
  value: string;
  onCommit: (html: string) => void;
  /** Enter blurs instead of inserting a line break. */
  singleLine?: boolean;
  /** Strip all formatting — used for plain fields (section title, date). */
  plain?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  /** called when the editor gains focus (e.g. to select the node) */
  onFocus?: () => void;
  /** rendered mode: not editable, no toolbar, no hover affordance */
  readOnly?: boolean;
  /** render as a single block "text box" (vs inline) */
  block?: boolean;
}

/**
 * contentEditable that is uncontrolled WHILE FOCUSED (so the caret is never
 * clobbered as you type), but syncs to the incoming `value` whenever it is NOT
 * focused. That lets the same field be edited from two places (the outline and
 * the preview) and stay in sync — whichever one you are not typing in updates
 * itself from the store.
 */
export function RichText({
  value,
  onCommit,
  singleLine,
  plain,
  placeholder,
  className,
  ariaLabel,
  onFocus,
  readOnly,
  block,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(() => stripped(value).length === 0);
  // floating toolbar anchored to the current text selection
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Use presentational tags (<b>/<i>/<u>) rather than inline styles.
    try {
      document.execCommand('styleWithCSS', false, 'false');
    } catch {
      /* not supported everywhere — harmless */
    }
  }, []);

  // Seed on mount + sync external changes, but never while editing here.
  // In read-only (preview) mode, render with non-breaking hyphens so compound
  // words don't split across lines; the editable copy keeps normal hyphens.
  useEffect(() => {
    if (!ref.current || focusedRef.current) return;
    const html = readOnly ? protectHyphens(value || '') : value || '';
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
    setEmpty(stripped(value || '').length === 0);
  }, [value, readOnly]);

  // Position the formatting toolbar above the current selection (only when a
  // non-empty range is selected inside THIS editor). No selection => no bar.
  const TW = 188;
  const TH = 34;
  const refreshToolbar = () => {
    if (plain || readOnly) return setToolbar(null);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !ref.current) return setToolbar(null);
    if (!ref.current.contains(sel.anchorNode) || !ref.current.contains(sel.focusNode)) return setToolbar(null);
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return setToolbar(null);
    let top = rect.top - TH - 6;
    if (top < 6) top = rect.bottom + 6;
    const left = Math.max(6, Math.min(rect.left + rect.width / 2 - TW / 2, window.innerWidth - TW - 6));
    setToolbar({ top, left });
  };

  useEffect(() => {
    if (!focused) {
      setToolbar(null);
      return;
    }
    const handler = () => refreshToolbar();
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, plain, readOnly]);

  const cleanOf = (html: string) => (plain ? stripped(html) : sanitizeRich(html));

  /** Commit current DOM to state WITHOUT rewriting the DOM (keeps the caret). */
  const push = () => {
    if (!ref.current) return;
    const cleaned = cleanOf(ref.current.innerHTML);
    setEmpty(stripped(cleaned).length === 0);
    onCommit(cleaned);
  };

  /** On blur, also canonicalize the DOM (e.g. add rel/target to links). */
  const commitAndNormalize = () => {
    if (!ref.current) return;
    const cleaned = cleanOf(ref.current.innerHTML);
    if (ref.current.innerHTML !== cleaned) ref.current.innerHTML = cleaned;
    setEmpty(stripped(cleaned).length === 0);
    onCommit(cleaned);
  };

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    push();
    refreshToolbar();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (singleLine) {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      } else {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    }
    if (!plain && (e.metaKey || e.ctrlKey)) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        exec('bold');
      } else if (k === 'i') {
        e.preventDefault();
        exec('italic');
      } else if (k === 'u') {
        e.preventDefault();
        exec('underline');
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const addLink = () => {
    // Prefill from an existing <a> under the selection so links are editable;
    // an empty value removes the link. Works on any selected text.
    let existing = '';
    const sel = window.getSelection();
    let n: Node | null = sel?.anchorNode ?? null;
    while (n && n !== ref.current) {
      if (n.nodeType === 1 && (n as HTMLElement).tagName === 'A') {
        existing = (n as HTMLElement).getAttribute('href') || '';
        break;
      }
      n = n.parentNode;
    }
    const url = window.prompt('Link URL (https://…, mailto:…) — leave empty to remove:', existing || 'https://');
    if (url === null) return; // cancelled
    if (url.trim() === '') exec('unlink');
    else exec('createLink', url.trim());
  };

  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      {toolbar && !plain && !readOnly && (
        <span
          className={`${styles.toolbar} no-print`}
          contentEditable={false}
          style={{ position: 'fixed', top: toolbar.top, left: toolbar.left }}
        >
          <button type="button" title="Bold (⌘B)" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}>
            <b>B</b>
          </button>
          <button type="button" title="Italic (⌘I)" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}>
            <i>I</i>
          </button>
          <button type="button" title="Underline (⌘U)" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}>
            <u>U</u>
          </button>
          <button type="button" title="Link" onMouseDown={(e) => { e.preventDefault(); addLink(); }}>
            🔗
          </button>
          <button type="button" title="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}>
            ⌫
          </button>
        </span>
      )}
      <span
        ref={ref}
        className={`${styles.editable} ${block ? styles.block : ''} ${empty && !readOnly ? styles.empty : ''} ${readOnly ? styles.readonly : ''}`}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        spellCheck={false}
        onFocus={() => {
          focusedRef.current = true;
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          focusedRef.current = false;
          setFocused(false);
          commitAndNormalize();
        }}
        onInput={push}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    </span>
  );
}

function stripped(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
