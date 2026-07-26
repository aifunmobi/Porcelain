---
id: L-009
title: Save and Save As across the file-handling apps
status: building
attempts: 1
branch: "loop/L-009-save-and-save-as"
claimed_at: "2026-07-26T00:45:50Z"
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
