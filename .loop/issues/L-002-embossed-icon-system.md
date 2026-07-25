---
id: L-002
title: Embossed paper icon system
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-001
---

## Context
`src/components/Icons.tsx` holds 62 icons drawn as flat 1.5px outlines with a 15%-opacity fill. They read as a generic icon pack and are the single biggest reason the OS looks like a beta. The redesign calls for icons that look pressed into and raised out of paper. Because every surface in the OS pulls from `iconMap`, the icon system is rewritten once, here, before any shell or app work.

## Scope
1. **Shared filter defs.** Add an `<IconDefs />` component that renders a single hidden `<svg>` containing the emboss filters, mounted once in `src/App.tsx`. Icons reference the filters by id — no per-icon filter duplication.
2. **Two render modes**, both exposed on the existing `IconProps`:
   - `mode="glyph"` (default) — the bare mark, engraved into the surface it sits on. For toolbars, menus, buttons, list rows.
   - `mode="tile"` — an app icon: a raised rounded-square paper tile (using `.p-tile` material from L-001) with the glyph debossed into its face. For the dock, desktop icons, Spotlight results and the app switcher.
3. **Redraw every glyph** for the letterpress treatment: heavier, more geometric shapes with closed silhouettes that read at 16px. Outline-only marks with a 15% fill do not emboss — each glyph needs solid form. Keep each icon's meaning and rough silhouette so nothing becomes unrecognisable.
4. **Consistent light source** with L-001's `--emboss-angle`: highlight top-left, shadow bottom-right, on every icon, in both modes.
5. **Dark-mode variant** of the filters, selected by the `.dark` class, matching L-001's debossed-slate recipe.
6. **Size integrity.** Icons must render correctly at 16, 20, 24, 32, 48 and 64 px. Filter regions must scale with the icon rather than clipping or blurring out — verify at both extremes.
7. **Complete the map.** All 62 existing `iconMap` keys must still resolve to a real icon (not the `FileIcon` fallback). Add new keys for the apps coming in L-007/L-008: `preview`, `archive`, `screenshot`, `mail`, `contacts`, `reminders`.
8. **Icon sheet in the gallery.** Extend the L-001 `?gallery=1` page with a sheet rendering every `iconMap` key by name, at 16/24/48px, in both `glyph` and `tile` modes.
9. Keep the existing named exports (`FolderIcon`, `GearIcon`, …) and the dynamic `<Icon name="…" />` API unchanged so no call site breaks.

## Non-goals
- Do NOT change any consumer of the icons in this issue — dock, desktop, menu bar and app code keep calling `<Icon />` exactly as they do today. Adopting `mode="tile"` at call sites is L-003.
- No raster assets, no icon-font, no new dependency. SVG only.
- Do not touch `src-tauri/icons/` (the macOS bundle icon).

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] `<IconDefs />` is mounted exactly once and the filter defs appear once in the DOM (verified in devtools).
- [ ] `http://localhost:5173/?gallery=1` shows the icon sheet: every `iconMap` key rendered at 16/24/48px in both modes.
- [ ] No icon in the sheet renders as the generic file fallback; every key shows its own distinct mark.
- [ ] The map contains working entries for `preview`, `archive`, `screenshot`, `mail`, `contacts`, `reminders`.
- [ ] At 16px the glyphs are legible and not mush; at 64px the emboss is still crisp and the filter region is not clipped.
- [ ] Toggling dark mode in the gallery changes the icon emboss to the slate recipe.
- [ ] The desktop at `http://localhost:5173/` still boots, and the dock, menu bar and Spotlight all show icons with no console errors.

## Test plan
1. `npm run build` — must exit 0.
2. `npm run dev`, open `?gallery=1`, screenshot the full icon sheet in light mode; toggle dark, screenshot again.
3. Zoom the browser to 200% on the 16px row and confirm legibility; inspect the 64px row for clipped filter edges.
4. In devtools, search the DOM for the filter id and confirm exactly one definition node.
5. Open the desktop, open Spotlight (its shortcut), open the Files app, and confirm icons render everywhere with a clean console.

## Notes
