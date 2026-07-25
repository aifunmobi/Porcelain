---
id: L-007
title: Add Preview, Archive Utility and Screenshot
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-004
---

## Context
Three utilities are missing that a desktop is expected to have: something to look at a document without editing it, something to handle zip archives, and something to capture the screen. All three are the natural completions of the Files workflow added in L-005.

## Scope
Three new apps, each registered in `src/apps/registry.ts`, given a dock and Spotlight entry, and using the L-002 icons `preview`, `archive` and `screenshot`.

**Preview** (`src/apps/preview/`)
- Opens images (png, jpg, gif, webp, svg), PDFs, and text/markdown files.
- Zoom in/out/fit-to-window/actual-size, rotate left and right.
- PDF page navigation with a page indicator, rendered via the browser's native PDF handling in an object/embed — no PDF library dependency.
- Thumbnail sidebar when a document has multiple pages or when several files were opened together; arrow keys move between them.
- Markdown renders formatted; plain text renders monospace on the paper sheet.
- Print (Cmd+P).
- Becomes the default open action for these file types in Files, replacing whatever handles them today. Photos keeps handling the photo library; Preview handles single-document viewing.

**Archive Utility** (`src/apps/archive/`)
- Create a `.zip` from selected files or folders, with the output named after the selection.
- Extract a `.zip` into a chosen folder or into a same-named folder beside it.
- List an archive's contents without extracting, showing name, size and compressed size.
- Progress indication for multi-file operations and clear error states for corrupt or password-protected archives (which are read-only-unsupported, not silently failed).
- Two backends behind one interface: under Tauri use the Rust `zip` crate via a Tauri command; in the browser dev server use `fflate`. The UI calls the same interface either way. `fflate` is the only new dependency this issue may add.
- Context-menu entries in Files: "Compress" on a selection, "Extract" on a `.zip`.

**Screenshot** (`src/apps/screenshot/`)
- Captures the Porcelain desktop itself by rasterising the DOM to a canvas — hand-rolled with `foreignObject` + SVG serialisation, or `html-to-image` if a hand-rolled version proves unreliable.
- Three modes: whole desktop, a chosen window, a dragged region.
- Optional timer: none, 5s, 10s, with a countdown overlay.
- Saves into Pictures with a timestamped name, and offers copy-to-clipboard.
- Shortcuts Cmd+Shift+3 (whole desktop) and Cmd+Shift+4 (region), registered in `src/hooks/useKeyboardShortcuts.ts`.
- A thumbnail confirmation appears after a capture and links into Preview.

All three apps follow the L-001/L-004 visual vocabulary and work in light and dark mode.

## Non-goals
- No editing in Preview — no annotation, markup, cropping or form filling.
- No archive formats beyond `.zip` — no rar, 7z, tar.gz.
- No creation of password-protected archives.
- Screenshot captures the Porcelain desktop only; it does not and cannot capture the host macOS screen.
- No new PDF rendering dependency.

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] All three apps appear in the registry, the dock and Spotlight, with their own icons — none falls back to the generic file icon.
- [ ] Preview opens a png, a jpg, an svg, a pdf, a txt and a md file, each rendering correctly.
- [ ] Preview zoom in/out, fit, actual size, and both rotations all work; PDF page navigation moves between pages.
- [ ] Opening several images at once shows the thumbnail sidebar and arrow keys move between them.
- [ ] Double-clicking an image or PDF in Files opens it in Preview.
- [ ] Archive Utility compresses a multi-file selection into a `.zip` that opens correctly in the host OS.
- [ ] Archive Utility extracts a `.zip` with nested folders and the directory structure is preserved.
- [ ] Listing an archive shows names and sizes without extracting.
- [ ] A deliberately corrupt `.zip` produces a clear error message, not a crash or a silent no-op.
- [ ] Files' context menu offers Compress on a selection and Extract on a `.zip`, and both work.
- [ ] Screenshot captures the whole desktop, a chosen window, and a dragged region; each saved file opens in Preview and shows the expected content.
- [ ] The timer counts down visibly before capturing.
- [ ] Cmd+Shift+3 and Cmd+Shift+4 trigger their captures.
- [ ] Copy-to-clipboard puts a usable image on the clipboard.
- [ ] All three apps render correctly in dark mode.
- [ ] `package.json` gained at most `fflate` (and `html-to-image` only if hand-rolled capture failed, with the reason recorded in Notes).
- [ ] No console errors during any of the above.

## Test plan
1. `npm run build` — must exit 0. Diff `package.json` against the acceptance criterion on dependencies.
2. `npm run dev`. Confirm all three apps are in the dock and findable in Spotlight; screenshot the dock.
3. Preview: open one of each supported file type from Files; exercise zoom, fit, actual size, both rotations, and PDF paging; open three images at once and arrow between them; screenshot each type.
4. Archive: select three files plus a folder in Files, Compress, then extract the result into a new location and diff the extracted tree against the original. List the archive's contents. Feed it a truncated `.zip` and confirm the error message.
5. Screenshot: capture whole desktop, a window, and a region; open each result in Preview; run one capture on the 5s timer; test both keyboard shortcuts; copy to clipboard and paste the result somewhere that accepts an image.
6. Switch to dark mode and screenshot all three apps.
7. Confirm a clean console throughout.

## Notes
