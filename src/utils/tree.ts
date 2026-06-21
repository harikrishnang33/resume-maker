import type { NodeType, ResumeNode } from '../types';

/** Generate a stable unique id. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'n_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Deep clone a node subtree, assigning fresh ids throughout. Optional keys are
 *  only attached when present, so leaf clones match makeNode-built leaves. */
export function cloneWithNewIds(node: ResumeNode): ResumeNode {
  const clone: ResumeNode = { id: newId(), type: node.type, visible: node.visible };
  if (node.locked) clone.locked = true;
  if (node.content !== undefined) clone.content = node.content;
  if (node.props) clone.props = { ...node.props };
  if (node.children) clone.children = node.children.map(cloneWithNewIds);
  return clone;
}

// --- read helpers ----------------------------------------------------------

export interface NodeLocation {
  node: ResumeNode;
  parent: ResumeNode | null;
  index: number;
}

/** Locate a node by id, returning it plus its parent + index. */
export function locate(root: ResumeNode, id: string): NodeLocation | null {
  function walk(node: ResumeNode, parent: ResumeNode | null, index: number): NodeLocation | null {
    if (node.id === id) return { node, parent, index };
    const kids = node.children ?? [];
    for (let i = 0; i < kids.length; i++) {
      const found = walk(kids[i], node, i);
      if (found) return found;
    }
    return null;
  }
  return walk(root, null, -1);
}

// --- immutable transforms ---------------------------------------------------
// Each returns a NEW tree; the original is never mutated.

