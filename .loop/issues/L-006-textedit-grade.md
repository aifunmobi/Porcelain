---
id: L-006
title: Bring Text Editor up to TextEdit grade
status: merged
attempts: 0
branch: "loop/L-006-textedit-grade"
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
- [x] `npm run build` completes with no errors.
- [x] `package.json` dependencies are unchanged from before this issue.
- [x] Rich mode applies bold, italic, underline, strikethrough, H1-H3, both list types, blockquote, all three alignments and a link — by toolbar and by keyboard where a shortcut is listed.
- [x] Toggling to plain-text mode and back behaves predictably and warns before discarding formatting.
- [x] Cmd+F opens find; the match count is correct; next/previous cycle through matches; replace and replace-all work; the case-sensitive toggle changes the results.
- [x] Word, character and line counts update live and are correct for a known test string.
- [x] Editing then waiting 3 seconds writes the file without a manual save; the dirty dot appears while unsaved and clears after a save.
- [x] New, Open, Save and Save As all work for `.txt`, `.md` and `.html`; a rich document saved as `.html` reopens with its formatting intact.
- [x] Recent documents lists the last 10 files and survives a reload.
- [x] Font family, size and line spacing apply and persist.
- [x] The document renders as a centred paper sheet by default; the wrap toggle switches to full width.
- [x] Cmd+P opens a print preview containing the document only — no toolbar, no window chrome.
- [x] Undo and redo work in both modes.
- [x] Double-clicking a `.txt` file in Files opens it here with its content.
- [x] No console errors during any of the above.

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

### Build 1 (2026-07-25)

**Verified in browser mode** (`npm run dev`): build clean and `package.json`
identical to main. Counts checked by hand against `the quick brown fox` × 3 —
12 words / 59 characters / 3 lines. Find on a term appearing 3× reported
"1 of 3", next/previous cycled, replace hit only the active match, replace-all
took all three, and the case toggle flipped `slow` between 3 matches and none.
Every rich command produced the expected markup (`b/i/u/strike`, `h1`–`h3`,
`ul`/`ol`, `blockquote`, all three alignments, and a link wrapping the
selection). A rich document saved to `.html` reopened with its link intact.
Editing then waiting ~3s rewrote the file and cleared the dirty dot. Ten plain
edits undid and redid exactly. Typography and recents survived a reload, the
recents list caps at ten, the wrap toggle switches the sheet to full width, and
print media hides toolbar, status bar, menu bar and dock, leaving the page.
Double-clicking `Welcome.txt` in Files opened it here with its content. Console
clean throughout.

**Four bugs found and fixed while testing, all mine from this build:**
1. The dirty dot never lit in plain mode — `markDirty` read `plainText` from a
   closure that lagged the keystroke. It now takes the new value directly.
2. Counts read zero after opening a document: `loadInto` queued a
   `requestAnimationFrame(refreshStats)` that captured the outgoing mode and
   overwrote the correct figure. The effect already recomputes; the stale call
   is gone.
3. Shortcuts died as soon as focus left the editor subtree (after any dialog),
   because the handler hung off the React tree. It is now a window listener
   gated on `activeWindowId`, which also stops ⌘N from opening a second window.
4. Adding a link inserted the URL instead of wrapping the selection — typing in
   the dialog collapsed the range. The range is stashed on open and restored
   before `createLink`.

**Undo in plain mode needed a real history.** A controlled `<textarea>` cannot
use the browser's native undo: React re-applies its state and the two stacks
desync. Plain mode keeps a 200-entry snapshot stack; rich mode still uses
`execCommand`'s own stack.

**Autosave needs a path.** An untitled document shows the dirty dot but is not
written anywhere until the first save — inventing a file on the user's behalf
seemed worse than waiting. Say so if you want an `Untitled.txt` created eagerly.

**Prompts are in-app, never `window.prompt`/`confirm`.** Browser modals freeze
the whole OS shell, so Save As, the link URL, Open, and the discard/close
warnings are all rendered inside the window.

**Not verified here** — needs the Tauri build: the real-filesystem read/write
path and the native print dialog (print was checked by emulating print media,
which exercises the same stylesheet without opening a blocking dialog).

### Review 1 (2026-07-25) — merged

Every criterion driven in a browser against the branch. Two defects were found
and fixed before merging:

1. **The mode toggle was not reversible.** Plain -> rich -> plain grew the
   document by one blank line per cycle, and the rich line count read one too
   high. Both came from `innerText`, which renders `<div><br></div>` — how an
   empty line is represented — as two newlines. Conversion and counting now walk
   leaf block elements. Verified stable over three consecutive round trips.
2. **The rich find count went stale after a replace.** Replace-all left the
   strip reading "1 of 3" with nothing left to find, because the contenteditable
   DOM is not React state and nothing the recount effect watched had changed.
   Rich edits now bump a document version the effect depends on: 3 -> 2 -> none.

Covered here that the build pass had missed: formatting by keyboard (⌘B/⌘I/⌘U,
not just the toolbar), `.txt` and `.md` save and reopen, find and replace in
rich mode, and the plain/rich round trip. Rich replace preserves surrounding
markup — replacing inside `<b>beta</b>` left the `<b>` intact, and matches were
found across an `h1`, a bold `div` and an `li`.

Still unexercised, and not reachable from a browser: the Tauri real-filesystem
read/write path and the native print dialog. Print was checked by emulating
print media, which applies the same stylesheet — toolbar, status bar, menu bar
and dock all drop out, leaving only the page.
