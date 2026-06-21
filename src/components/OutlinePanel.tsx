import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useStore } from '../store';
import { allowedChildTypes, locate } from '../utils/tree';
import { OutlineNode } from './OutlineNode';
import styles from './OutlineNode.module.css';

export function OutlinePanel() {
  const { doc, dispatch, locked } = useStore();
  const top = doc.root.children ?? [];

  const sensors = useSensors(
    // require an 8px drag so a click/tap inside an editor never starts a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Only let an item collide with its OWN siblings, so drag-reorder is
  // predictable within a list and never drops into a different container.
  // (Cross-container moves are done with the ↑/↓ and indent/outdent buttons.)
  const collisionDetection: CollisionDetection = (args) => {
    const a = locate(doc.root, String(args.active.id));
    const siblingIds = new Set((a?.parent?.children ?? []).map((c) => c.id));
    const within = args.droppableContainers.filter((c) => siblingIds.has(String(c.id)));
    const scoped = { ...args, droppableContainers: within.length ? within : args.droppableContainers };
    // pointer-based first: the row the cursor is over wins (responsive for tall
    // items); fall back to closest-corners (registers as soon as rects overlap,
    // unlike closest-center which needs to pass the neighbour's midpoint).
    const pw = pointerWithin(scoped);
    return pw.length ? pw : closestCorners(scoped);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = locate(doc.root, String(active.id));
    const b = locate(doc.root, String(over.id));
    if (!a?.parent || !b?.parent) return;
    // collision is constrained to siblings, so this is always a same-parent reorder
    if (a.parent.id === b.parent.id) {
      dispatch({ kind: 'reorder', parentId: a.parent.id, from: a.index, to: b.index });
    } else if (allowedChildTypes(b.parent.type).includes(a.node.type)) {
      dispatch({ kind: 'moveTo', id: a.node.id, targetParentId: b.parent.id, index: b.index });
    }
  };

  return (
    <aside className={`${styles.panel} no-print`}>
      <div className={styles.panelHead}>
        <h2>Outline</h2>
        <p className={styles.hint}>
          ⠿ drag &nbsp;·&nbsp; ↑ ↓ move (also between lines) &nbsp;·&nbsp; ▶/▼ collapse &nbsp;·&nbsp; 👁 hide &nbsp;·&nbsp;
          ⇥ ⇤ nest &nbsp;·&nbsp; ＋ add &nbsp;·&nbsp; 🔒 Lock (top bar) freezes all edits
        </p>
      </div>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
        <SortableContext items={top.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul className={styles.root}>
            {top.map((child, i) => (
              <OutlineNode
                key={child.id}
                node={child}
                index={i}
                siblingCount={top.length}
                parentIsRoot
                parentType="document"
                prevType={i > 0 ? top[i - 1].type : undefined}
                ancestorLocked={false}
                depth={0}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!locked && (
        <button
          className={styles.addSection}
          onClick={() => dispatch({ kind: 'addChild', parentId: doc.root.id, type: 'section' })}
        >
          ＋ Add section
        </button>
      )}
    </aside>
  );
}
