import type { ResumeDoc, ResumeNode, NodeType, NodeProps, IconName } from '../types';
import { DEFAULT_SPACING, SCHEMA_VERSION } from '../types';
import { newId } from './tree';
import { sanitizeRich, richToPlain } from './richtext';

const VALID_TYPES: NodeType[] = [
  'document',
  'header',
  'name',
  'contactRow',
  'contactItem',
  'summary',
  'section',
  'subsection',
  'bullet',
  'paragraph',
  'gridContainer',
  'gridItem',
];

const VALID_ICONS: IconName[] = ['none', 'email', 'phone', 'location', 'linkedin', 'github', 'web'];

/** Serialize the full document (including hidden nodes) to pretty JSON. */
export function exportJson(doc: ResumeDoc): string {
  return JSON.stringify(doc, null, 2);
}

/** Trigger a browser download of a text blob. */
export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read a File as text (for the import flow). */
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Parse + validate an imported JSON string into a ResumeDoc. Throws a friendly
 * Error if the shape is wrong. Coerces/normalizes loose input so a hand-edited
 * file still loads.
 */
export function parseDoc(json: string): ResumeDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Expected a resume object at the top level.');
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.root || typeof obj.root !== 'object') {
    throw new Error('Missing "root" node — is this a resume export?');
  }

  if (typeof obj.schema === 'number' && obj.schema !== SCHEMA_VERSION) {
    console.warn(
      `Resume schema v${obj.schema} differs from the supported v${SCHEMA_VERSION}; importing on a best-effort basis.`,
    );
  }

  // `seen` enforces globally-unique ids so duplicate/missing ids in the file
  // can never alias two nodes (which would corrupt editing + React keys).
  const seen = new Set<string>();
  const root = normalizeNode(obj.root as Record<string, unknown>, 'document', seen);

  const page = (obj.page ?? {}) as Record<string, unknown>;
  const type = (obj.type ?? {}) as Record<string, unknown>;
  const spacing = (obj.spacing ?? {}) as Record<string, unknown>;

  return {
    schema: SCHEMA_VERSION,
    page: {
      size: page.size === 'Letter' ? 'Letter' : 'A4',
      marginMm: clampNum(page.marginMm, 6, 30, 12),
    },
    type: {
      baseSizePt: clampNum(type.baseSizePt, 8, 13, 10),
      lineHeight: clampNum(type.lineHeight, 1, 1.8, 1.24),
    },
    spacing: {
      section: clampNum(spacing.section, 0, 3, DEFAULT_SPACING.section),
      subsection: clampNum(spacing.subsection, 0, 3, DEFAULT_SPACING.subsection),
      bullet: clampNum(spacing.bullet, 0, 2, DEFAULT_SPACING.bullet),
    },
    root,
  };
}

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

function normalizeNode(
  raw: Record<string, unknown>,
  fallbackType: NodeType,
  seen: Set<string>,
): ResumeNode {
  const type = VALID_TYPES.includes(raw.type as NodeType) ? (raw.type as NodeType) : fallbackType;

  // unique id: regenerate if missing, blank, or already used
  let id = typeof raw.id === 'string' && raw.id ? raw.id : '';
  if (!id || seen.has(id)) id = newId();
  seen.add(id);

  const node: ResumeNode = {
    id,
    type,
    visible: raw.visible !== false, // default visible unless explicitly false
  };
  if (raw.locked === true) node.locked = true;

  // rich text is sanitized at the trust boundary, not just on later edit
  if (typeof raw.content === 'string') node.content = sanitizeRich(raw.content);

  const props = normalizeProps(raw.props);
  if (props) node.props = props;

  if (Array.isArray(raw.children)) {
    node.children = raw.children
      .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
      .map((c) => normalizeNode(c, 'bullet', seen));
  }

  return node;
}

/** Validate + sanitize props against the known NodeProps schema (drops unknown
 *  keys, sanitizes rich fields, strips HTML from plain fields, clamps numbers). */
function normalizeProps(raw: unknown): NodeProps | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const props: NodeProps = {};
  if (typeof r.title === 'string') props.title = richToPlain(r.title);
  if (typeof r.date === 'string') props.date = richToPlain(r.date);
  if (typeof r.heading === 'string') props.heading = sanitizeRich(r.heading);
  if (typeof r.label === 'string') props.label = sanitizeRich(r.label);
  if (typeof r.value === 'string') props.value = sanitizeRich(r.value);
  if (typeof r.icon === 'string' && VALID_ICONS.includes(r.icon as IconName)) {
    props.icon = r.icon as IconName;
  }
  if (r.columns != null) {
    const n = Math.round(Number(r.columns));
    if (Number.isFinite(n)) props.columns = Math.min(4, Math.max(1, n));
  }
  return Object.keys(props).length ? props : undefined;
}
