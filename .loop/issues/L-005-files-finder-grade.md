---
id: L-005
title: Bring Files up to Finder grade
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-004
---

## Context
Files is the most-used app in the OS and the one users measure it against Finder. Today it browses and drag-drops, but it lacks the structure people expect: no column view, no sortable list columns, no Get Info, no keyboard navigation, no in-folder search. This issue makes it feel complete. Styling is already done by L-004 — this is depth, not looks.

## Scope
Work in `src/apps/file-manager/`, `src/stores/fileSystemStore.ts` and `src/services/tauriFs.ts` as needed.

1. **Sidebar** with two labelled sections — Favorites (Home, Desktop, Documents, Downloads, Pictures, Music, Movies) and Locations (Computer, Trash) — using L-002 glyphs. Sections collapse and the state persists.
2. **Three view modes**, switchable from the toolbar and by Cmd+1/2/3:
   - Icon view — tile grid with wrapped labels.
   - List view — sortable columns: Name, Date Modified, Size, Kind. Click a header to sort, click again to reverse; sort state persists per folder.
   - Column view — Miller columns, each level scrolling independently, with a preview pane on the final selection.
3. **Path bar** — breadcrumb of the current path; each segment is clickable and each is a valid drop target.
4. **Get Info panel** (Cmd+I) — name, kind, size (folder sizes computed recursively), created and modified dates, full path, and a preview thumbnail for images.
5. **File operations** — New Folder (Cmd+Shift+N), inline rename (Enter on selection), Duplicate (Cmd+D), Move to Trash (Cmd+Delete), Copy/Cut/Paste (Cmd+C/X/V) including across windows.
6. **Multi-select** — click, Shift+click for a range, Cmd+click to toggle, Cmd+A for all, marquee drag in icon view.
7. **Keyboard navigation** — arrow keys move the selection in all three views, Enter opens, Cmd+Up goes to the parent, Cmd+[ and Cmd+] go back and forward, typing a letter jumps to the first matching item.
8. **In-folder search** — a search field filtering the current folder and, with a "search here" toggle, its subfolders recursively.
9. **Status bar** — item count, count selected, and the total size of the selection.
10. **Back/forward history** per window, with the toolbar buttons disabled at the ends of the stack.
11. Preserve every existing behaviour: the Tauri real-filesystem path, the browser in-memory fallback, and drag-drop between Files windows and the desktop.

## Non-goals
- No tags, labels, or coloured badges.
- No cloud, network or sync features.
- No Quick Look — that is Preview in L-007.
- No restyling; L-004 already set the look. New controls reuse the existing primitives.
- No change to the Trash app itself.

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] The sidebar shows both sections; every entry navigates; collapse state survives a reload.
- [ ] All three view modes render and switch via toolbar and via Cmd+1/2/3.
- [ ] In list view, clicking each of the four column headers sorts by that column and clicking again reverses it.
- [ ] Column view shows independent scrolling levels and a preview pane on the final selection.
- [ ] Breadcrumb segments navigate, and dragging a file onto a segment moves it there.
- [ ] Cmd+I opens Get Info with correct size, dates and path; a folder's size is the recursive total.
- [ ] New Folder, rename, Duplicate, Move to Trash, and Copy/Cut/Paste all work, including paste into a different Files window.
- [ ] Shift+click selects a range, Cmd+click toggles, Cmd+A selects all, and marquee select works in icon view.
- [ ] Arrow keys move the selection, Enter opens, Cmd+Up goes to the parent, Cmd+[ / Cmd+] navigate history, and type-ahead jumps to a match.
- [ ] The search field filters the current folder; the "search here" toggle finds a file in a subfolder.
- [ ] The status bar shows the correct item count and the correct selection size.
- [ ] Drag-drop between a Files window and the desktop still works in both directions.
- [ ] No console errors during any of the above.

## Test plan
1. `npm run build` — must exit 0.
2. `npm run dev`, open Files.
3. Walk the sidebar; collapse a section; reload; confirm it stayed collapsed.
4. Cycle the three views by toolbar and by keyboard; screenshot each.
5. In list view sort by each column in both directions and confirm ordering (including that Size sorts numerically, not as a string).
6. In column view, navigate three levels deep and confirm the preview pane.
7. Create a folder, rename it, duplicate it, then move it to Trash and confirm it appears in the Trash app.
8. Copy a file, open a second Files window, navigate elsewhere, paste, confirm it arrived.
9. Exercise every keyboard shortcut listed above.
10. Search for a known filename with the subfolder toggle on and off.
11. Select three files and verify the status-bar size total against their individual sizes shown in Get Info.
12. Drag a file from Files to the desktop and back.
13. Confirm a clean console throughout.

## Notes
