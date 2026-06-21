// ---------------------------------------------------------------------------
// Core data model
//
// The entire resume is a recursive tree of `ResumeNode`s. Every node carries a
// `visible` flag (so anything can be hidden/shown) and an optional `children`
// array (so anything can be nested and reordered as a whole enclosure — moving
// a node carries its subtree with it).
// ---------------------------------------------------------------------------

/** Rich text is stored as a constrained, sanitized HTML string.
 *  Allowed inline tags: <b>/<strong>, <i>/<em>, <u>, <a href>. */
export type RichText = string;

export type NodeType =
  | 'document' // root
  | 'header' // centered top block (name + contact rows + summary)
  | 'name' // big centered name
  | 'contactRow' // a centered line of contact items joined by separators
  | 'contactItem' // icon + text (email, phone, github, ...)
  | 'summary' // intro paragraph
  | 'section' // a titled section with a rule under the heading
  | 'subsection' // heading line + right-aligned meta (date), holds bullets
  | 'bullet' // a bullet point (rich text), can nest sub-bullets
  | 'paragraph' // a free paragraph of rich text
  | 'gridContainer' // multi-column grid (e.g. Technologies)
  | 'gridItem'; // a "Label: value" cell inside a grid

export type IconName =
  | 'none'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'github'
  | 'web';

export interface NodeProps {
  /** section heading text (plain) */
  title?: string;
  /** subsection left line, rich (e.g. "**Role**, _Org_") */
  heading?: RichText;
  /** subsection right line, plain (e.g. "Mar 2026 – Present") */
  date?: string;
  /** gridItem bold label, rich */
  label?: RichText;
  /** gridItem value, rich */
  value?: RichText;
  /** contactItem leading icon */
  icon?: IconName;
  /** gridContainer column count */
  columns?: number;
}

export interface ResumeNode {
  id: string;
  type: NodeType;
  visible: boolean;
  /** when true, this node and its subtree are frozen from edits */
  locked?: boolean;
  props?: NodeProps;
  /** rich text payload for name/summary/bullet/paragraph/contactItem */
  content?: RichText;
  children?: ResumeNode[];
}

export interface ResumeDoc {
  /** schema version for the JSON file */
  schema: number;
  page: {
    size: 'A4' | 'Letter';
    /** page margin in millimetres */
    marginMm: number;
  };
  type: {
    /** base font size in points */
    baseSizePt: number;
    /** unitless line height */
    lineHeight: number;
  };
  /** Vertical separation between blocks, in em (relative to base font size). */
  spacing: {
    /** gap above each section */
    section: number;
    /** gap above each sub-section (job/school entry) */
    subsection: number;
    /** gap between bullet points */
    bullet: number;
  };
  root: ResumeNode;
}

export const DEFAULT_SPACING = { section: 0.7, subsection: 0.4, bullet: 0.1 };

export const SCHEMA_VERSION = 1;
