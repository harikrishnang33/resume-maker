import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { NodeType, NodeProps, ResumeDoc } from './types';
import { sampleResume } from './sampleResume';
import {
  addChild,
  addSiblingAfter,
  duplicateNode,
  indentNode,
  makeNode,
  mapNode,
  moveNodeInDirection,
  moveToParent,
  outdentNode,
  removeNode,
  reorderChildren,
  toggleNodeLock,
  toggleVisible,
} from './utils/tree';
import { parseDoc } from './utils/io';

const STORAGE_KEY = 'resume-maker:doc:v1';

export type Action =
  | { kind: 'setDoc'; doc: ResumeDoc }
  | { kind: 'updateContent'; id: string; content: string }
  | { kind: 'updateProp'; id: string; key: keyof NodeProps; value: string | number }
  | { kind: 'toggleVisible'; id: string }
  | { kind: 'toggleNodeLock'; id: string }
  | { kind: 'move'; id: string; dir: -1 | 1 }
  | { kind: 'indent'; id: string }
  | { kind: 'outdent'; id: string }
  | { kind: 'reorder'; parentId: string; from: number; to: number }
  | { kind: 'moveTo'; id: string; targetParentId: string; index: number }
  | { kind: 'addChild'; parentId: string; type: NodeType }
  | { kind: 'addSibling'; id: string; type: NodeType }
  | { kind: 'delete'; id: string }
  | { kind: 'duplicate'; id: string }
  | { kind: 'setPage'; patch: Partial<ResumeDoc['page']> }
  | { kind: 'setType'; patch: Partial<ResumeDoc['type']> }
  | { kind: 'setSpacing'; patch: Partial<ResumeDoc['spacing']> };

function reducer(doc: ResumeDoc, action: Action): ResumeDoc {
  switch (action.kind) {
    case 'setDoc':
      return action.doc;
    case 'updateContent':
      return { ...doc, root: mapNode(doc.root, action.id, (n) => ({ ...n, content: action.content })) };
    case 'updateProp':
      return {
        ...doc,
        root: mapNode(doc.root, action.id, (n) => {
          const props: NodeProps = { ...n.props };
          (props as Record<string, string | number>)[action.key] = action.value;
          return { ...n, props };
        }),
      };
    case 'toggleVisible':
      return { ...doc, root: toggleVisible(doc.root, action.id) };
    case 'toggleNodeLock':
      return { ...doc, root: toggleNodeLock(doc.root, action.id) };
    case 'move':
      return { ...doc, root: moveNodeInDirection(doc.root, action.id, action.dir) };
    case 'indent':
      return { ...doc, root: indentNode(doc.root, action.id) };
    case 'outdent':
      return { ...doc, root: outdentNode(doc.root, action.id) };
    case 'reorder':
      return { ...doc, root: reorderChildren(doc.root, action.parentId, action.from, action.to) };
    case 'moveTo':
      return { ...doc, root: moveToParent(doc.root, action.id, action.targetParentId, action.index) };
    case 'addChild':
      return { ...doc, root: addChild(doc.root, action.parentId, makeNode(action.type)) };
    case 'addSibling':
      return { ...doc, root: addSiblingAfter(doc.root, action.id, makeNode(action.type)) };
    case 'delete':
      return { ...doc, root: removeNode(doc.root, action.id) };
    case 'duplicate':
      return { ...doc, root: duplicateNode(doc.root, action.id) };
    case 'setPage':
      return { ...doc, page: { ...doc.page, ...action.patch } };
    case 'setType':
      return { ...doc, type: { ...doc.type, ...action.patch } };
    case 'setSpacing':
      return { ...doc, spacing: { ...doc.spacing, ...action.patch } };
    default:
      return doc;
  }
}

function loadInitial(): ResumeDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Route persisted data through parseDoc so it is validated + sanitized on
    // load (a previously-saved malicious payload can never re-inject HTML).
    if (raw) return parseDoc(raw);
  } catch {
    /* ignore corrupt / unparseable storage */
  }
  // Fresh start: normalize the seed too, so links get target/rel consistently.
  try {
    return parseDoc(JSON.stringify(sampleResume));
  } catch {
    return structuredClone(sampleResume);
  }
}

interface StoreValue {
  doc: ResumeDoc;
  dispatch: (a: Action) => void;
  /** bumped on full-document replacement so editors remount with new content */
  docRev: number;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** when locked, all editing/structure controls are disabled */
  locked: boolean;
  setLocked: (v: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [doc, rawDispatch] = useReducer(reducer, undefined, loadInitial);
  const [docRev, setDocRev] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const dispatch = useMemo(
    () =>
      (a: Action) => {
        if (a.kind === 'setDoc') setDocRev((r) => r + 1);
        rawDispatch(a);
      },
    [],
  );

  // autosave (debounced via rAF-ish microtask is overkill; effect is fine)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [doc]);

  const value = useMemo<StoreValue>(
    () => ({ doc, dispatch, docRev, selectedId, setSelectedId, locked, setLocked }),
    [doc, dispatch, docRev, selectedId, locked],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { STORAGE_KEY };
