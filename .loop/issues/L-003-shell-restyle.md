---
id: L-003
title: Restyle the shell — desktop, dock, menu bar, windows, Spotlight, notifications
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-002
---

## Context
With the material (L-001) and the icons (L-002) in place, the OS chrome still uses the beta styling: translucent blur dock, flat gradient title bars, macOS-clone traffic lights, and `opacity: 0.97` as the only signal that a window is inactive. The shell is what the user sees before opening anything, so it carries most of the first impression.

## Scope
Restyle every file under `src/core/` plus the shared overlays, using only L-001 primitives and L-002 icons.

**Windows** (`window-manager/Window.css`, `WindowManager.css`)
- Window becomes a raised paper card: hairline edge, inner top highlight, single soft cast shadow from the shared light source. Drop the blurry dual-shadow.
- Active vs inactive is expressed by shadow depth and title-bar contrast — remove the `opacity: 0.97` inactive treatment entirely.
- Title bar: paper strip with an engraved title, a groove separating it from the body.
- Window controls: three pressed paper wells with debossed glyphs (close/minimise/maximise), each physically pressing in on `:active`. Keep the colour coding but mute it into the paper palette.

**Dock** (`dock/Dock.css`, `Dock.tsx`)
- Replace the translucent blur plank with a solid raised paper plank with a hairline edge and grain.
- Each item sits in a pressed well; the icon uses `mode="tile"`.
- Hover raises the tile one depth; click presses it in. No scale-bounce.
- Running indicator becomes a small engraved dot below the tile.
- Tooltip becomes a small raised paper label, not a dark pill.

**Menu bar** (`menubar/MenuBar.css`)
- Paper strip with an engraved bottom edge.
- Open menus render as raised paper sheets with groove dividers, engraved section labels, and a pressed-well highlight on the hovered row.
- Status items (clock, wifi, battery, volume) use L-002 glyphs at a consistent size and optical weight.

**Desktop** (`desktop/Desktop.css`)
- Paper backdrop with the grain, warm and slightly vignetted toward the edges.
- Desktop icons use `mode="tile"` with engraved labels; selection is a pressed well behind the tile, not a blue rectangle.
- Selection marquee becomes a thin ruled line with a faint paper tint.
- Context menus match the menu-bar sheet styling.

**Overlays** (`components/Spotlight.css`, `components/Notifications.css`, `components/DragOverlay.css`)
- Spotlight: raised paper card floating above the desktop, its search field a deep pressed well, results as ruled rows with tile icons.
- Notifications: small raised paper cards with a groove between title and body; severity shown by an engraved accent bar, not a coloured background block.
- Drag overlay: dragged item renders as a lifted paper tile with an exaggerated cast shadow.

**Interaction polish** (applies to all of the above)
- One shared press interaction from `.p-pressable`: 120ms, shadow flips raise→press, content nudges 1px toward the light.
- Hover = exactly one depth increase. Never a colour-only hover.
- Focus-visible = engraved outline, never the browser default ring.
- All of it honours `prefers-reduced-motion`.

**Dark mode**: full parity. Every surface above must be checked in dark and use the slate recipe.

## Non-goals
- No app content restyling — everything under `src/apps/` is L-004.
- No behaviour changes: window dragging, resizing, z-order, dock launching, Spotlight search and notification logic all keep working exactly as they do now.
- No new dependencies, no layout restructure beyond what the styling requires.

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] Windows show no `opacity` change between active and inactive; the difference is shadow depth and title-bar contrast.
- [ ] `backdrop-filter` is gone from the dock (grep `src/core/` returns no `backdrop-filter`).
- [ ] Dock icons render in `tile` mode; hovering raises and clicking presses, with no scale-bounce.
- [ ] Desktop icon selection renders as a pressed well, not a solid blue/accent rectangle.
- [ ] Spotlight opens as a raised paper card with a pressed search field, and search still returns and launches apps.
- [ ] A notification (triggerable from Settings or by an app action) renders as a paper card with an engraved accent bar.
- [ ] Dragging a desktop icon shows the lifted-tile overlay and drop still works.
- [ ] Every shell surface above renders correctly in dark mode with the slate recipe.
- [ ] Windows still drag, resize, minimise, maximise, close, and raise on click.
- [ ] No console errors during any of the above.

## Test plan
1. `npm run build` — must exit 0.
2. `npm run dev`, open the desktop in the browser.
3. Open three windows. Screenshot with one focused. Confirm the inactive windows differ by depth, not transparency. Drag, resize, minimise, maximise and close each one.
4. Hover and click several dock items; screenshot mid-hover and mid-press.
5. Open each menu-bar menu; screenshot one open menu.
6. Right-click the desktop for the context menu; drag-select a region; drag an icon.
7. Open Spotlight, type an app name, launch from it.
8. Trigger a notification and screenshot it.
9. Switch to dark mode in Settings and repeat steps 3-8, screenshotting each surface.
10. Confirm a clean console throughout.

## Notes
