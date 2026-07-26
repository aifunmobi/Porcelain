---
id: L-009
title: Save and Save As across the file-handling apps
status: review
attempts: 1
branch: "loop/L-009-save-and-save-as"
claimed_at: ""
depends: L-007
---

## Context
Only the Text Editor can write a file. Preview, Photo Viewer, Notes and Camera
produce or display content that a user would reasonably expect to keep, and
none of them offers Save or Save As. Screenshot writes exactly one PNG to a
fixed name with no say in the matter. Every one of these should be able to save,
and to save in more than one sensible format.

## Scope

**Shared plumbing**
- `src/components/SaveDialog.tsx` — one in-app save sheet used by every app: a
  destination path, a filename, and a format picker. Never `window.prompt`; a
  browser modal freezes the whole shell.
- `src/services/saveAs.ts` — format conversion. Images re-encode through a
  canvas; text converts between plain, markdown and HTML. Both backends already
  exist behind `FsBackend`, so this only decides bytes and extension.

**Per app — at least two formats each**
- **Preview** — Save As on the open document. Images: PNG and JPEG. Markdown:
  MD and HTML. Plain text: TXT and MD. Saving an image converts it properly
  rather than renaming the extension.
- **Photo Viewer** — Save As on the displayed photo: PNG and JPEG.
- **Notes** — export the selected note: TXT and MD (HTML welcome as a third).
- **Camera** — a capture becomes a file: PNG and JPEG.
- **Screenshot** — keep the automatic save, add Save As with PNG and JPEG.

**Behaviour**
- Save writes back to the document's own path where it has one; where it does
  not, Save behaves as Save As.
- Changing the format in the dialog updates the filename's extension.
- Overwriting an existing file asks first.
- Errors surface in the app, not the console.

## Non-goals
- No editing anywhere it does not already exist — Preview stays a viewer that
  can export.
- No new dependencies. Canvas encodes PNG and JPEG natively.
- No image quality/compression UI beyond a sensible default.
- No PDF writing.

## Acceptance criteria
- [ ] `npm run build` completes with no errors and `package.json` is unchanged.
- [ ] Preview saves an open PNG as JPEG, and the result opens as a real JPEG
      (not a renamed PNG).
- [ ] Preview saves an open markdown file as HTML, and the HTML renders.
- [ ] Photo Viewer saves the displayed photo in both formats.
- [ ] Notes exports the selected note as TXT and as MD, with the note's content.
- [ ] Camera writes a capture to Pictures in both formats.
- [ ] Screenshot offers Save As with both formats alongside its automatic save.
- [ ] Choosing a different format in the dialog rewrites the extension.
- [ ] Saving over an existing file prompts before overwriting.
- [ ] Every saved file reopens correctly in Preview.
- [ ] No console errors during any of the above.

## Test plan
1. `npm run build`; diff `package.json`.
2. Preview a PNG, Save As JPEG, confirm the bytes start with the JPEG magic
   number and the file reopens.
3. Preview a markdown file, Save As HTML, reopen and confirm formatting.
4. Photo Viewer, Notes and Camera: save in both formats, reopen each.
5. Screenshot: Save As in both formats.
6. Change the format in the dialog and watch the extension follow.
7. Save over an existing name and confirm the prompt.
8. Confirm a clean console throughout.

## Notes

### Build 1 (2026-07-26)

**Shape.** One `SaveDialog` and one `useSaveAs` hook serve all five apps, so the
sheet, the overwrite check, the write and the result message exist once rather
than five times. `saveAs.ts` decides bytes and extension; the two filesystem
backends were already behind `FsBackend` and needed no changes.

**Verified in browser mode:** build clean, `package.json` unchanged. Preview
saved a transparent PNG as JPEG and the written bytes begin `ff d8 ff e0` — the
JPEG magic number, where a renamed PNG would begin `89 50 4e 47` — so the
conversion is real. Preview saved a markdown file as HTML and the result is a
full document with `<h1>`, `<strong>` and `<ul>` rendered. Changing the format
in the sheet rewrote the extension both ways (shot.png → shot.jpg,
story.md → story.html). Saving over an existing name raised "Replace file?" with
the folder named, and Replace completed the write. Photo Viewer and Notes show
their save controls; Screenshot offers "Save As…" beside Copy after a capture,
opening the sheet with PNG and JPEG. Console clean throughout.

**One mistake worth recording:** the first pass edited the main tree instead of
the worktree — the shell's cwd had not followed. Reverted and redone in the
right place; main was clean before the branch was committed.

**Thin spots left for review:** Camera's per-capture save button could not be
exercised, since the browser had no camera to capture from — the control only
renders once a capture exists. Notes and Photo Viewer had their buttons
confirmed present but not driven end to end. JPEG's white-flatten path for
transparency is implemented and compiles but was only exercised through the 4×4
test image, not inspected pixel by pixel.

### Follow-up during build (2026-07-26)

Screenshot no longer writes a capture silently. It opens the save sheet with a
suggested name, PNG/JPEG, and the destination shown; cancelling keeps the shot
on screen and copyable. Verified: after a capture the sheet is open, no
automatic save happened, console clean.

**Open, not addressed:** the Screenshot app's own UI does not follow the L-001 /
L-002 icon and control vocabulary — reported by the user, not yet fixed. Its
segmented Capture/Timer controls and shutter button were built ad hoc rather
than from the shared primitives, and it should be reworked against the same
guidelines the other apps follow. Worth doing before this issue merges.
