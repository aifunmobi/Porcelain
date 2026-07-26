# Loop log

- 2026-07-25 L-001 Letterpress design foundation — merged. Try it: `npm run dev`, then open http://localhost:5173/?gallery=1 for the style gallery (light/dark toggle top right).
- 2026-07-25 L-002 Embossed paper icon system — merged. Try it: same gallery page, scroll to the icon sheet — 69 marks at 16/24/48px plus app tiles.
- 2026-07-25 L-003 Restyle the shell — merged. Try it: `npm run dev` — windows, dock, menu bar, Spotlight and the desktop are now paper; toggle dark mode in Settings to see the slate recipe.
- 2026-07-25 L-004 Restyle all 15 apps — merged. Try it: open any app; buttons are raised paper, inputs are pressed wells, Terminal is a slate plate. Both themes.
- 2026-07-25 L-005 Bring Files up to Finder grade — merged. Try it: `npm run dev`, open Files — three views (⌘1/2/3), sortable list columns, Miller columns, ⌘I Get Info, and a Search Here toggle for subfolders.
- 2026-07-25 L-006 Bring Text Editor up to TextEdit grade — merged. Try it: `npm run dev`, open Text Editor — Rich/Plain modes, ⌘F find and replace, autosave, recents, and a paper page (⌘P prints the page alone).
- 2026-07-26 L-007 Add Preview, Archive Utility and Screenshot — merged. Try it: `npm run dev` — double-click an image or PDF in Files for Preview, right-click for Compress/Extract, and press ⌘⇧3 or ⌘⇧4 to capture the desktop.
- 2026-07-26 Button uniformity sweep — merged. Try it: open any app; a selected toggle presses into the sheet, a primary button reads as deeper stock, a destructive one is tinted. Four variants live in app-controls.css; 458 lines of dead app CSS gone.
- 2026-07-26 L-009 Save and Save As across the file-handling apps — merged. Try it: `npm run dev`, take a screenshot (⌘⇧3) and it asks for name/format/location; Preview, Photo Viewer, Notes and Camera all offer Save As with two formats.
- 2026-07-26 L-009 reviewed against merged main — all 11 acceptance criteria verified by driving the UI, including Camera's save which the build could not test. One defect found and fixed: Preview would not list the HTML it had just written.
- 2026-07-26 Native app rebuilt and installed. Try it: open Porcelain OS from Launchpad, or double-click ~/Desktop/Commands/Launch Porcelain OS.command. Both now run the same current build; /Applications had been a day stale.
- 2026-07-26 Edit menu wired across every app — merged. Try it: type in any text field, then use Edit ▸ Cut/Copy/Paste/Select All/Undo/Redo from the top menu. Cut and Copy grey out unless something is selected. 31 labels for features that never existed were removed.
