# Handoff — 2026-07-25 evening

Read this first. It is written for a session with no memory of today.

## Where things stand

**Project:** `/Users/peter/Downloads/games/ClaudeOS/porcelain-os` — a macOS-style
desktop simulation. React + TypeScript + Vite, wrapped in Tauri. Note the repo
root one level up (`ClaudeOS/`) has no package.json; everything lives here.

**main** is at `948e405`, clean, and ahead of `origin/main` by 37 commits
(nothing has been pushed — check whether that is wanted before pushing).

| Issue | State |
|-------|-------|
| L-001 … L-007 | merged |
| **L-009** Save/Save As | **built, on branch `loop/L-009-save-and-save-as` (`163a368`), NOT merged** |
| **L-008** Mail/Contacts/Reminders | backlog, untouched — the user asked to leave it |

## Do these next, in this order

### 1. ~~Restyle the Screenshot app to the design system~~ — DONE (uncommitted)
Root cause was not Screenshot-specific. `.window__body button:not(.pcl-bare)`
in `app-controls.css` has specificity (0,2,1); every app's `.foo--active`
override was (0,2,0) or lower and silently lost, so selected/primary/danger
states across the whole OS were rendering as ordinary raised paper.

`app-controls.css` now owns four variants — `.is-selected`, `.is-primary`,
`.is-danger`, `.is-round` — each qualified with `:not(.pcl-bare)` so it carries
three classes to the base control's two and wins on specificity alone, not on
bundle order (app CSS is bundled *after* app-controls.css, so anything relying
on source order is decided by import order rather than intent). The dead
declarations in the app stylesheets were deleted. **Do not add a variant that
ties on specificity.**

Verified in-browser, light and dark: 82 enabled buttons across 17 apps resolve
to 4 materials × 2 shapes, and disabled to a single signature.

### 2. Then review and merge L-009
`/l-review` will pick it up (status is `review`). It covers Save/Save As across
Preview, Photo Viewer, Notes, Camera and Screenshot, plus the change making a
screenshot ask for name/format/location instead of saving silently.

### 3. Strengthen `/l-review` before trusting it again
This matters. Today the review caught 12 defects, but the user then found four
more by hand in ten minutes: a doubled dock tooltip, a tilted drag label,
images showing a generic glyph instead of a thumbnail, and a context menu
clipped at the window edge.

They were all invisible for one structural reason: **the review only checks the
acceptance criteria**, and no criterion mentioned hover states, image files, or
where a menu opens. Verification also leaned on asserting DOM values rather than
reading the screenshots being captured — `items.length === 8` passes whether or
not four of them are off-screen.

Proposed additions (the user has not yet approved editing the skill file):
1. **Edges and extremes** — open every menu/popover/tooltip at all four corners
   of its container, not just the middle.
2. **Real content types** — an app that handles files gets tested with an image,
   a binary and an empty file, not only `.txt`.
3. **Look, don't just assert** — for any visual criterion, read the screenshot
   and say what is on screen before passing it.
4. **Hover and drag states** — exercised explicitly; no AC ever describes them.

Re-running the improved review over L-005…L-007 would likely surface more.

### 4. L-008 only if the user asks
Three more apps, the largest issue in the set.

## Things that will bite you

- **Browser mode is a simulation.** `src/services/fsAdapter.ts` picks a backend
  at startup: Tauri → the real filesystem; browser → an in-memory tree in
  `localStorage`. Files/Preview/Archive/Screenshot all sit behind it. Anything
  "real filesystem" cannot be tested at `localhost:5173`; it needs the app.
  This is also the single seam if the filesystem layer is ever moved to native.
- **The app bundle is current as of 2026-07-26 19:09** (`e41778d` + the Preview
  html fix). Rebuilt and installed: `/Applications/porcelain-os.app` now matches
  the build output, so Launchpad and the Desktop launcher open the same thing.
  It embeds `index-CeKPKr3l.js` — check those hashes
  against `dist/assets/` to tell at a glance whether the bundle has gone stale
  again. Rebuild with `npm run tauri:build` (~25s now that Rust is warm), then
  re-copy to `/Applications` or the two drift apart silently.
- **Worktree cwd trap.** `git worktree add` does not move the shell. Today one
  edit pass landed in the main tree by mistake. After creating a worktree, `cd`
  into it and confirm with `pwd` before editing.
- **`~/Desktop` is unreadable** to the terminal — macOS TCC, not the sandbox,
  and `dangerouslyDisableSandbox` does not help. Use AppleScript/Finder, which
  has permission: that is how `~/Desktop/Commands/Launch Porcelain OS.command`
  got placed. Source lives in `scripts/`.
- **localStorage quota.** In browser mode a full-desktop PNG at devicePixelRatio
  overran it, so `src/services/capture.ts` rasterises at 1×. Repeated large
  captures can still fill it; clear `porcelain-filesystem` if writes start
  failing.
- **A worktree needs `node_modules`.** `ln -sfn ../../../node_modules node_modules`
  inside it, except for L-009's branch which added `fflate` — there, run a real
  `npm install`.

## Recurring bug pattern worth watching

Nearly every defect found today was React state lagging DOM reality:
stale closures reading last render's value; DOM mutations that no effect
watched; and a zustand selector building a new array each render, which took
down the whole shell. When something "doesn't update", suspect that first.

## Running things

- `npm run dev` → http://localhost:5173/ (browser, simulated filesystem)
- `npm run tauri:build` then `~/Desktop/Commands/Launch Porcelain OS.command`
  (native, real filesystem)
- Loop: `/l-build` claims the next backlog issue, `/l-review` tests and merges
  one in `review`. `.loop/LOG.md` records what has shipped.
