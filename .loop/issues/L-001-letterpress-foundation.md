---
id: L-001
title: Letterpress design foundation — tokens, primitives, style gallery, v2.0
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: ""
---

## Context
Porcelain OS 1.5 is a beta. Its visual language is generic soft neumorphism: two-sided blurry shadows, flat SVG line icons, and hairline borders that read as CSS defaults rather than as a deliberate material. The target identity is embossed paper — letterpress: a single consistent light source, crisp debossed edges, raised plates, and pressed wells. Everything downstream (icons, shell, apps) builds on this layer, so it lands first and alone.

## Scope
Create the material system. No component or app is restyled in this issue.

1. **New `src/styles/tokens/emboss.css`** — the single source of truth for the material:
   - Light-source variables: `--emboss-angle` (default 135deg, i.e. light from top-left), `--emboss-light` (highlight colour), `--emboss-dark` (shadow colour), `--emboss-ambient`.
   - Raised depths: `--emboss-raise-1`, `--emboss-raise-2`, `--emboss-raise-3` — paired offset shadows (dark bottom-right, light top-left) plus a 1px inner top highlight.
   - Pressed depths: `--emboss-press-1`, `--emboss-press-2` — inset equivalents.
   - Deboss (engraved-into-surface): `--emboss-deboss-1`, `--emboss-deboss-2`.
   - Edges: `--edge-hairline` (a sub-pixel border colour), `--edge-highlight`, `--edge-shadow`.
   - Text emboss: `--text-emboss-raised`, `--text-emboss-engraved` (text-shadow pairs).
   - `--paper-grain`: one inline SVG `feTurbulence` data-URI background, defined exactly once and reused.
2. **Rewrite `src/styles/tokens/shadows.css`** so every existing token (`--shadow-xs` … `--shadow-icon`) is derived from the emboss variables. Every current token name must keep working so nothing downstream breaks.
3. **Extend `src/styles/tokens/colors.css`** with a warm paper surface ramp (`--paper-0` … `--paper-4`) plus the light-mode emboss colour values.
4. **Dark mode = "debossed slate".** Under `.dark` and the `prefers-color-scheme` block, override the emboss variables with a distinct recipe: cooler and much subtler highlight (dark paper does not catch light like white paper), deeper shadow, lower overall contrast. Dark mode must look deliberately engraved, not like an inverted light theme.
5. **New `src/styles/primitives.css`** — reusable utility classes built only from the tokens above: `.p-plate` (raised paper panel), `.p-tile` (raised rounded square, for icons), `.p-well` (pressed inset area, for inputs/lists), `.p-groove` (engraved 1px divider), `.p-hairline` (crisp edge), `.p-engraved` (engraved text), `.p-paper` (applies the grain), `.p-pressable` (adds the press-down interaction: on `:active`, shadow flips from raise to press and content shifts 1px toward the light source, 120ms ease).
6. **Reduced motion**: wrap all primitive transitions in `@media (prefers-reduced-motion: no-preference)`.
7. **Style gallery**: a dev-only page rendered when `window.location.search` contains `gallery=1`, mounted from `src/main.tsx` before the OS boots. It renders every token and every primitive class as a labelled live sample, with a light/dark toggle at the top. This is the review surface for L-001 and L-002.
8. **Version**: set `src/version.ts` `VERSION` to `'2.0'` and update `BUILD_DATE` / `BUILD_TIME` to the build moment.
9. Import `primitives.css` from `src/styles/globals.css` after the token imports.

## Non-goals
- Do NOT restyle any window, dock, menu bar, app or icon — that is L-002 through L-004.
- Do NOT change any component markup other than `src/main.tsx` (gallery mount) and `src/version.ts`.
- No new dependencies. The grain is inline SVG, not an image asset.
- No changes to spacing.css or typography.css beyond additive tokens if genuinely needed.

## Acceptance criteria
- [ ] `npm run build` completes with no TypeScript or Vite errors.
- [ ] `src/styles/tokens/emboss.css` and `src/styles/primitives.css` exist and are imported via `globals.css`.
- [ ] Every one of the original shadow token names (`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-inset`, `--shadow-inset-deep`, `--shadow-window`, `--shadow-dock`, `--shadow-menu`, `--shadow-icon`) still resolves to a non-empty value.
- [ ] `http://localhost:5173/?gallery=1` renders the gallery, showing a labelled sample for each of: `.p-plate`, `.p-tile`, `.p-well`, `.p-groove`, `.p-hairline`, `.p-engraved`, `.p-paper`, `.p-pressable`, plus all three raise depths and both press depths.
- [ ] The gallery's light/dark toggle visibly changes the emboss treatment — dark mode highlights are noticeably weaker and cooler than light mode, not simply inverted.
- [ ] Clicking a `.p-pressable` sample visibly presses in (shadow inverts) and returns on release.
- [ ] `http://localhost:5173/` (no query string) still boots the normal desktop and every existing app still opens without a console error.
- [ ] About dialog reports version 2.0.

## Test plan
1. `npm run build` — must exit 0.
2. `npm run dev`, open `http://localhost:5173/?gallery=1` in the browser. Screenshot the gallery in light mode, toggle to dark, screenshot again. Compare: dark must be a distinct recipe, not an inversion.
3. Click a `.p-pressable` sample and confirm the press animation.
4. Open `http://localhost:5173/` and confirm the desktop boots, then open three apps (Files, Settings, Calculator) and confirm no console errors and no visual collapse from the shadow token rewrite.
5. Open the Apple-menu About dialog and confirm it reads 2.0.

## Notes
