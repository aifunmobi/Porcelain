import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../../components/Icons';
import { useWindowStore } from '../../stores/windowStore';
import {
  useTextEditorStore,
  FONT_FAMILIES,
  RECENTS_LIMIT,
  type EditorMode,
  type FontFamilyId,
} from '../../stores/textEditorStore';
import { createBackend, basename } from '../../services/fsAdapter';
import type { FsBackend } from '../../services/fsAdapter';
import { getFileExtension } from '../../services/tauriFs';
import type { AppProps } from '../../types';
import {
  collectTextChunks,
  findMatchOffsets,
  rangeForOffsets,
  paintHighlights,
  clearHighlights,
  textToHtml,
  htmlToText,
  wrapHtmlDocument,
  unwrapHtmlDocument,
} from './richText';
import './TextEditor.css';

interface TextEditorProps extends AppProps {
  filePath?: string;
}

const AUTOSAVE_MS = 3000;
const TEXT_EXTENSIONS = ['txt', 'md', 'html'];

type Dialog =
  | { kind: 'saveAs'; value: string }
  | { kind: 'link'; value: string }
  | { kind: 'open' }
  | { kind: 'confirm'; message: string; confirmLabel: string; onConfirm: () => void };

const countStats = (text: string) => ({
  words: text.trim() ? text.trim().split(/\s+/).length : 0,
  chars: text.length,
  lines: text.split('\n').length,
});

