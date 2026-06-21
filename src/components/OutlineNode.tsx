import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useStore } from '../store';
import type { IconName, NodeProps, NodeType, ResumeNode } from '../types';
import { allowedChildTypes, canMoveInDirection, nodeLabel } from '../utils/tree';
import { ICON_OPTIONS } from './Icon';
import { RichText } from './RichText';
import styles from './OutlineNode.module.css';

const TYPE_LABEL: Record<NodeType, string> = {
  document: 'Resume',
  header: 'Header',
  name: 'Name',
  contactRow: 'Contact line',
  contactItem: 'Contact',
  summary: 'Summary',
  section: 'Section',
  subsection: 'Sub-section',
  bullet: 'Point',
  paragraph: 'Paragraph',
  gridContainer: 'Grid',
  gridItem: 'Grid item',
};

interface Props {
  node: ResumeNode;
  index: number;
  siblingCount: number;
  parentIsRoot: boolean;
  /** type of this node's parent */
  parentType: NodeType;
  /** type of the parent's parent (undefined when the parent is the document) */
  grandparentType?: NodeType;
  /** type of the immediately preceding sibling */
  prevType?: NodeType;
  /** true if an ancestor node is locked (lock inherits down the tree) */
  ancestorLocked: boolean;
  depth: number;
}

