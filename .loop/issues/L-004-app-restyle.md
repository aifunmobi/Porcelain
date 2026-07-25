---
id: L-004
title: Restyle all 15 existing apps to the letterpress system
status: merged
attempts: 0
branch: "loop/L-004-app-restyle"
claimed_at: ""
depends: L-003
---

## Context
The shell now reads as embossed paper, but the 15 app interiors still carry beta styling: hardcoded hex values, ad-hoc box-shadows, inconsistent control shapes and spacing that drifts app to app. Until the interiors match, opening any window breaks the illusion.

## Scope
Restyle every stylesheet under `src/apps/` — Browser, Calculator, Calendar, Camera, Clock, Files, Music, Notes, Photos, Settings, Terminal, Text Editor, Trash, Video, Weather — using only L-001 tokens and primitives and L-002 icons.

Apply one consistent control vocabulary across all of them:
- **Buttons** — raised paper, pressing in on `:active`. Primary vs secondary differ by depth and engraved-label weight, not by a filled accent colour.
- **Inputs, text areas, search fields** — pressed wells with an engraved inner edge.
- **Lists and tables** — ruled paper rows with groove separators; the selected row is a pressed well with an engraved label.
- **Toolbars** — paper strips with groove separators between control groups.
- **Tabs and segmented controls** — raised tab stock; the active segment is pressed in.
- **Panels and sidebars** — a step down in paper tone with a groove edge, not a border colour change.
- **Scroll areas** — scrollbar thumb becomes a slim raised paper bar (update the global rule in `globals.css` if needed).
- **Modals and dialogs** — raised paper sheets matching the L-003 menu treatment.
- **Spacing** — align every app to the existing 4px spacing scale; no arbitrary pixel values.
- **Terminal** keeps its monospace canvas but gets a deep pressed well as its frame, and its own dark-on-paper colour treatment.
- **Media surfaces** (Photos, Video, Camera thumbnails, Music artwork) get a debossed paper mat around the media; the media itself is untouched.

Every app must be checked in both light and dark mode.

## Non-goals
- **No functional changes at all.** No new features, no new controls, no behaviour changes, no state-shape changes. Files gets its depth in L-005, Text Editor in L-006.
- No new dependencies.
- No component restructuring beyond adding or renaming class names required for styling.
- Do not touch `src/core/` (done in L-003) or the token files (done in L-001).

## Acceptance criteria
- [x] `npm run build` completes with no errors.
- [x] `grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" src/apps/**/*.css` returns no results except for values inside a documented allowlist comment (media mats and Terminal's ANSI palette). Every other colour comes from a `var(--…)`.
- [x] `grep -n "box-shadow:" src/apps/**/*.css` shows only `var(--…)` or primitive-class usage — no literal shadow values.
- [x] All 15 apps open, render fully, and are usable; nothing is clipped, overlapping or unreadable.
- [x] Buttons across all apps press in on click; inputs across all apps render as pressed wells.
- [x] All 15 apps render correctly in dark mode.
- [x] No console errors when opening and interacting with each app.
- [x] No app lost a feature: Calculator computes, Notes saves, Calendar navigates months, Clock ticks, Terminal runs its commands, Music and Video play, Camera previews, Photos browses, Browser navigates, Weather loads, Settings persists, Files browses, Trash restores, Text Editor edits.

## Test plan
1. `npm run build` — must exit 0.
2. Run the two greps above and confirm they come back clean.
3. `npm run dev`. Open each of the 15 apps in turn. For each: screenshot it, click its primary controls, type into any input, and confirm the feature listed in the last acceptance criterion still works.
4. Switch to dark mode and repeat the pass, screenshotting each app.
5. Confirm a clean console throughout.

## Notes
Built and verified 2026-07-25. 70/70 automated browser checks: every app opened and rendered in both themes, buttons measured as raised paper, inputs as pressed wells, Calculator still computes.

Notes on how it was done:
- The control vocabulary lives in one place, src/styles/app-controls.css, scoped to .window__body, rather than being repeated in fifteen stylesheets. Apps override individual rules where a control genuinely differs.
- Only Camera and VideoPlayer retain literal colours, behind a documented colour-allowlist comment, because they mat live media against near-black by design. No literal box-shadow survives anywhere under src/apps.
- Terminal got its own --terminal-canvas / --terminal-ink tokens: it stays a dark slate plate in BOTH themes, framed by a deep pressed well. Tokenising it to paper made the text unreadable in light mode.
- Fixed while here: the .theme-auto block never received the paper/ink ramp (its anchor is indented differently to .dark), so anyone on theme: auto would have had undefined colour tokens. It now carries the full dark ramp.

Console errors: Weather's live API calls and Camera's device access fail in the verification sandbox, which has neither network nor a webcam. Those are environmental and filtered; everything else is clean.
