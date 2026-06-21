import { useStore } from '../store';
import type { ResumeNode } from '../types';
import { contactLink, deriveContactHref, protectHyphens, richToPlain } from '../utils/richtext';
import { Icon } from './Icon';
import { RichText } from './RichText';
import styles from './Preview.module.css';

/** Render an ordered child list, grouping consecutive bullets into one <ul>. */
function ChildList({ nodes }: { nodes: ResumeNode[] }) {
  const out: React.ReactNode[] = [];
  let run: ResumeNode[] = [];

  const flush = (keyHint: string) => {
    if (run.length === 0) return;
    const items = run;
    run = [];
    out.push(
      <ul className={styles.bullets} key={`ul_${keyHint}`}>
        {items.map((b) => (
          <NodeView node={b} key={b.id} />
        ))}
      </ul>,
    );
  };

  nodes.forEach((child, i) => {
    if (child.type === 'bullet') {
      run.push(child);
    } else {
      flush(`${i}`);
      out.push(<NodeView node={child} key={child.id} />);
    }
  });
  flush('end');
  return <>{out}</>;
}

export function NodeView({ node }: { node: ResumeNode }) {
  const { dispatch, docRev, selectedId, setSelectedId } = useStore();
  // The preview is a pure, non-editable PDF view; all editing happens in the
  // outline. Read-only editors keep the exact rendering + live updates.
  const ro = true;

  const hidden = !node.visible;
  const selected = selectedId === node.id;
  const stateClass = `${hidden ? styles.hidden : ''} ${selected ? styles.selected : ''}`;
  const rev = `${node.id}:${docRev}`;

  // Clicking the preview highlights + scrolls to the matching outline row.
  const select = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) return; // let links work
    e.stopPropagation();
    setSelectedId(node.id);
    document.querySelector(`[data-outline-id="${node.id}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const commitContent = (html: string) => dispatch({ kind: 'updateContent', id: node.id, content: html });
  const commitProp = (key: 'heading' | 'date' | 'label' | 'value' | 'title') => (html: string) =>
    dispatch({ kind: 'updateProp', id: node.id, key, value: html });

  const children = node.children ?? [];

  switch (node.type) {
    case 'header':
      return (
        <header className={`${styles.header} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <ChildList nodes={children} />
        </header>
      );

    case 'name':
      return (
        <h1 className={`${styles.name} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <RichText key={rev} value={node.content ?? ''} onCommit={commitContent} readOnly={ro} singleLine placeholder="Your Name" />
        </h1>
      );

    case 'contactRow':
      // Separators are drawn in CSS (::before) only between *visible* items, so
      // hiding an item never leaves a dangling "|" — see Preview.module.css.
      return (
        <div className={`${styles.contactRow} ${stateClass}`} data-node-id={node.id} onClick={select}>
          {children.map((item) => (
            <span
              className={`${styles.contactWrap} ${item.visible ? '' : styles.whidden}`}
              key={item.id}
            >
              <NodeView node={item} />
            </span>
          ))}
        </div>
      );

    case 'contactItem': {
      // Wrap the WHOLE chip (icon + text) in one anchor so a click anywhere on
      // it redirects. Use an explicit link if the user added one; otherwise
      // auto-derive the target (mailto:/tel:/https) from the icon + raw text.
      const explicit = contactLink(node.content);
      const href = explicit?.href ?? deriveContactHref(node.props?.icon, richToPlain(node.content));
      const labelHtml = explicit?.labelHtml ?? (node.content ?? '');
      const iconEl =
        node.props?.icon && node.props.icon !== 'none' ? (
          <Icon name={node.props.icon} className={styles.contactIcon} />
        ) : null;
      return (
        <span
          className={`${styles.contactItem} ${stateClass}`}
          data-node-id={node.id}
          onClick={select}
        >
          {href ? (
            <a className={styles.contactLink} href={href} target="_blank" rel="noopener noreferrer">
              {iconEl}
              <span dangerouslySetInnerHTML={{ __html: protectHyphens(labelHtml) }} />
            </a>
          ) : (
            <>
              {iconEl}
              <RichText key={rev} value={node.content ?? ''} onCommit={commitContent} readOnly={ro} singleLine placeholder="info" />
            </>
          )}
        </span>
      );
    }

    case 'summary':
      return (
        <p className={`${styles.summary} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <RichText key={rev} value={node.content ?? ''} onCommit={commitContent} readOnly={ro} placeholder="Professional summary…" />
        </p>
      );

    case 'section':
      return (
        <section className={`${styles.section} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <h2 className={styles.sectionTitle}>
            <RichText
              key={rev}
              value={node.props?.title ?? ''}
              onCommit={commitProp('title')}
              readOnly={ro}
              plain
              singleLine
              placeholder="Section title"
            />
          </h2>
          <hr className={styles.rule} />
          <div className={styles.sectionBody}>
            <ChildList nodes={children} />
          </div>
        </section>
      );

    case 'subsection':
      return (
        <div className={`${styles.subsection} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <div className={styles.subHead}>
            <span className={styles.subHeading}>
              <RichText key={`${rev}:h`} value={node.props?.heading ?? ''} onCommit={commitProp('heading')} readOnly={ro} singleLine placeholder="Title, Organization" />
            </span>
            <span className={styles.subDate}>
              <RichText key={`${rev}:d`} value={node.props?.date ?? ''} onCommit={commitProp('date')} readOnly={ro} plain singleLine placeholder="Date range" />
            </span>
          </div>
          <ChildList nodes={children} />
        </div>
      );

    case 'bullet': {
      const subBullets = children.filter((c) => c.type === 'bullet');
      return (
        <li className={`${styles.bullet} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <RichText key={rev} value={node.content ?? ''} onCommit={commitContent} readOnly={ro} placeholder="Bullet point…" />
          {subBullets.length > 0 && (
            <ul className={styles.subBullets}>
              {subBullets.map((b) => (
                <NodeView node={b} key={b.id} />
              ))}
            </ul>
          )}
        </li>
      );
    }

    case 'paragraph':
      return (
        <p className={`${styles.paragraph} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <RichText key={rev} value={node.content ?? ''} onCommit={commitContent} readOnly={ro} placeholder="Paragraph…" />
        </p>
      );

    case 'gridContainer':
      return (
        <div
          className={`${styles.grid} ${stateClass}`}
          data-node-id={node.id}
          onClick={select}
          style={{ gridTemplateColumns: `repeat(${node.props?.columns ?? 2}, 1fr)` }}
        >
          {children.map((item) => (
            <NodeView node={item} key={item.id} />
          ))}
        </div>
      );

    case 'gridItem':
      return (
        <div className={`${styles.gridItem} ${stateClass}`} data-node-id={node.id} onClick={select}>
          <span className={styles.gridLabel}>
            <RichText key={`${rev}:l`} value={node.props?.label ?? ''} onCommit={commitProp('label')} readOnly={ro} singleLine placeholder="Label:" />
          </span>{' '}
          <span className={styles.gridValue}>
            <RichText key={`${rev}:v`} value={node.props?.value ?? ''} onCommit={commitProp('value')} readOnly={ro} singleLine placeholder="value" />
          </span>
        </div>
      );

    default:
      return null;
  }
}
