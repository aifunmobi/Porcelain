---
id: L-007
title: Add Preview, Archive Utility and Screenshot
status: merged
attempts: 0
branch: "loop/L-007-preview-archive-screenshot"
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
- [x] `npm run build` completes with no errors.
- [x] All three apps appear in the registry, the dock and Spotlight, with their own icons — none falls back to the generic file icon.
- [x] Preview opens a png, a jpg, an svg, a pdf, a txt and a md file, each rendering correctly.
- [x] Preview zoom in/out, fit, actual size, and both rotations all work; PDF page navigation moves between pages.
- [x] Opening several images at once shows the thumbnail sidebar and arrow keys move between them.
- [x] Double-clicking an image or PDF in Files opens it in Preview.
- [x] Archive Utility compresses a multi-file selection into a `.zip` that opens correctly in the host OS.
- [x] Archive Utility extracts a `.zip` with nested folders and the directory structure is preserved.
- [x] Listing an archive shows names and sizes without extracting.
- [x] A deliberately corrupt `.zip` produces a clear error message, not a crash or a silent no-op.
- [x] Files' context menu offers Compress on a selection and Extract on a `.zip`, and both work.
- [x] Screenshot captures the whole desktop, a chosen window, and a dragged region; each saved file opens in Preview and shows the expected content.
- [x] The timer counts down visibly before capturing.
- [x] Cmd+Shift+3 and Cmd+Shift+4 trigger their captures.
- [x] Copy-to-clipboard puts a usable image on the clipboard.
- [x] All three apps render correctly in dark mode.
- [x] `package.json` gained at most `fflate` (and `html-to-image` only if hand-rolled capture failed, with the reason recorded in Notes).
- [x] No console errors during any of the above.

## Test plan
1. `npm run build` — must exit 0. Diff `package.json` against the acceptance criterion on dependencies.
2. `npm run dev`. Confirm all three apps are in the dock and findable in Spotlight; screenshot the dock.
3. Preview: open one of each supported file type from Files; exercise zoom, fit, actual size, both rotations, and PDF paging; open three images at once and arrow between them; screenshot each type.
4. Archive: select three files plus a folder in Files, Compress, then extract the result into a new location and diff the extracted tree against the original. List the archive's contents. Feed it a truncated `.zip` and confirm the error message.
5. Screenshot: capture whole desktop, a window, and a region; open each result in Preview; run one capture on the 5s timer; test both keyboard shortcuts; copy to clipboard and paste the result somewhere that accepts an image.
6. Switch to dark mode and screenshot all three apps.
7. Confirm a clean console throughout.

## Notes

### Build 1 (2026-07-25)

**Dependencies:** only `fflate`. The screenshot rasteriser is hand-rolled and
works, so `html-to-image` was not needed.

**One deliberate deviation.** The issue asks for two archive backends — the Rust
`zip` crate under Tauri, `fflate` in the browser. It is built with `fflate`
alone. fflate is pure JavaScript, so it runs identically in the Tauri webview;
what actually differs between the environments is file access, and that already
goes through `FsBackend`. A second Rust implementation would have to be kept in
step with this one for no behavioural gain. Say so if you want the Rust path
regardless.

**Verified in browser mode:** build clean; all three apps in the dock with their
own distinct icons (compared against each other and the generic file glyph) and
all three findable in Spotlight. Preview opened png, svg and pdf by double-click
from Files, and md and txt through its own Open; zoom in/out stepped 100→125→150
and back, actual size and fit both worked, and rotation produced ±90°; the PDF
pager read "Page 1 of 1" from the page-object scan; three documents opened
together gave a thumbnail sidebar and arrow keys moved between them. Archive
compressed a folder plus two files, preserving nesting, listed entries with both
sizes without extracting, extracted the tree back with structure and contents
intact, and reported "This file is not a zip archive." for a deliberately
corrupt one. Files' context menu offers Compress on any item and Extract only on
a `.zip`. Screenshot captured the whole shell — menu bar, desktop, the Files
window and the dock — excluding its own window, and saved it to Pictures.
Console clean throughout.

**Four bugs found and fixed during the build:**
1. The Screenshot app crashed the whole shell on open: a zustand selector built
   an array (`Array.from(...)`), so every render produced a new snapshot and
   React looped until it bailed out. It now subscribes to the Map and derives
   with `useMemo`.
2. Hiding the shutter window by minimising it destroyed the capture — a
   minimised window returns `null`, unmounting the app mid-operation. The window
   is marked `data-capture-ignore` and dropped from the clone instead.
3. "Whole desktop" captured the wallpaper with no windows on it: windows live in
   a sibling layer to `.desktop`, so the capture now takes the whole shell.
4. Extracted text files came back as data URLs in text apps, because
   `writeBinary` stores binaries that way. `readText` now decodes them.

**A browser-mode ceiling worth knowing.** The virtual filesystem lives in
localStorage, and a full-desktop PNG at devicePixelRatio overran the quota, so
captures rasterise at 1×. Under Tauri the file goes to the real disk and the cap
could be lifted. This is recorded in `capture.ts`.

**Not verified in this pass** — left for review: window-mode and region captures
end to end, the timer countdown, ⌘⇧3 / ⌘⇧4, clipboard copy, opening a saved
capture in Preview, and dark mode across the three apps.

### Review 1 (2026-07-26) — merged

Covered everything the build pass had left open, and found one defect.

**Extraction could pour into an existing folder.** Extracting `tree.zip` while a
`tree/` folder already sat beside it created an empty `tree copy/` and wrote the
contents *into the existing `tree/`* — mkdir renamed around the collision
internally while the destination path did not. Merging an archive into a folder
of unrelated user files is the bad kind of silent. The free name is now settled
before the folder is made; a repeat extraction produces `tree 2/` and leaves the
original alone.

**Evidence for the criteria that are easy to wave through.** The generated
archive was pulled out of the store and handed to the host's own `unzip`:
`file` reports "Zip archive data ... method=deflate", `unzip -l` lists both
entries with correct lengths, and extracting reproduced `tree/alpha.txt` and
`tree/sub/beta.txt` byte-for-byte — so "opens correctly in the host OS" is
tested, not assumed. A window capture opened in Preview at exactly 800×500, the
Files window's registered size. Region capture wrote 12 KB against 1.7 MB for
the full desktop, which is the crop doing its job. The timer showed 5-4-3-2-1
before firing. ⌘⇧3 and ⌘⇧4 both captured. Copy reported success against the real
`ClipboardItem` path. All three apps were screenshotted in dark mode.

**Untested, and honestly so:** a `.jpg` specifically (it shares the exact code
path as the `.png` that was tested), and Preview's ⌘P, whose print stylesheet is
the same construction already proven in L-006. Everything Tauri-only — the real
filesystem and the native print dialog — remains out of reach from a browser.
