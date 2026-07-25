---
id: L-006
title: Bring Text Editor up to TextEdit grade
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-004
---

## Context
The Text Editor added in 1.5 is a plain textarea with open and save. On a paper-themed OS the writing surface deserves to be the best-feeling app in the system: real formatting, real find and replace, and a page that actually looks like a sheet of paper.

## Scope
Work in `src/apps/text-editor/`.

1. **Two modes**, toggled from the Format menu and persisted per document:
   - **Rich text** — bold (Cmd+B), italic (Cmd+I), underline (Cmd+U), strikethrough, headings H1-H3, bulleted and numbered lists, blockquote, left/centre/right alignment, and a link. Implemented with `contenteditable` plus `document.execCommand` or an equivalent hand-rolled command layer — no editor library dependency.
   - **Plain text** — a monospace-optional textarea, no formatting, for `.txt` and `.md`.
2. **Find and replace** (Cmd+F, Cmd+Shift+H) — a paper strip below the toolbar: match count, next/previous, replace, replace all, and a case-sensitive toggle. Matches are highlighted in the document.
3. **Document stats** — live word, character and line counts in the status bar.
4. **Autosave and dirty state** — autosave to the file system every 3 seconds when there are unsaved changes; a dot in the title bar marks unsaved; Cmd+S forces a save; closing with unsaved changes prompts.
5. **File handling** — New (Cmd+N), Open (Cmd+O), Save (Cmd+S), Save As (Cmd+Shift+S). Read and write `.txt`, `.md` and `.html`. Rich-text documents save as `.html`; opening an `.html` file restores its formatting.
6. **Recent documents** — the last 10 files, listed in the File menu and on an empty-state screen, persisted across restarts.
7. **Typography controls** — font family (a small curated list: system sans, a serif, the mono stack), font size, and line spacing, applied to the document and persisted.
8. **The page.** The editing surface is a sheet: a centred paper page with a max content width, generous margins, a raised edge and a soft cast shadow over the app background — not an edge-to-edge textarea. A "wrap to page / wrap to window" toggle switches between the sheet and full-width.
9. **Print to PDF** (Cmd+P) via `window.print()` with a print stylesheet that outputs the document alone — no app chrome, correct margins.
10. **Undo/redo** (Cmd+Z, Cmd+Shift+Z) working correctly in both modes.
11. Opening a text file from Files must still route to this app with its content loaded.

## Non-goals
- No collaborative editing, no version history, no comments.
- No real `.rtf` or `.docx` parsing — rich text round-trips as HTML.
- No editor library (no ProseMirror, Slate, Quill, TipTap). Keep the dependency list unchanged.
- No spell check beyond what the browser provides natively.
- No restyling of app chrome — L-004 already did that. The page sheet is new and uses existing primitives.

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] `package.json` dependencies are unchanged from before this issue.
- [ ] Rich mode applies bold, italic, underline, strikethrough, H1-H3, both list types, blockquote, all three alignments and a link — by toolbar and by keyboard where a shortcut is listed.
- [ ] Toggling to plain-text mode and back behaves predictably and warns before discarding formatting.
- [ ] Cmd+F opens find; the match count is correct; next/previous cycle through matches; replace and replace-all work; the case-sensitive toggle changes the results.
- [ ] Word, character and line counts update live and are correct for a known test string.
- [ ] Editing then waiting 3 seconds writes the file without a manual save; the dirty dot appears while unsaved and clears after a save.
- [ ] New, Open, Save and Save As all work for `.txt`, `.md` and `.html`; a rich document saved as `.html` reopens with its formatting intact.
- [ ] Recent documents lists the last 10 files and survives a reload.
- [ ] Font family, size and line spacing apply and persist.
- [ ] The document renders as a centred paper sheet by default; the wrap toggle switches to full width.
- [ ] Cmd+P opens a print preview containing the document only — no toolbar, no window chrome.
- [ ] Undo and redo work in both modes.
- [ ] Double-clicking a `.txt` file in Files opens it here with its content.
- [ ] No console errors during any of the above.

## Test plan
1. `npm run build` — must exit 0. Diff `package.json` to confirm dependencies are untouched.
2. `npm run dev`, open Text Editor.
3. Type a paragraph and apply every formatting command listed; screenshot the result.
4. Paste a known string, e.g. `the quick brown fox` on three lines, and verify the word/character/line counts by hand.
5. Cmd+F, search a term appearing 3 times, verify the count, cycle matches, replace one, replace all, toggle case sensitivity on a mixed-case term.
6. Edit and wait 4 seconds; confirm the file changed on disk and the dirty dot cleared.
7. Save as `.html`, close, reopen from Recent, confirm formatting survived.
8. Change font, size and line spacing; reload; confirm they persisted.
9. Toggle wrap-to-page and wrap-to-window; screenshot both.
10. Cmd+P and screenshot the print preview.
11. Undo and redo a series of ten edits in both modes.
12. From Files, double-click a `.txt` file and confirm it opens here.
13. Confirm a clean console throughout.

## Notes