export const TextEditor: React.FC<TextEditorProps> = ({ windowId, filePath }) => {
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [mode, setMode] = useState<EditorMode>('plain');
  const [path, setPath] = useState<string | null>(filePath ?? null);
  const [plainText, setPlainText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({ words: 0, chars: 0, lines: 1 });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [openList, setOpenList] = useState<string[]>([]);

  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchTotal, setMatchTotal] = useState(0);
  /** Bumped whenever rich content mutates, so find can recount — the DOM is not React state. */
  const [docVersion, setDocVersion] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);

  const {
    recents,
    addRecent,
    fontFamily,
    fontSize,
    lineHeight,
    wrapToPage,
    modeByPath,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setWrapToPage,
    setModeForPath,
  } = useTextEditorStore();
  const closeWindow = useWindowStore((s) => s.closeWindow);

  const richRef = useRef<HTMLDivElement>(null);
  const plainRef = useRef<HTMLTextAreaElement>(null);
  const savedRef = useRef('');
  const findInputRef = useRef<HTMLInputElement>(null);
  /** Typing in a dialog collapses the document selection, so stash it first. */
  const savedRange = useRef<Range | null>(null);
  /**
   * Plain mode keeps its own history: the textarea is controlled, so the
   * browser's native undo stack desyncs the moment React re-applies state.
   * Rich mode has no such problem and uses execCommand's own stack.
   */
  const history = useRef<{ stack: string[]; index: number }>({ stack: [''], index: 0 });
  const applyingHistory = useRef(false);

  const pushHistory = useCallback((value: string) => {
    if (applyingHistory.current) return;
    const h = history.current;
    if (h.stack[h.index] === value) return;
    h.stack = [...h.stack.slice(0, h.index + 1), value].slice(-200);
    h.index = h.stack.length - 1;
  }, []);

  const resetHistory = useCallback((value: string) => {
    history.current = { stack: [value], index: 0 };
  }, []);

  const fontStack = FONT_FAMILIES.find((f) => f.id === fontFamily)?.stack ?? FONT_FAMILIES[0].stack;
  const fileName = path ? basename(path) : 'Untitled';

  useEffect(() => {
    createBackend().then(setBackend);
  }, []);

  /* ------------------------------------------------------------- document */

  /** The document as it would be written to disk. */
  const currentValue = useCallback(
    () => (mode === 'rich' ? richRef.current?.innerHTML ?? '' : plainText),
    [mode, plainText]
  );

  const refreshStats = useCallback(() => {
    const text =
      mode === 'rich' && richRef.current ? htmlToText(richRef.current) : plainText;
    setStats(countStats(text));
  }, [mode, plainText]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const loadInto = useCallback(
    (raw: string, target: string | null, nextMode: EditorMode) => {
      setMode(nextMode);
      if (nextMode === 'rich') {
        const body = unwrapHtmlDocument(raw);
        if (richRef.current) richRef.current.innerHTML = body;
        savedRef.current = body;
        setPlainText('');
      } else {
        setPlainText(raw);
        savedRef.current = raw;
      }
      setPath(target);
      setDirty(false);
      resetHistory(nextMode === 'rich' ? '' : raw);
      if (target) addRecent(target);
      // Counts are recomputed by the effect below once the new mode has
      // rendered — doing it here would run against the outgoing mode.
    },
    [addRecent, resetHistory]
  );

  const openPath = useCallback(
    async (target: string) => {
      if (!backend) return;
      try {
        const raw = await backend.readText(target);
        const isHtml = getFileExtension(target) === 'html';
        loadInto(raw, target, modeByPath[target] ?? (isHtml ? 'rich' : 'plain'));
        setStatus(null);
      } catch {
        setStatus(`Could not open ${basename(target)}`);
      }
    },
    [backend, loadInto, modeByPath]
  );

  // Opening a file from Files/desktop hands the path in as a prop.
  useEffect(() => {
    if (filePath && backend) void openPath(filePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, backend]);

  /** Pass the new value when it is already known — React state lags a keystroke. */
  const markDirty = useCallback(
    (value?: string) => setDirty((value ?? currentValue()) !== savedRef.current),
    [currentValue]
  );

  /* ---------------------------------------------------------------- save */

  const writeTo = useCallback(
    async (target: string) => {
      if (!backend) return false;
      const value = currentValue();
      const payload = mode === 'rich' ? wrapHtmlDocument(value, basename(target)) : value;
      try {
        await backend.writeText(target, payload);
        savedRef.current = value;
        setDirty(false);
        setPath(target);
        addRecent(target);
        setModeForPath(target, mode);
        setStatus(`Saved ${basename(target)}`);
        return true;
      } catch {
        setStatus(`Could not save ${basename(target)}`);
        return false;
      }
    },
    [backend, currentValue, mode, addRecent, setModeForPath]
  );

  const defaultName = useCallback(() => {
    const ext = mode === 'rich' ? 'html' : 'txt';
    if (!path) return `/Documents/Untitled.${ext}`;
    // Rich documents round-trip as HTML, so retarget the extension on save.
    return mode === 'rich' ? path.replace(/\.[^./]+$/, '') + '.html' : path;
  }, [mode, path]);

  const saveAs = useCallback(() => setDialog({ kind: 'saveAs', value: defaultName() }), [defaultName]);

  const save = useCallback(() => {
    if (!path) return saveAs();
    const target = mode === 'rich' && getFileExtension(path) !== 'html' ? defaultName() : path;
    void writeTo(target);
  }, [path, mode, defaultName, saveAs, writeTo]);

  // Autosave: only once the document has somewhere to go.
  useEffect(() => {
    if (!dirty || !path) return;
    const timer = window.setTimeout(() => void writeTo(path), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, path, writeTo, plainText]);

  const newDocument = useCallback(() => {
    const reset = () => {
      if (richRef.current) richRef.current.innerHTML = '';
      setPlainText('');
      savedRef.current = '';
      resetHistory('');
      setPath(null);
      setDirty(false);
      setStatus(null);
    };
    if (dirty) {
      setDialog({
        kind: 'confirm',
        message: 'This document has unsaved changes. Discard them?',
        confirmLabel: 'Discard',
        onConfirm: reset,
      });
      return;
    }
    reset();
  }, [dirty, resetHistory]);

  /* -------------------------------------------------------- close guard */

  useEffect(() => {
    const onCloseRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ windowId: string }>).detail;
      if (detail.windowId !== windowId || !dirty) return;
      e.preventDefault();
      setDialog({
        kind: 'confirm',
        message: `${fileName} has unsaved changes. Close without saving?`,
        confirmLabel: 'Close Without Saving',
        onConfirm: () => closeWindow(windowId),
      });
    };
    window.addEventListener('porcelain-window-close', onCloseRequest);
    return () => window.removeEventListener('porcelain-window-close', onCloseRequest);
  }, [windowId, dirty, fileName, closeWindow]);

  /* ------------------------------------------------------------ find/replace */

  const plainMatches = useMemo(
    () => (mode === 'plain' ? findMatchOffsets(plainText, query, caseSensitive) : []),
    [mode, plainText, query, caseSensitive]
  );

  const richRanges = useCallback(() => {
    if (!richRef.current) return { ranges: [] as Range[], chunks: [], offsets: [] as Array<[number, number]> };
    const { chunks, text } = collectTextChunks(richRef.current);
    const offsets = findMatchOffsets(text, query, caseSensitive);
    const ranges = offsets
      .map(([s, e]) => rangeForOffsets(chunks, s, e))
      .filter((r): r is Range => r !== null);
    return { ranges, chunks, offsets };
  }, [query, caseSensitive]);

  // Recount whenever the query, the mode or the document changes.
  useEffect(() => {
    if (!findOpen || !query) {
      setMatchTotal(0);
      clearHighlights();
      return;
    }
    if (mode === 'plain') {
      setMatchTotal(plainMatches.length);
      return;
    }
    const { ranges } = richRanges();
    setMatchTotal(ranges.length);
    paintHighlights(ranges, matchIndex);
  }, [findOpen, query, caseSensitive, mode, plainMatches, richRanges, matchIndex, plainText, docVersion]);

  useEffect(() => () => clearHighlights(), []);

  const revealMatch = useCallback(
    (index: number) => {
      if (mode === 'plain') {
        const hit = plainMatches[index];
        const el = plainRef.current;
        if (!hit || !el) return;
        el.focus();
        el.setSelectionRange(hit[0], hit[1]);
      } else {
        const { ranges } = richRanges();
        const range = ranges[index];
        if (!range) return;
        paintHighlights(ranges, index);
        const rect = range.getBoundingClientRect();
        const host = richRef.current?.closest('.text-editor__surface');
        if (host && rect.height) {
          const hostRect = host.getBoundingClientRect();
          if (rect.top < hostRect.top || rect.bottom > hostRect.bottom) {
            host.scrollTop += rect.top - hostRect.top - hostRect.height / 3;
          }
        }
      }
    },
    [mode, plainMatches, richRanges]
  );

  const step = useCallback(
    (delta: number) => {
      if (!matchTotal) return;
      const next = (matchIndex + delta + matchTotal) % matchTotal;
      setMatchIndex(next);
      revealMatch(next);
    },
    [matchIndex, matchTotal, revealMatch]
  );

  const replaceOne = useCallback(() => {
    if (!matchTotal) return;
    if (mode === 'plain') {
      const hit = plainMatches[matchIndex];
      if (!hit) return;
      const next = plainText.slice(0, hit[0]) + replacement + plainText.slice(hit[1]);
      setPlainText(next);
      markDirty(next);
      setStats(countStats(next));
    } else {
      const { ranges } = richRanges();
      const range = ranges[matchIndex];
      if (!range) return;
      range.deleteContents();
      if (replacement) range.insertNode(document.createTextNode(replacement));
    }
    setMatchIndex(0);
    window.requestAnimationFrame(() => {
      markDirty();
      refreshStats();
      setDocVersion((v) => v + 1);
    });
  }, [mode, matchTotal, matchIndex, plainMatches, plainText, replacement, richRanges, markDirty, refreshStats]);

  const replaceAll = useCallback(() => {
    if (mode === 'plain') {
      const hits = plainMatches;
      if (!hits.length) return;
      let out = plainText;
      // Back to front, so earlier offsets stay valid.
      for (let i = hits.length - 1; i >= 0; i--) {
        out = out.slice(0, hits[i][0]) + replacement + out.slice(hits[i][1]);
      }
      setPlainText(out);
      markDirty(out);
      setStats(countStats(out));
    } else {
      const { ranges } = richRanges();
      for (let i = ranges.length - 1; i >= 0; i--) {
        ranges[i].deleteContents();
        if (replacement) ranges[i].insertNode(document.createTextNode(replacement));
      }
    }
    setMatchIndex(0);
    window.requestAnimationFrame(() => {
      markDirty();
      refreshStats();
      setDocVersion((v) => v + 1);
    });
  }, [mode, plainMatches, plainText, replacement, richRanges, markDirty, refreshStats]);

  /* --------------------------------------------------------- formatting */

  const exec = useCallback(
    (command: string, value?: string) => {
      richRef.current?.focus();
      // Restore the range a dialog interrupted, so the command still wraps the
      // text that was selected when the button was pressed.
      if (savedRange.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRange.current);
        savedRange.current = null;
      }
      document.execCommand(command, false, value);
      markDirty();
      refreshStats();
      setDocVersion((v) => v + 1);
    },
    [markDirty, refreshStats]
  );

  const stepHistory = useCallback(
    (delta: number) => {
      const h = history.current;
      const next = h.index + delta;
      if (next < 0 || next >= h.stack.length) return;
      h.index = next;
      applyingHistory.current = true;
      const value = h.stack[next];
      setPlainText(value);
      markDirty(value);
      setStats(countStats(value));
      window.setTimeout(() => {
        applyingHistory.current = false;
      }, 0);
    },
    [markDirty]
  );

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    savedRange.current =
      selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  }, []);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      const apply = () => {
        if (next === 'plain') {
          const text = richRef.current ? htmlToText(richRef.current) : '';
          setPlainText(text);
          savedRef.current = text;
        } else {
          const html = textToHtml(plainText);
          if (richRef.current) richRef.current.innerHTML = html;
          savedRef.current = html;
        }
        setMode(next);
        setDirty(true);
        if (path) setModeForPath(path, next);
      };
      if (next === 'plain' && (richRef.current?.innerHTML ?? '').trim()) {
        setDialog({
          kind: 'confirm',
          message: 'Switching to plain text removes all formatting from this document.',
          confirmLabel: 'Remove Formatting',
          onConfirm: apply,
        });
        return;
      }
      apply();
    },
    [mode, plainText, path, setModeForPath]
  );

  /* ------------------------------------------------------------- open UI */

  const showOpenDialog = useCallback(async () => {
    setDialog({ kind: 'open' });
    if (!backend) return;
    const found = await backend.searchDeep(backend.home, '');
    setOpenList(
      found
        .filter((f) => !f.isDir && TEXT_EXTENSIONS.includes(getFileExtension(f.name)))
        .map((f) => f.path)
        .slice(0, 50)
    );
  }, [backend]);

  /* ------------------------------------------------------------ keyboard */

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // Bound at the window, so the shortcuts survive focus leaving the page —
      // but only the frontmost editor window may act on them.
      if (useWindowStore.getState().activeWindowId !== windowId) return;
      const key = e.key.toLowerCase();
      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (key === 'f') return stop(), setFindOpen(true), window.setTimeout(() => findInputRef.current?.focus(), 0);
      if (key === 'h' && e.shiftKey) return stop(), setFindOpen(true), window.setTimeout(() => findInputRef.current?.focus(), 0);
      if (key === 's') return stop(), e.shiftKey ? saveAs() : save();
      if (key === 'o') return stop(), void showOpenDialog();
      if (key === 'n') return stop(), newDocument();
      if (key === 'p') return stop(), window.print();
      if (mode === 'rich') {
        if (key === 'b') return stop(), exec('bold');
        if (key === 'i') return stop(), exec('italic');
        if (key === 'u') return stop(), exec('underline');
        if (key === 'z') return stop(), exec(e.shiftKey ? 'redo' : 'undo');
      } else if (key === 'z') {
        return stop(), stepHistory(e.shiftKey ? 1 : -1);
      }
    },
    [mode, save, saveAs, showOpenDialog, newDocument, exec, windowId]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onKeyDown]);

  // The menu bar's File items drive the same actions.
  useEffect(() => {
    const onCommand = (e: Event) => {
      switch ((e as CustomEvent<string>).detail) {
        case 'new': return newDocument();
        case 'open': return void showOpenDialog();
        case 'save': return save();
        case 'saveAs': return saveAs();
      }
    };
    window.addEventListener('text-editor-command', onCommand as EventListener);
    return () => window.removeEventListener('text-editor-command', onCommand as EventListener);
  }, [newDocument, showOpenDialog, save, saveAs]);

  /* --------------------------------------------------------------- render */

  const toolbarButton = (
    label: string,
    icon: string | null,
    onClick: () => void,
    title: string,
    active = false
  ) => (
    <button
      key={title}
      className={`text-editor__btn ${active ? 'is-selected' : ''}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon ? <Icon name={icon} size={15} /> : <span className="text-editor__btn-label">{label}</span>}
    </button>
  );

  const pageStyle = { fontFamily: fontStack, fontSize, lineHeight };

  return (
    <div className="text-editor">
      <div className="text-editor__toolbar">
        {toolbarButton('', 'file', newDocument, 'New (⌘N)')}
        {toolbarButton('', 'folder', () => void showOpenDialog(), 'Open (⌘O)')}
        {toolbarButton('', 'save', save, 'Save (⌘S)')}
        <div className="text-editor__separator" />

        <div className="text-editor__modes">
          <button
            className={`text-editor__btn ${mode === 'rich' ? 'is-selected' : ''}`}
            onClick={() => switchMode('rich')}
            title="Rich text"
          >
            <span className="text-editor__btn-label">Rich</span>
          </button>
          <button
            className={`text-editor__btn ${mode === 'plain' ? 'is-selected' : ''}`}
            onClick={() => switchMode('plain')}
            title="Plain text"
          >
            <span className="text-editor__btn-label">Plain</span>
          </button>
        </div>

        {mode === 'rich' && (
          <>
            <div className="text-editor__separator" />
            {toolbarButton('B', null, () => exec('bold'), 'Bold (⌘B)')}
            {toolbarButton('I', null, () => exec('italic'), 'Italic (⌘I)')}
            {toolbarButton('U', null, () => exec('underline'), 'Underline (⌘U)')}
            {toolbarButton('S', null, () => exec('strikeThrough'), 'Strikethrough')}
            <div className="text-editor__separator" />
            {toolbarButton('H1', null, () => exec('formatBlock', '<h1>'), 'Heading 1')}
            {toolbarButton('H2', null, () => exec('formatBlock', '<h2>'), 'Heading 2')}
            {toolbarButton('H3', null, () => exec('formatBlock', '<h3>'), 'Heading 3')}
            {toolbarButton('¶', null, () => exec('formatBlock', '<p>'), 'Body text')}
            <div className="text-editor__separator" />
            {toolbarButton('', 'list', () => exec('insertUnorderedList'), 'Bulleted list')}
            {toolbarButton('1.', null, () => exec('insertOrderedList'), 'Numbered list')}
            {toolbarButton('❝', null, () => exec('formatBlock', '<blockquote>'), 'Blockquote')}
            <div className="text-editor__separator" />
            {toolbarButton('', 'align-left', () => exec('justifyLeft'), 'Align left')}
            {toolbarButton('≡', null, () => exec('justifyCenter'), 'Align centre')}
            {toolbarButton('≢', null, () => exec('justifyRight'), 'Align right')}
            {toolbarButton(
              '',
              'globe',
              () => {
                rememberSelection();
                setDialog({ kind: 'link', value: 'https://' });
              },
              'Add link'
            )}
          </>
        )}

        <div className="text-editor__separator" />
        <select
          className="text-editor__select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value as FontFamilyId)}
          title="Font"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button className="text-editor__btn" onClick={() => setFontSize(fontSize - 1)} title="Smaller">
          <Icon name="minus" size={13} />
        </button>
        <span className="text-editor__font-size">{fontSize}px</span>
        <button className="text-editor__btn" onClick={() => setFontSize(fontSize + 1)} title="Larger">
          <Icon name="plus" size={13} />
        </button>
        <select
          className="text-editor__select"
          value={String(lineHeight)}
          onChange={(e) => setLineHeight(Number(e.target.value))}
          title="Line spacing"
        >
          <option value="1.2">Tight</option>
          <option value="1.6">Normal</option>
          <option value="2">Loose</option>
        </select>

        <div className="text-editor__separator" />
        {toolbarButton('', 'align-left', () => setWrapToPage(!wrapToPage), wrapToPage ? 'Wrap to window' : 'Wrap to page', wrapToPage)}
        {toolbarButton('', 'printer', () => window.print(), 'Print (⌘P)')}

        <div className="text-editor__file-name">
          {dirty && <span className="text-editor__modified" title="Unsaved changes">●</span>}
          {fileName}
        </div>
      </div>

      {findOpen && (
        <div className="text-editor__find">
          <Icon name="search" size={13} />
          <input
            ref={findInputRef}
            className="text-editor__find-input"
            placeholder="Find"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMatchIndex(0);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
              if (e.key === 'Escape') setFindOpen(false);
            }}
          />
          <span className="text-editor__find-count">
            {matchTotal ? `${matchIndex + 1} of ${matchTotal}` : query ? 'No results' : ''}
          </span>
          <button className="text-editor__btn" onClick={() => step(-1)} title="Previous match">
            <Icon name="chevron-up" size={13} />
          </button>
          <button className="text-editor__btn" onClick={() => step(1)} title="Next match">
            <Icon name="chevron-down" size={13} />
          </button>
          <button
            className={`text-editor__btn ${caseSensitive ? 'is-selected' : ''}`}
            onClick={() => {
              setCaseSensitive((on) => !on);
              setMatchIndex(0);
            }}
            title="Match case"
          >
            <span className="text-editor__btn-label">Aa</span>
          </button>
          <input
            className="text-editor__find-input"
            placeholder="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button className="text-editor__btn" onClick={replaceOne} title="Replace">
            <span className="text-editor__btn-label">Replace</span>
          </button>
          <button className="text-editor__btn" onClick={replaceAll} title="Replace all">
            <span className="text-editor__btn-label">All</span>
          </button>
          <button className="text-editor__btn" onClick={() => setFindOpen(false)} title="Close find">
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      <div className="text-editor__surface">
        <div
          className={`text-editor__page ${wrapToPage ? '' : 'text-editor__page--full'}`}
          style={pageStyle}
        >
          <div
            ref={richRef}
            className="text-editor__rich"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            hidden={mode !== 'rich'}
            onInput={() => {
              markDirty();
              refreshStats();
              setDocVersion((v) => v + 1);
            }}
          />
          {mode === 'plain' && (
            <textarea
              ref={plainRef}
              className="text-editor__plain"
              value={plainText}
              placeholder="Start typing..."
              spellCheck
              onChange={(e) => {
                setPlainText(e.target.value);
                markDirty(e.target.value);
                pushHistory(e.target.value);
              }}
            />
          )}
          {mode === 'plain' && !plainText && recents.length > 0 && (
            <div className="text-editor__recents">
              <div className="text-editor__recents-title">Recent Documents</div>
              {recents.slice(0, RECENTS_LIMIT).map((r) => (
                <button key={r.path} className="pcl-bare text-editor__recent" onClick={() => void openPath(r.path)}>
                  {r.name}
                  <span className="text-editor__recent-path">{r.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-editor__statusbar">
        <span>{stats.words} words</span>
        <span>{stats.chars} characters</span>
        <span>{stats.lines} lines</span>
        {status && <span className="text-editor__status-msg">{status}</span>}
        {path && <span className="text-editor__path">{path}</span>}
      </div>

      {dialog && (
        <div className="text-editor__dialog-backdrop" onClick={() => setDialog(null)}>
          <div className="text-editor__dialog" onClick={(e) => e.stopPropagation()}>
            {dialog.kind === 'saveAs' && (
              <>
                <div className="text-editor__dialog-title">Save As</div>
                <input
                  className="text-editor__dialog-input"
                  value={dialog.value}
                  autoFocus
                  onChange={(e) => setDialog({ kind: 'saveAs', value: e.target.value })}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      const target = dialog.value;
                      setDialog(null);
                      void writeTo(target);
                    }
                  }}
                />
                <div className="text-editor__dialog-actions">
                  <button onClick={() => setDialog(null)}>Cancel</button>
                  <button
                    className="is-primary"
                    onClick={() => {
                      const target = dialog.value;
                      setDialog(null);
                      void writeTo(target);
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            )}

            {dialog.kind === 'link' && (
              <>
                <div className="text-editor__dialog-title">Link URL</div>
                <input
                  className="text-editor__dialog-input"
                  value={dialog.value}
                  autoFocus
                  onChange={(e) => setDialog({ kind: 'link', value: e.target.value })}
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <div className="text-editor__dialog-actions">
                  <button onClick={() => setDialog(null)}>Cancel</button>
                  <button
                    className="is-primary"
                    onClick={() => {
                      const url = dialog.value;
                      setDialog(null);
                      exec('createLink', url);
                    }}
                  >
                    Add Link
                  </button>
                </div>
              </>
            )}

            {dialog.kind === 'open' && (
              <>
                <div className="text-editor__dialog-title">Open</div>
                <div className="text-editor__open-list">
                  {openList.length === 0 && <div className="text-editor__open-empty">No text documents found</div>}
                  {openList.map((p) => (
                    <button
                      key={p}
                      className="pcl-bare text-editor__open-item"
                      onClick={() => {
                        setDialog(null);
                        void openPath(p);
                      }}
                    >
                      {basename(p)}
                      <span className="text-editor__recent-path">{p}</span>
                    </button>
                  ))}
                </div>
                <div className="text-editor__dialog-actions">
                  <button onClick={() => setDialog(null)}>Cancel</button>
                </div>
              </>
            )}

            {dialog.kind === 'confirm' && (
              <>
                <div className="text-editor__dialog-title">{dialog.message}</div>
                <div className="text-editor__dialog-actions">
                  <button onClick={() => setDialog(null)}>Cancel</button>
                  <button
                    className="is-primary"
                    onClick={() => {
                      const act = dialog.onConfirm;
                      setDialog(null);
                      act();
                    }}
                  >
                    {dialog.confirmLabel}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextEditor;
