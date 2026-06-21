import { Document, Page, View, Text, Link } from '@react-pdf/renderer';
import type { ResumeDoc, ResumeNode } from '../types';
import { contactLink, deriveContactHref, richToPlain } from '../utils/richtext';
import { fontOption, resolveFont, type FontOption } from './fonts';
import { richRuns } from './richToPdf';
import { PdfIcon } from './PdfIcon';

/**
 * Build the resume as a real vector PDF (selectable, ATS-readable text +
 * crisp vector icons), mirroring the on-screen preview. react-pdf has its own
 * layout engine, so this re-expresses the same structure in its primitives.
 */
export function ResumePdf({ doc }: { doc: ResumeDoc }) {
  const opt = fontOption(doc.type.fontFamily);
  const base = doc.type.baseSizePt; // pt
  const em = (n: number) => +(base * n).toFixed(2); // em → pt
  const regular = resolveFont(opt, false, false);

  const size = doc.page.size === 'Letter' ? 'LETTER' : 'A4';
  const visible = (n: ResumeNode) => n.visible;

  // --- recursive child rendering, grouping consecutive bullets ----------------
  const renderChildren = (nodes: ResumeNode[], depth = 0): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let bulletRun: ResumeNode[] = [];
    const flush = (key: string) => {
      if (!bulletRun.length) return;
      const items = bulletRun;
      bulletRun = [];
      out.push(
        <View key={`ul_${key}`} style={{ marginTop: em(0.15) }}>
          {items.map((b) => renderBullet(b, depth))}
        </View>,
      );
    };
    nodes.filter(visible).forEach((child, i) => {
      if (child.type === 'bullet') {
        bulletRun.push(child);
      } else {
        flush(`${i}`);
        out.push(<View key={child.id}>{renderNode(child)}</View>);
      }
    });
    flush('end');
    return out;
  };

  const renderBullet = (node: ResumeNode, depth: number) => {
    const subBullets = (node.children ?? []).filter((c) => c.type === 'bullet' && c.visible);
    return (
      <View key={node.id} style={{ marginTop: em(doc.spacing.bullet) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Text style={{ width: em(1.1), fontSize: em(depth > 0 ? 0.7 : 0.85), ...regular }}>
            {depth > 0 ? '◦' : '•'}
          </Text>
          <Text style={{ flex: 1, ...regular }}>{richRuns(node.content, opt)}</Text>
        </View>
        {subBullets.length > 0 && (
          <View style={{ marginLeft: em(1.1) }}>{subBullets.map((b) => renderBullet(b, depth + 1))}</View>
        )}
      </View>
    );
  };

  const renderContactRow = (node: ResumeNode) => {
    const items = (node.children ?? []).filter(visible);
    const cells: React.ReactNode[] = [];
    items.forEach((item, i) => {
      if (i > 0) {
        cells.push(
          <Text key={`sep_${item.id}`} style={{ color: '#444', marginHorizontal: em(0.55), ...regular }}>
            |
          </Text>,
        );
      }
      cells.push(renderContactItem(item));
    });
    return (
      <View
        key={node.id}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: em(0.96),
          marginVertical: em(0.1),
        }}
      >
        {cells}
      </View>
    );
  };

  const renderContactItem = (node: ResumeNode) => {
    const explicit = contactLink(node.content);
    const href = explicit?.href ?? deriveContactHref(node.props?.icon, richToPlain(node.content)) ?? undefined;
    const labelHtml = explicit?.labelHtml ?? node.content ?? '';
    const iconName = node.props?.icon;
    const iconSize = em(0.96 * 0.95);
    const text = (
      <Text style={{ ...regular }}>{richRuns(labelHtml, opt, { linkUnderline: false })}</Text>
    );
    return (
      <View key={node.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
        {iconName && iconName !== 'none' && (
          <View style={{ marginRight: em(0.3), marginTop: em(0.04) }}>
            <PdfIcon name={iconName} size={iconSize} />
          </View>
        )}
        {href ? (
          <Link src={href} style={{ color: '#000', textDecoration: 'none' }}>
            {text}
          </Link>
        ) : (
          text
        )}
      </View>
    );
  };

  // --- per-node rendering -----------------------------------------------------
  const renderNode = (node: ResumeNode): React.ReactNode => {
    switch (node.type) {
      case 'header':
        // no extra bottom margin: the first section's own top margin already
        // provides the gap, so it matches the section-to-section spacing
        return <View style={{ marginBottom: em(0.05) }}>{renderChildren(node.children ?? [])}</View>;

      case 'name':
        return (
          <Text
            style={{
              fontSize: em(2.4),
              textAlign: 'center',
              lineHeight: 1.05,
              marginBottom: em(0.4),
              ...resolveFont(opt, false, false),
            }}
          >
            {richRuns(node.content, opt)}
          </Text>
        );

      case 'contactRow':
        return renderContactRow(node);

      case 'summary':
        return (
          <Text style={{ textAlign: 'justify', marginTop: em(0.7), ...regular }}>
            {richRuns(node.content, opt)}
          </Text>
        );

      case 'section': {
        const kids = (node.children ?? []).filter(visible);
        const titleBlock = (
          <>
            <Text style={{ fontSize: em(1.32), lineHeight: 1.1, marginBottom: em(0.08), ...resolveFont(opt, true, false) }}>
              {richRuns(node.props?.title, opt, { bold: true })}
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#111', marginBottom: em(0.42) }} />
          </>
        );
        // Flow naturally so a section fills the page and only the overflow
        // spills over — no big gap from moving a whole block down. The title
        // just carries a small minPresenceAhead so it's never orphaned alone at
        // the very bottom of a page.
        return (
          <View style={{ marginTop: em(doc.spacing.section) }}>
            <View minPresenceAhead={em(2.4)}>{titleBlock}</View>
            <View>{renderChildren(kids)}</View>
          </View>
        );
      }

      case 'subsection':
        return (
          <View style={{ marginTop: em(doc.spacing.subsection), marginBottom: em(0.15) }}>
            <View
              wrap={false}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}
            >
              <Text style={{ flex: 1, ...resolveFont(opt, true, false) }}>
                {richRuns(node.props?.heading, opt, { bold: true })}
              </Text>
              <Text style={{ fontSize: em(0.98), marginLeft: em(1), ...regular }}>
                {richRuns(node.props?.date, opt)}
              </Text>
            </View>
            {renderChildren(node.children ?? [])}
          </View>
        );

      case 'paragraph':
        return <Text style={{ marginTop: em(0.3), ...regular }}>{richRuns(node.content, opt)}</Text>;

      case 'gridContainer':
        return renderGrid(node);

      default:
        return null;
    }
  };

  const renderGrid = (node: ResumeNode) => {
    const cols = node.props?.columns ?? 2;
    const items = (node.children ?? []).filter(visible);
    // Explicit table rows (not flexWrap): guarantees exactly `cols` cells per
    // row with no sub-pixel rounding that could collapse it to one column. The
    // whole grid lives inside a wrap={false} section, so it never crosses a page
    // boundary (which is where react-pdf would otherwise overlap/clip it).
    const rows: ResumeNode[][] = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    return (
      <View style={{ marginTop: em(0.15) }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((it) => (
              <View key={it.id} style={{ width: `${100 / cols}%`, paddingRight: em(1) }}>
                <Text style={{ lineHeight: 0.8, marginBottom: em(0), ...regular }}>
                  {richRuns(it.props?.label, opt, { bold: true })}
                  {' '}
                  {richRuns(it.props?.value, opt)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Document>
      <Page
        size={size}
        style={{
          paddingTop: `${doc.page.marginMm}mm`,
          paddingBottom: `${doc.page.marginMm}mm`,
          paddingLeft: `${doc.page.marginMm}mm`,
          paddingRight: `${doc.page.marginMm}mm`,
          fontSize: base,
          lineHeight: doc.type.lineHeight,
          color: '#000',
          fontFamily: regular.fontFamily,
        }}
      >
        {(doc.root.children ?? []).filter(visible).map((node) => (
          <View key={node.id}>{renderNode(node)}</View>
        ))}
      </Page>
    </Document>
  );
}

export type { FontOption };
