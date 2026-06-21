# Resume Maker

A frontend-only (React + TypeScript + Vite) resume builder that mirrors the
exact structure of a clean, LaTeX-style single-page resume. Edit inline, hide or
reorder anything at any level, nest sections inside sections, and export/import
the whole thing as JSON. Print or "Save as PDF" produces a pixel-faithful page.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm run preview  # serve the built app
```

## How the requirements map to features

| You asked for | How it works |
| --- | --- |
| Export/import full content as JSON | Toolbar → **Export JSON** / **Import JSON**. The file is the complete document (including hidden nodes), so round-trips are lossless. Autosaves to `localStorage` too. |
| Keep the resume's exact structure | The preview is a faithful render of the seeded resume (serif type, centered header with icons, section rules, right-aligned dates, bold/underline, 2-column Technologies grid). Tuned print CSS + a dynamic `@page` rule make the PDF match the screen. |
| Edit on the left, see it on the right | The app is a split view: the **left outline is the editable surface** (type in any field), and the **right preview is a non-editable, PDF-exact render** that updates in real time as you type. Clicking a row scrolls the preview to it (and vice-versa). |
| Hide/unhide every component | Every node has a `visible` flag. The outline's 👁 button toggles any node. Hidden nodes are struck through in the outline and **removed entirely from the preview/PDF**. |
| Section inside section | The data model is a recursive tree — any node can hold children. Use **Indent (⇥)** to nest a node under the one above it (e.g. a sub-point under a point, or a sub-section under a section). |
| Reorder section / sub-section / point, respecting enclosure | Drag the ⠿ handle (reorders within a parent), or use **↑ ↓** to move among siblings, and **⇥ / ⇤** to change nesting depth. Moving a node always carries its entire subtree (its enclosure). |
| Inline emphasis | Edit any field in the outline. Select text for a **B / I / U / 🔗** toolbar (or ⌘B / ⌘I / ⌘U). Contact-row icons are chosen from the dropdown on each contact row. |
| Control spacing between points / sub-sections / sections | Toolbar → **Spacing** group. Three independent gaps (in `em`, so they scale with the font): `Section`, `Sub-section`, `Point`. Stored in the document and exported in the JSON. |

## The JSON format

A document is a recursive tree of nodes:

```jsonc
{
  "schema": 1,
  "page": { "size": "A4", "marginMm": 12 },
  "type": { "baseSizePt": 10, "lineHeight": 1.28 },
  "spacing": { "section": 0.78, "subsection": 0.5, "bullet": 0.12 },
  "root": {
    "id": "root",
    "type": "document",
    "visible": true,
    "children": [ /* header, sections, … */ ]
  }
}
```

Each node has:

- `id` — unique string
- `type` — `document | header | name | contactRow | contactItem | summary | section | subsection | bullet | paragraph | gridContainer | gridItem`
- `visible` — `true`/`false` (controls hide/unhide; hidden ⇒ excluded from print)
- `content` — sanitized inline HTML (`<b> <i> <u> <a>`) for text nodes
- `props` — type-specific fields: section `title`, subsection `heading`/`date`, gridItem `label`/`value`, contactItem `icon`, gridContainer `columns`
- `children` — nested nodes (the enclosure that travels on reorder)

Imported JSON is validated and sanitized: unknown node types fall back safely,
missing `visible` defaults to shown, and rich text is stripped to the inline
whitelist (no scripts, no `javascript:` URLs).

## Project layout

```
src/
  types.ts                 # node + document model
  store.tsx                # useReducer store + localStorage autosave
  sampleResume.ts          # seeded content (the reference resume)
  utils/
    tree.ts                # immutable tree ops (move/indent/outdent/…)
    richtext.ts            # HTML sanitizer for inline rich text
    io.ts                  # JSON export / import + validation
  components/
    Toolbar.tsx            # import/export/print + page & type controls
    OutlinePanel.tsx       # left tree: drag/hide/nest/add/delete
    OutlineNode.tsx
    Preview.tsx            # the A4 sheet (print target)
    PreviewNode.tsx        # recursive renderer + inline editing
    RichText.tsx           # contentEditable inline rich-text editor
    Icon.tsx               # inline SVG contact icons
```