export function OutlineNode({
  node,
  index,
  parentIsRoot,
  parentType,
  grandparentType,
  prevType,
  ancestorLocked,
  depth,
}: Props) {
  const { doc, dispatch, docRev, selectedId, setSelectedId, locked: globalLocked } = useStore();
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  // effective lock = the global lock, an ancestor's lock, or this node's own lock
  const effLocked = globalLocked || ancestorLocked || !!node.locked;
  const canUp = !effLocked && canMoveInDirection(doc.root, node.id, -1);
  const canDown = !effLocked && canMoveInDirection(doc.root, node.id, 1);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: effLocked,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  };

  const children = node.children ?? [];
  const childTypes = allowedChildTypes(node.type);
  // indent nests under the previous sibling → only if that sibling may hold us
  const canIndent =
    !effLocked && index > 0 && !!prevType && allowedChildTypes(prevType).includes(node.type);
  // outdent moves us up into the grandparent → only if it may hold us
  const canOutdent =
    !effLocked && !parentIsRoot && !!grandparentType && allowedChildTypes(grandparentType).includes(node.type);
  const selected = selectedId === node.id;

  // The outline is the editable surface; the preview mirrors it in real time.
  // Clicking the type tag scrolls the preview to this node.
  const selectAndReveal = () => {
    setSelectedId(node.id);
    const el = document.querySelector(`[data-node-id="${node.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const setContent = (html: string) => dispatch({ kind: 'updateContent', id: node.id, content: html });
  const setProp = (key: keyof NodeProps) => (html: string) =>
    dispatch({ kind: 'updateProp', id: node.id, key, value: html });

  // Which text field this node edits inline (null = a structural container).
  type EditCfg = { value: string; plain?: boolean; singleLine?: boolean; commit: (html: string) => void };
  let edit: EditCfg | null = null;
  switch (node.type) {
    case 'name':
    case 'contactItem':
      edit = { value: node.content ?? '', singleLine: true, commit: setContent };
      break;
    case 'summary':
    case 'bullet':
    case 'paragraph':
      edit = { value: node.content ?? '', commit: setContent };
      break;
    case 'section':
      edit = { value: node.props?.title ?? '', plain: true, singleLine: true, commit: setProp('title') };
      break;
    default:
      edit = null; // gridItem + subsection handled specially; containers have no text
  }

  return (
    <li ref={setNodeRef} style={style} className={styles.item}>
      <div
        data-outline-id={node.id}
        className={`${styles.row} ${selected ? styles.selected : ''} ${
          node.visible ? '' : styles.hiddenRow
        } ${isDragging ? styles.draggingRow : ''}`}
      >
        {effLocked ? (
          <span className={styles.drag} style={{ visibility: 'hidden' }}>⠿</span>
        ) : (
          <button className={styles.drag} title="Drag to reorder among siblings" {...attributes} {...listeners}>
            ⠿
          </button>
        )}

        {children.length > 0 ? (
          <button className={styles.twisty} onClick={() => setOpen((o) => !o)} title={open ? 'Collapse' : 'Expand'}>
            {open ? '▼' : '▶'}
          </button>
        ) : (
          <span className={styles.twistySpace} />
        )}

        <button
          className={styles.visBtn}
          title={node.visible ? 'Hide' : 'Show'}
          disabled={effLocked}
          onClick={() => dispatch({ kind: 'toggleVisible', id: node.id })}
        >
          {node.visible ? '👁' : '🚫'}
        </button>

        <button
          className={`${styles.lockBtn} ${node.locked ? styles.lockBtnOn : ''}`}
          title={
            node.locked
              ? 'Locked — click to unlock this item'
              : ancestorLocked || globalLocked
              ? 'Locked by a parent / global lock'
              : 'Lock this item (and its contents) from edits'
          }
          disabled={globalLocked || ancestorLocked}
          onClick={() => dispatch({ kind: 'toggleNodeLock', id: node.id })}
        >
          {effLocked ? '🔒' : '🔓'}
        </button>

        <button
          type="button"
          className={styles.typeTag}
          onClick={selectAndReveal}
          title="Scroll to this in the preview"
        >
          {TYPE_LABEL[node.type]}
        </button>

        {node.type === 'contactItem' && (
          <select
            className={styles.iconSelect}
            value={node.props?.icon ?? 'none'}
            aria-label="Contact icon"
            disabled={effLocked}
            onChange={(e) =>
              dispatch({ kind: 'updateProp', id: node.id, key: 'icon', value: e.target.value as IconName })
            }
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <div className={styles.editArea}>
          {node.type === 'subsection' ? (
            <span className={styles.subEdit}>
              <RichText
                key={`${node.id}:${docRev}:h`}
                className={styles.labelEditor}
                value={node.props?.heading ?? ''}
                onCommit={setProp('heading')}
                block
                readOnly={effLocked}
                singleLine
                placeholder="Title, Organization"
                ariaLabel="Edit heading"
                onFocus={() => setSelectedId(node.id)}
              />
              <RichText
                key={`${node.id}:${docRev}:d`}
                className={styles.dateEdit}
                value={node.props?.date ?? ''}
                onCommit={setProp('date')}
                block
                readOnly={effLocked}
                plain
                singleLine
                placeholder="Date / date range"
                ariaLabel="Edit date"
                onFocus={() => setSelectedId(node.id)}
              />
            </span>
          ) : node.type === 'gridItem' ? (
            <span className={styles.gridEdit}>
              <RichText
                key={`${node.id}:${docRev}:l`}
                className={styles.labelEditorBold}
                value={node.props?.label ?? ''}
                onCommit={setProp('label')}
                block
                readOnly={effLocked}
                singleLine
                placeholder="Label:"
                ariaLabel="Edit grid label"
                onFocus={() => setSelectedId(node.id)}
              />
              <RichText
                key={`${node.id}:${docRev}:v`}
                className={styles.labelEditor}
                value={node.props?.value ?? ''}
                onCommit={setProp('value')}
                block
                readOnly={effLocked}
                placeholder="value"
                ariaLabel="Edit grid value"
                onFocus={() => setSelectedId(node.id)}
              />
            </span>
          ) : edit ? (
            <RichText
              key={`${node.id}:${docRev}`}
              className={styles.labelEditor}
              value={edit.value}
              onCommit={edit.commit}
              plain={edit.plain}
              singleLine={edit.singleLine}
              block
              readOnly={effLocked}
              placeholder={TYPE_LABEL[node.type]}
              ariaLabel={`Edit ${TYPE_LABEL[node.type]}`}
              onFocus={() => setSelectedId(node.id)}
            />
          ) : (
            <button type="button" className={styles.labelStatic} onClick={selectAndReveal}>
              {nodeLabel(node)}
            </button>
          )}
        </div>
        <i className={styles.rowBreak} aria-hidden="true" />

        {!globalLocked && (
        <span className={styles.actions}>
          <button title="Move up" disabled={!canUp} onClick={() => dispatch({ kind: 'move', id: node.id, dir: -1 })}>
            ↑
          </button>
          <button title="Move down" disabled={!canDown} onClick={() => dispatch({ kind: 'move', id: node.id, dir: 1 })}>
            ↓
          </button>
          <button title="Indent (nest under the item above)" disabled={!canIndent} onClick={() => dispatch({ kind: 'indent', id: node.id })}>
            ⇥
          </button>
          <button title="Outdent (move out one level)" disabled={!canOutdent} onClick={() => dispatch({ kind: 'outdent', id: node.id })}>
            ⇤
          </button>
          {childTypes.length > 0 && (
            <span className={styles.addWrap}>
              <button title="Add inside" disabled={effLocked} onClick={() => setMenuOpen((m) => !m)}>
                ＋
              </button>
              {menuOpen && (
                <span className={styles.menu}>
                  {childTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        dispatch({ kind: 'addChild', parentId: node.id, type: t });
                        setMenuOpen(false);
                        setOpen(true);
                      }}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </span>
              )}
            </span>
          )}
          <button title="Duplicate" disabled={effLocked} onClick={() => dispatch({ kind: 'duplicate', id: node.id })}>
            ⧉
          </button>
          <button
            className={styles.del}
            title="Delete"
            disabled={effLocked}
            onClick={() => {
              if (window.confirm(`Delete this ${TYPE_LABEL[node.type].toLowerCase()}?`)) {
                dispatch({ kind: 'delete', id: node.id });
              }
            }}
          >
            🗑
          </button>
        </span>
        )}
      </div>

      {open && children.length > 0 && (
        <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className={styles.children}>
            {children.map((child, i) => (
              <OutlineNode
                key={child.id}
                node={child}
                index={i}
                siblingCount={children.length}
                parentIsRoot={false}
                parentType={node.type}
                grandparentType={parentType}
                prevType={i > 0 ? children[i - 1].type : undefined}
                ancestorLocked={effLocked}
                depth={depth + 1}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  );
}
