/* The Edit menu, wired once for every app.
 *
 * Cut/Copy/Paste/Select All/Undo/Redo are the same operation everywhere: they
 * act on whatever text field currently has focus. So rather than each of the
 * eighteen apps exporting handlers, the menu operates directly on the focused
 * element — which means an app gets a working Edit menu by having an input in
 * it, and nothing to maintain.
 *
 * The catch is focus. Clicking a menu would normally move focus to the menu and
 * the field would lose its selection before the command ran, so the menu bar
 * calls preventDefault on mousedown (see keepFocus) and the field never gives
 * it up.
 */

export type EditCommand = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll';

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

const TEXT_INPUT_TYPES = ['text', 'search', 'url', 'email', 'tel', 'password', 'number'];

/** The focused element, if it is somewhere text can be edited or selected. */
export const editTarget = (): Editable | null => {
  const el = document.activeElement as Editable | null;
  if (!el) return null;
  if (el instanceof HTMLTextAreaElement) return el.readOnly ? null : el;
  if (el instanceof HTMLInputElement) {
    if (el.readOnly) return null;
    return TEXT_INPUT_TYPES.includes(el.type) ? el : null;
  }
  if (el.isContentEditable) return el;
  return null;
};

/** True when something is selected — Cut and Copy need a selection, not a caret. */
export const hasSelection = (el: Editable | null = editTarget()): boolean => {
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.selectionStart !== null && el.selectionStart !== el.selectionEnd;
  }
  const sel = window.getSelection();
  return !!sel && !sel.isCollapsed;
};

export const canRun = (command: EditCommand): boolean => {
  const el = editTarget();
  if (!el) return false;
  if (command === 'cut' || command === 'copy') return hasSelection(el);
  return true;
};

/** Replace the current selection, keeping the field's own undo stack intact. */
const insertText = (el: Editable, text: string) => {
  // execCommand is deprecated but is the only route that survives undo; the
  // alternative (setting .value) wipes the field's history.
  if (document.execCommand('insertText', false, text)) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

const selectedText = (el: Editable): string => {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
  }
  return window.getSelection()?.toString() ?? '';
};

export const runEditCommand = async (command: EditCommand): Promise<void> => {
  const el = editTarget();
  if (!el) return;

  switch (command) {
    case 'selectAll':
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.select();
      else document.execCommand('selectAll');
      return;

    case 'undo':
    case 'redo':
      document.execCommand(command);
      return;

    case 'copy':
    case 'cut': {
      const text = selectedText(el);
      if (!text) return;
      // Browsers refuse execCommand('cut'/'copy') outside a trusted gesture in
      // some paths, so write the clipboard directly and do the deletion here.
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        document.execCommand(command);
        return;
      }
      if (command === 'cut') insertText(el, '');
      return;
    }

    case 'paste': {
      // execCommand('paste') is blocked in every browser for security; reading
      // the clipboard and inserting is the only path that works.
      try {
        const text = await navigator.clipboard.readText();
        if (text) insertText(el, text);
      } catch {
        /* clipboard read denied — nothing sensible to fall back to */
      }
      return;
    }
  }
};