/** Apply `fn` to the node with `id`, replacing it with the returned node. */
export function mapNode(
  root: ResumeNode,
  id: string,
  fn: (node: ResumeNode) => ResumeNode,
): ResumeNode {
  if (root.id === id) return fn(root);
  if (!root.children) return root;
  let changed = false;
  const children = root.children.map((c) => {
    const next = mapNode(c, id, fn);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

/** Replace the children array of the node with `id`. */
function setChildren(root: ResumeNode, id: string, children: ResumeNode[]): ResumeNode {
  return mapNode(root, id, (n) => ({ ...n, children }));
}

/** Remove a node by id. Returns the new tree (root is never removed). */
export function removeNode(root: ResumeNode, id: string): ResumeNode {
  if (!root.children) return root;
  if (root.children.some((c) => c.id === id)) {
    return { ...root, children: root.children.filter((c) => c.id !== id) };
  }
  let changed = false;
  const children = root.children.map((c) => {
    const next = removeNode(c, id);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

/** Toggle a node's visibility. */
export function toggleVisible(root: ResumeNode, id: string): ResumeNode {
  return mapNode(root, id, (n) => ({ ...n, visible: !n.visible }));
}

/** Toggle a node's per-node lock (freezes the node + its subtree from edits). */
export function toggleNodeLock(root: ResumeNode, id: string): ResumeNode {
  return mapNode(root, id, (n) => ({ ...n, locked: !n.locked }));
}

/** Move a node up or down among its siblings (subtree travels with it). */
export function moveSibling(root: ResumeNode, id: string, dir: -1 | 1): ResumeNode {
  const loc = locate(root, id);
  if (!loc || !loc.parent) return root;
  const siblings = loc.parent.children ?? [];
  const target = loc.index + dir;
  if (target < 0 || target >= siblings.length) return root;
  const next = siblings.slice();
  [next[loc.index], next[target]] = [next[target], next[loc.index]];
  return setChildren(root, loc.parent.id, next);
}

/**
 * Move up/down. Within the parent it swaps with the neighbour; at the parent's
 * boundary it hops into the nearest adjacent sibling container that can hold
 * this node type — e.g. a contact moving between the two contact lines, or a
 * bullet moving into the next job. No-op if there is nowhere compatible to go.
 */
export function moveNodeInDirection(root: ResumeNode, id: string, dir: -1 | 1): ResumeNode {
  const loc = locate(root, id);
  if (!loc || !loc.parent) return root;
  const siblings = loc.parent.children ?? [];
  const within = loc.index + dir;
  if (within >= 0 && within < siblings.length) return moveSibling(root, id, dir);

  const grand = locate(root, loc.parent.id);
  if (!grand || !grand.parent) return root;
  const pSiblings = grand.parent.children ?? [];
  const pIndex = pSiblings.findIndex((c) => c.id === loc.parent!.id);
  for (let i = pIndex + dir; i >= 0 && i < pSiblings.length; i += dir) {
    const cand = pSiblings[i];
    if (allowedChildTypes(cand.type).includes(loc.node.type)) {
      const insertAt = dir === 1 ? 0 : cand.children?.length ?? 0;
      return moveToParent(root, id, cand.id, insertAt);
    }
  }
  return root;
}

/** Whether moveNodeInDirection would actually move the node (for button state). */
export function canMoveInDirection(root: ResumeNode, id: string, dir: -1 | 1): boolean {
  const loc = locate(root, id);
  if (!loc || !loc.parent) return false;
  const siblings = loc.parent.children ?? [];
  const within = loc.index + dir;
  if (within >= 0 && within < siblings.length) return true;
  const grand = locate(root, loc.parent.id);
  if (!grand || !grand.parent) return false;
  const pSiblings = grand.parent.children ?? [];
  const pIndex = pSiblings.findIndex((c) => c.id === loc.parent!.id);
  for (let i = pIndex + dir; i >= 0 && i < pSiblings.length; i += dir) {
    if (allowedChildTypes(pSiblings[i].type).includes(loc.node.type)) return true;
  }
  return false;
}

/** Reorder within a sibling list (used by drag-and-drop). */
export function reorderChildren(
  root: ResumeNode,
  parentId: string,
  fromIndex: number,
  toIndex: number,
): ResumeNode {
  const loc = locate(root, parentId);
  if (!loc) return root;
  const siblings = (loc.node.children ?? []).slice();
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= siblings.length ||
    toIndex >= siblings.length
  ) {
    return root;
  }
  const [moved] = siblings.splice(fromIndex, 1);
  siblings.splice(toIndex, 0, moved);
  return setChildren(root, parentId, siblings);
}

/**
 * Indent a node: nest it as the last child of its immediately preceding
 * sibling. This is how you turn a flat point into a sub-point, or a
 * subsection into a nested subsection.
 */
export function indentNode(root: ResumeNode, id: string): ResumeNode {
  const loc = locate(root, id);
  if (!loc || !loc.parent || loc.index === 0) return root;
  const siblings = loc.parent.children ?? [];
  const prev = siblings[loc.index - 1];
  // structural guard: the previous sibling must be able to hold this node type
  if (!allowedChildTypes(prev.type).includes(loc.node.type)) return root;
  // remove from current position
  const remaining = siblings.filter((c) => c.id !== id);
  let next = setChildren(root, loc.parent.id, remaining);
  // append under previous sibling
  next = mapNode(next, prev.id, (p) => ({
    ...p,
    children: [...(p.children ?? []), loc.node],
  }));
  return next;
}

/**
 * Outdent a node: move it out of its parent so it becomes the parent's next
 * sibling (inside the grandparent). Reverses an indent.
 */
export function outdentNode(root: ResumeNode, id: string): ResumeNode {
  const loc = locate(root, id);
  if (!loc || !loc.parent) return root;
  const grand = locate(root, loc.parent.id);
  if (!grand || !grand.parent) return root; // parent is the document root
  // structural guard: the grandparent must be able to hold this node type
  if (!allowedChildTypes(grand.parent.type).includes(loc.node.type)) return root;
  const parent = loc.parent;
  // Rebuild the grandparent's children in a SINGLE pass: replace the parent
  // with a copy that no longer holds the node, then insert the node right
  // after it. (Doing it in two setChildren passes would reuse a stale parent
  // and duplicate the node.)
  const newParent: ResumeNode = {
    ...parent,
    children: (parent.children ?? []).filter((c) => c.id !== id),
  };
  const grandChildren = (grand.parent.children ?? []).map((c) =>
    c.id === parent.id ? newParent : c,
  );
  const parentPos = grandChildren.findIndex((c) => c.id === parent.id);
  grandChildren.splice(parentPos + 1, 0, loc.node);
  return setChildren(root, grand.parent.id, grandChildren);
}

/** Insert a new node as the last child of `parentId`. */
export function addChild(root: ResumeNode, parentId: string, child: ResumeNode): ResumeNode {
  return mapNode(root, parentId, (n) => ({
    ...n,
    children: [...(n.children ?? []), child],
  }));
}

/**
 * Move an existing node into `targetParentId` at `index` (carrying its subtree).
 * Used by cross-parent drag-and-drop. No-ops if it would create a cycle.
 */
export function moveToParent(
  root: ResumeNode,
  id: string,
  targetParentId: string,
  index: number,
): ResumeNode {
  const loc = locate(root, id);
  const target = locate(root, targetParentId);
  if (!loc || !target) return root;
  if (id === targetParentId) return root;
  // refuse to move a node inside its own subtree
  if (locate(loc.node, targetParentId)) return root;
  const node = loc.node;
  const removed = removeNode(root, id);
  return mapNode(removed, targetParentId, (p) => {
    const kids = (p.children ?? []).slice();
    const at = Math.max(0, Math.min(index, kids.length));
    kids.splice(at, 0, node);
    return { ...p, children: kids };
  });
}

/** Insert a new node immediately after the node with `id` (as a sibling). */
export function addSiblingAfter(root: ResumeNode, id: string, node: ResumeNode): ResumeNode {
  const loc = locate(root, id);
  if (!loc || !loc.parent) return root;
  const siblings = (loc.parent.children ?? []).slice();
  siblings.splice(loc.index + 1, 0, node);
  return setChildren(root, loc.parent.id, siblings);
}

/** Duplicate a node (with fresh ids) right after itself. */
export function duplicateNode(root: ResumeNode, id: string): ResumeNode {
  const loc = locate(root, id);
  if (!loc) return root;
  return addSiblingAfter(root, id, cloneWithNewIds(loc.node));
}

// --- structural rules -------------------------------------------------------

/** A short human label for a node, used in the outline. */
export function nodeLabel(node: ResumeNode): string {
  switch (node.type) {
    case 'document':
      return 'Resume';
    case 'header':
      return 'Header';
    case 'name':
      return stripTags(node.content) || 'Name';
    case 'contactRow':
      return 'Contact line';
    case 'contactItem':
      return stripTags(node.content) || node.props?.icon || 'Contact item';
    case 'summary':
      return 'Summary';
    case 'section':
      return node.props?.title || 'Section';
    case 'subsection':
      return stripTags(node.props?.heading) || 'Subsection';
    case 'bullet':
      return stripTags(node.content) || 'Point';
    case 'paragraph':
      return stripTags(node.content) || 'Paragraph';
    case 'gridContainer':
      return 'Grid';
    case 'gridItem':
      return stripTags(node.props?.label) || 'Grid item';
    default:
      return node.type;
  }
}

function stripTags(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Build a blank node of a given type with sensible defaults. */
export function makeNode(type: NodeType): ResumeNode {
  const base: ResumeNode = { id: newId(), type, visible: true };
  switch (type) {
    case 'section':
      return { ...base, props: { title: 'New Section' }, children: [] };
    case 'subsection':
      return {
        ...base,
        props: { heading: '<b>Title</b>, Organization', date: '' },
        children: [{ id: newId(), type: 'bullet', visible: true, content: 'New point' }],
      };
    case 'bullet':
      return { ...base, content: 'New point' };
    case 'paragraph':
      return { ...base, content: 'New paragraph' };
    case 'contactRow':
      return {
        ...base,
        children: [{ id: newId(), type: 'contactItem', visible: true, content: 'info', props: { icon: 'none' } }],
      };
    case 'contactItem':
      return { ...base, content: 'info', props: { icon: 'none' } };
    case 'gridContainer':
      return {
        ...base,
        props: { columns: 2 },
        children: [
          { id: newId(), type: 'gridItem', visible: true, props: { label: '<b>Label:</b>', value: 'value' } },
        ],
      };
    case 'gridItem':
      return { ...base, props: { label: '<b>Label:</b>', value: 'value' } };
    case 'name':
      return { ...base, content: 'Your Name' };
    case 'summary':
      return { ...base, content: 'Short professional summary.' };
    default:
      return { ...base, children: [] };
  }
}

/** Which child types may be added under a given node type (for the +menu). */
export function allowedChildTypes(type: NodeType): NodeType[] {
  switch (type) {
    case 'document':
      return ['section'];
    case 'header':
      return ['name', 'contactRow', 'summary'];
    case 'contactRow':
      return ['contactItem'];
    case 'section':
      // 'section' is allowed here so you can nest a section inside a section.
      return ['subsection', 'bullet', 'paragraph', 'gridContainer', 'section'];
    case 'subsection':
      return ['bullet', 'subsection', 'paragraph'];
    case 'bullet':
      return ['bullet'];
    case 'gridContainer':
      return ['gridItem'];
    default:
      return [];
  }
}

/** Whether this node type carries an editable rich/plain content payload. */
export function hasContent(type: NodeType): boolean {
  return ['name', 'summary', 'bullet', 'paragraph', 'contactItem'].includes(type);
}
