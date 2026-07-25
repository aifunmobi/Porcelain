---
id: L-008
title: Add Mail (real IMAP/SMTP), Contacts and Reminders
status: backlog
attempts: 0
branch: ""
claimed_at: ""
depends: L-007
---

## Context
Porcelain has no communication or personal-data apps. Mail is the demanding one: it must talk to a real mailbox over IMAP and SMTP, which is only possible from the Tauri Rust side — a browser cannot open those sockets. Contacts and Reminders stay local and give Mail somewhere to draw addresses from. Because the autonomous loop has no mailbox credentials, Mail is built against a mock backend that implements the same command interface, and the real-account path is verified manually by the user.

## Scope

**Mail — Rust backend** (`src-tauri/`)
- Add crates: `imap`, `native-tls` (or `rustls` via `imap`'s tls feature), `lettre`, `mailparse`, `keyring`.
- Tauri commands, all async and all returning typed results:
  `mail_test_connection(config)`, `mail_list_folders()`, `mail_fetch_headers(folder, offset, limit)`, `mail_fetch_body(folder, uid)`, `mail_send(message)`, `mail_set_flag(folder, uid, flag, value)`, `mail_delete(folder, uid)`, `mail_save_credentials(account, password)`, `mail_delete_credentials(account)`.
- Passwords go to the OS keychain via `keyring` and are never written to disk, never returned to the frontend, and never stored in localStorage or the settings store.
- Non-secret account config (display name, email, IMAP host/port/TLS, SMTP host/port/TLS, username) lives in the settings store.
- Errors are typed and specific: auth failed, host unreachable, TLS failure, mailbox not found, send rejected — the UI must be able to tell them apart.
- Declare the new commands in `src-tauri/capabilities/`.

**Mail — frontend** (`src/apps/mail/`)
- **Account setup**: a form for display name, email, IMAP host/port/TLS, SMTP host/port/TLS, username, password, with a "Test connection" button that reports the specific failure. A short helper line notes that Gmail and iCloud require an app-specific password rather than the account password.
- **Three-pane UI**: folder list, message list (sender, subject, snippet, date, unread and attachment markers), reading pane.
- **Compose window**: to/cc/bcc with autocomplete from Contacts, subject, plain-text body, send, and save-to-drafts. Reply, reply-all and forward pre-fill correctly with quoted text.
- **Actions**: mark read/unread, delete, refresh, and search over cached headers.
- **Offline cache** in Dexie: headers and fetched bodies persist, so relaunching shows the last sync immediately while a refresh runs.
- **States**: not-configured, connecting, syncing, auth-failed, offline, empty-folder — each with a clear paper-styled screen, never a blank pane or a spinner with no explanation.

**Mail — mock backend**
- A `MailBackend` interface with two implementations: `TauriMailBackend` (the commands above) and `MockMailBackend` (seeded folders and messages, simulated latency, and switchable failure modes for auth-failed and offline).
- The mock is selected automatically when not running under Tauri, and can be forced with `VITE_MAIL_MOCK=1`. **Everything the loop verifies runs against the mock.**

**Contacts** (`src/apps/contacts/`)
- Local Dexie storage. Create, edit, delete a contact: name, one or more emails, phones, address, organisation, notes, and an avatar.
- Groups, search, alphabetical sections, and vCard (`.vcf`) import and export.
- "Compose mail" action opens Mail's compose window pre-addressed.

**Reminders** (`src/apps/reminders/`)
- Local Dexie storage. Multiple lists; a reminder has a title, notes, due date and time, priority, and a completed state.
- Today / Scheduled / All / Completed smart views.
- Due reminders raise a system notification through the existing `notificationStore`.
- ICS export of a list.

All three apps are registered, docked, added to Spotlight, and use the L-002 `mail`, `contacts` and `reminders` icons, styled per L-001/L-004 in light and dark mode.

## Non-goals
- No OAuth2 and no Gmail-specific sign-in — the generic config form is the only auth path this issue ships. Leave the backend seam clean so a provider-specific auth can be added later.
- No HTML mail composition — sending is plain text. Received HTML mail is rendered read-only in a sandboxed iframe with remote images blocked by default.
- No push/IDLE — refresh is manual and on an interval.
- No CardDAV or CalDAV sync; Contacts and Reminders are local-only.
- No attachment sending in this issue; received attachments are downloadable only.
- The loop does not test against a real mailbox.

## Acceptance criteria
- [ ] `npm run build` completes with no errors.
- [ ] `cd src-tauri && cargo check` completes with no errors.
- [ ] `grep -rn "password" src/` shows no path that writes a password into localStorage, the settings store, or Dexie.
- [ ] With the mock backend, Mail shows folders, lists messages, opens a message body, marks read/unread, deletes, and searches.
- [ ] With the mock backend, compose sends and the message appears in Sent; save-to-drafts puts it in Drafts.
- [ ] Reply, reply-all and forward each pre-fill recipients, subject prefix and quoted body correctly.
- [ ] The mock's auth-failed mode produces a distinct "authentication failed" screen; the offline mode produces a distinct offline screen showing cached headers.
- [ ] The not-configured state shows the setup form, and "Test connection" reports a specific error rather than a generic failure.
- [ ] Relaunching Mail shows cached messages immediately, before any refresh completes.
- [ ] Received HTML mail renders in a sandboxed iframe with remote images blocked until the user opts in.
- [ ] Contacts creates, edits, deletes, searches and groups contacts; vCard import and export round-trip without data loss.
- [ ] Composing from a contact opens Mail pre-addressed.
- [ ] Compose recipient autocomplete suggests from Contacts.
- [ ] Reminders creates lists and reminders, completes them, filters by all four smart views, fires a notification for a due reminder, and exports ICS.
- [ ] All three apps appear in the registry, dock and Spotlight with their own icons.
- [ ] All three render correctly in dark mode.
- [ ] `README.md` gains a "Connecting Mail to a real account" section with the manual verification checklist below.
- [ ] No console errors during any of the above.

## Test plan
Automated gate — all against the mock, in the dev server:
1. `npm run build` — must exit 0.
2. `cd src-tauri && cargo check` — must exit 0. (Needs network for the first crate fetch.)
3. Run the password grep and confirm no secret-persisting path exists.
4. `VITE_MAIL_MOCK=1 npm run dev`. In Mail: browse folders, open three messages, mark unread, delete one, search for a known subject.
5. Compose a message, send it, confirm it lands in Sent. Compose another, save as draft, confirm it lands in Drafts.
6. Reply, reply-all and forward one message each; check recipients, the Re:/Fwd: prefix and the quoted body.
7. Switch the mock to auth-failed, then to offline; screenshot both screens; confirm offline still shows cached headers.
8. Reload the page and confirm cached messages appear before the refresh finishes.
9. Contacts: create two contacts, edit one, group them, search, export vCard, delete both, re-import the vCard, confirm the data matches.
10. From a contact, click Compose Mail and confirm the To field is pre-filled. In compose, type two letters and confirm autocomplete suggests the contact.
11. Reminders: create two lists and four reminders with varied due dates and priorities; complete one; check all four smart views; set one due within a minute and confirm the notification fires; export ICS and confirm it parses.
12. Switch to dark mode and screenshot all three apps.
13. Confirm a clean console throughout.

Manual checklist for the user (documented in README, not run by the loop):
- Build the Tauri app, open Mail, enter a real IMAP/SMTP config with an app-specific password, and Test Connection.
- Confirm the inbox lists real messages, a body opens, a send arrives at another address, and a delete is reflected on the server.

## Notes
Real crate fetching (`cargo check` / `cargo build`) needs network access on whichever machine runs the loop. If the build step reports a network failure fetching crates, bounce the issue rather than stubbing the Rust backend out.
