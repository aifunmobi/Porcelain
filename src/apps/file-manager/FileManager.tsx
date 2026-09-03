import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useDragStore } from '../../stores/dragStore';
import { useTrashStore } from '../../stores/trashStore';
import { useFileBrowserStore } from '../../stores/fileBrowserStore';
import type { ClipboardEntry, SortState } from '../../stores/fileBrowserStore';
import { Icon } from '../../components/Icons';
import type { AppProps, SortBy, ViewMode } from '../../types';
import { formatFileSize, getFileIcon, isImageFile, getFileExtension } from '../../services/tauriFs';
import { useWindowStore } from '../../stores/windowStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { getBackend, basename, kindOf } from '../../services/fsAdapter';
import type { FsBackend, FsItem } from '../../services/fsAdapter';
import './FileManager.css';

/* ---------------------------------------------------------------- helpers */

const sortItems = (items: FsItem[], { by, order }: SortState): FsItem[] => {
  const dir = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    // Folders keep to the top whichever way the column points.
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    let cmp = 0;
    if (by === 'name') cmp = a.name.localeCompare(b.name);
    else if (by === 'date') cmp = (a.modifiedAt?.getTime() ?? 0) - (b.modifiedAt?.getTime() ?? 0);
    else if (by === 'size') cmp = a.size - b.size; // numeric, never string
    else cmp = kindOf(a).localeCompare(kindOf(b)) || a.name.localeCompare(b.name);
    return cmp * dir;
  });
};

/** Every folder from the browsing root down to `path`, for columns + breadcrumb. */
const chainFor = (backend: FsBackend, path: string): string[] => {
  // Whole-segment match only: home /Users/bob must not claim /Users/bobby.
  const underHome = path === backend.home || path.startsWith(`${backend.home}/`);
  const base = backend.home !== '/' && underHome ? backend.home : '/';
  const chain = [base];
  let current = base;
  for (const segment of path.slice(base.length).split('/').filter(Boolean)) {
    current = backend.join(current, segment);
    chain.push(current);
  }
  return chain;
};

const formatDate = (date?: Date) =>
  date
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    : '--';

const iconFor = (item: FsItem) => getFileIcon(item.name, item.isDir);

const toClipboardEntry = (item: FsItem): ClipboardEntry => ({
  name: item.name,
  path: item.path,
  isDir: item.isDir,
});

/** Opened in the Text Editor rather than handed to the OS. */
const EDITABLE_TEXT = ['txt', 'md', 'html', 'json', 'js', 'ts', 'tsx', 'css', 'xml', 'yaml', 'yml'];

/** Preview owns single-document viewing; Photos still owns the photo library. */
const PREVIEWABLE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'pdf'];

/** Opening one of these hands it to a specific app rather than to the OS. */
const openWith = async (appId: string, props: Record<string, unknown>) => {
  // The registry imports this component, so pull it in lazily to keep the
  // module graph acyclic.
  const { appRegistry } = await import('../registry');
  const app = appRegistry[appId];
  if (app) useWindowStore.getState().openWindow(app, props);
};

const COLUMNS: { by: SortBy; label: string; className: string }[] = [
  { by: 'name', label: 'Name', className: 'name' },
  { by: 'date', label: 'Date Modified', className: 'date' },
  { by: 'size', label: 'Size', className: 'size' },
  { by: 'type', label: 'Kind', className: 'kind' },
];

/* -------------------------------------------------------------- component */

export const FileManager: React.FC<AppProps> = ({ windowId }) => {
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [path, setPath] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dirCache, setDirCache] = useState<Record<string, FsItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A failed action, shown in the status bar; the listing stays put. */
  const [notice, setNotice] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');
  const [searchHere, setSearchHere] = useState(false);
  const [deepHits, setDeepHits] = useState<FsItem[] | null>(null);
  const [info, setInfo] = useState<{ item: FsItem; size: number; created?: Date } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FsItem | null } | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const {
    viewMode,
    setViewMode,
    collapsed,
    toggleSection,
    sort,
    cycleSort,
    clipboard,
    setClipboard,
    clearClipboard,
  } = useFileBrowserStore();
  const { startDrag, isDragging, dragData, endDrag } = useDragStore();
  const recordTrashed = useTrashStore((state) => state.recordTrashed);

  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef<Set<string>>(new Set());
  const marqueeDragged = useRef(false);
  /** Enter/Escape already settled the rename; the blur that follows must not. */
  const renameSettled = useRef(false);

  /**
   * The context menu and marquee are `position: fixed`, but the window they
   * live in is moved with a CSS transform, which makes it their containing
   * block. Viewport coordinates therefore have to be shifted into the
   * window's own space or everything lands offset by the window's position.
   */
  const toLocal = useCallback((x: number, y: number) => {
    const host = rootRef.current?.closest('[data-window-id]') ?? rootRef.current;
    const rect = host?.getBoundingClientRect();
    return rect ? { x: x - rect.left, y: y - rect.top } : { x, y };
  }, []);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Keep the context menu inside the window. It opens down and to the right of
   * the pointer, so near an edge it used to run under the window's border and
   * get clipped — the last items were simply unreachable.
   */
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const host = rootRef.current;
    if (!contextMenu || !menu || !host) return;
    const size = menu.getBoundingClientRect();
    const bounds = host.getBoundingClientRect();
    const gap = 4;
    // Shift by however much it overflows, rather than assigning viewport
    // coordinates: the menu is fixed inside a transformed window, so its
    // left/top resolve against that transform, not the viewport.
    const dx = Math.min(0, bounds.right - gap - size.right);
    const dy = Math.min(0, bounds.bottom - gap - size.bottom);
    if (dx || dy) {
      menu.style.left = `${contextMenu.x + dx}px`;
      menu.style.top = `${contextMenu.y + dy}px`;
    }
  }, [contextMenu]);
  const typeAhead = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const sortState: SortState = useMemo(() => sort[path] ?? { by: 'name', order: 'asc' }, [sort, path]);

  /* ------------------------------------------------------------- loading */

  useEffect(() => {
    let cancelled = false;
    getBackend().then((created) => {
      if (cancelled) return;
      setBackend(created);
      setPath(created.home);
      setHistory([created.home]);
      setHistoryIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDir = useCallback(
    async (target: string) => {
      if (!backend || inFlight.current.has(target)) return;
      inFlight.current.add(target);
      try {
        const listed = await backend.list(target);
        setDirCache((cache) => ({ ...cache, [target]: listed }));
        if (target === path) setError(null);
      } catch {
        if (target === path) setError('Unable to read this directory');
        setDirCache((cache) => ({ ...cache, [target]: [] }));
      } finally {
        inFlight.current.delete(target);
      }
    },
    [backend, path]
  );

  const chain = useMemo(() => (backend && path ? chainFor(backend, path) : []), [backend, path]);

  // Columns need every ancestor listed; the flat views only need the current folder.
  const needed = useMemo(
    () => (viewMode === 'columns' ? chain : path ? [path] : []),
    [viewMode, chain, path]
  );

  useEffect(() => {
    needed.forEach((target) => {
      if (!(target in dirCache)) void loadDir(target);
    });
  }, [needed, dirCache, loadDir]);

  useEffect(() => {
    setLoading(!!path && !(path in dirCache));
  }, [path, dirCache]);

  const refresh = useCallback(() => {
    setDirCache({});
    setInfo(null);
  }, []);

  // Other apps write to the same filesystem (Trash puts files back, the
  // editor saves, Screenshot drops PNGs into Pictures). In browser mode the
  // store announces every change; on the real filesystem the listing is
  // re-read whenever this window comes to the front.
  useEffect(() => useFileSystemStore.subscribe(refresh), [refresh]);
  const isFront = useWindowStore((s) => s.activeWindowId === windowId);
  useEffect(() => {
    if (isFront && backend?.isReal) refresh();
  }, [isFront, backend, refresh]);

  const items = useMemo(() => dirCache[path] ?? [], [dirCache, path]);

  /* -------------------------------------------------------------- search */

  useEffect(() => {
    if (!backend || !search || !searchHere) {
      setDeepHits(null);
      return;
    }
    let cancelled = false;
    void backend.searchDeep(path, search).then((hits) => {
      if (!cancelled) setDeepHits(hits);
    });
    return () => {
      cancelled = true;
    };
  }, [backend, path, search, searchHere]);

  const visible = useMemo(() => {
    if (search) {
      const source =
        searchHere && deepHits
          ? deepHits
          : items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
      return sortItems(source, sortState);
    }
    return sortItems(items, sortState);
  }, [items, search, searchHere, deepHits, sortState]);

  /* ---------------------------------------------------------- navigation */

  const navigate = useCallback(
    (target: string) => {
      setHistory((past) => [...past.slice(0, historyIndex + 1), target]);
      setHistoryIndex((index) => index + 1);
      setPath(target);
      setSelected(new Set());
      setAnchor(null);
      setSearch('');
      setInfo(null);
    },
    [historyIndex]
  );

  const canBack = historyIndex > 0;
  const canForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (!canBack) return;
    setHistoryIndex(historyIndex - 1);
    setPath(history[historyIndex - 1]);
    setSelected(new Set());
  }, [canBack, history, historyIndex]);

  const goForward = useCallback(() => {
    if (!canForward) return;
    setHistoryIndex(historyIndex + 1);
    setPath(history[historyIndex + 1]);
    setSelected(new Set());
  }, [canForward, history, historyIndex]);

  const goParent = useCallback(() => {
    if (backend && path && path !== '/') navigate(backend.parent(path));
  }, [backend, path, navigate]);

  const open = useCallback(
    (item: FsItem) => {
      if (item.isDir) return navigate(item.path);
      const ext = getFileExtension(item.name);
      if (PREVIEWABLE.includes(ext)) return void openWith('preview', { filePath: item.path });
      if (ext === 'zip') return void openWith('archive', { archivePath: item.path });
      if (EDITABLE_TEXT.includes(ext)) return void openWith('text-editor', { filePath: item.path });
      void backend?.open(item).catch(() => setNotice('Unable to open this file'));
    },
    [backend, navigate]
  );

  /* --------------------------------------------------------- select­ion */

  const selectOnly = useCallback((item: FsItem) => {
    setSelected(new Set([item.id]));
    setAnchor(item.id);
  }, []);

  const handleItemClick = useCallback(
    (item: FsItem, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
        setAnchor(item.id);
      } else if (e.shiftKey && anchor) {
        const ids = visible.map((entry) => entry.id);
        const from = ids.indexOf(anchor);
        const to = ids.indexOf(item.id);
        if (from !== -1 && to !== -1) {
          setSelected(new Set(ids.slice(Math.min(from, to), Math.max(from, to) + 1)));
        }
      } else {
        selectOnly(item);
      }
    },
    [anchor, visible, selectOnly]
  );

  const clearSelection = useCallback(() => {
    // Ending a marquee drag also fires a click on the surface; that click must
    // not wipe the selection the drag just made.
    if (marqueeDragged.current) {
      marqueeDragged.current = false;
      return;
    }
    setSelected(new Set());
    setContextMenu(null);
  }, []);

  const selectedItems = useMemo(
    () => visible.filter((item) => selected.has(item.id)),
    [visible, selected]
  );
  const primary = selectedItems[0] ?? null;

  /* ----------------------------------------------------------- mutations */

  const run = useCallback(
    async (action: () => Promise<void>, failure: string) => {
      try {
        await action();
        refresh();
      } catch (err) {
        console.error(failure, err);
        // Say what failed, but keep the listing: the folder is still there.
        // Tauri rejects with plain strings, so those are shown too.
        const text = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
        const detail = text ? `: ${text}` : '';
        setNotice(`${failure}${detail}`);
        refresh();
      }
    },
    [refresh]
  );

  const newFolder = useCallback(() => {
    if (backend) void run(() => backend.mkdir(path, 'New Folder'), 'Failed to create the folder');
  }, [backend, path, run]);

  const startRename = useCallback((item: FsItem) => {
    setRenaming(item.id);
    setRenameValue(item.name);
    setContextMenu(null);
  }, []);

  const commitRename = useCallback(() => {
    const item = visible.find((entry) => entry.id === renaming);
    const name = renameValue.trim();
    if (backend && item && name && name !== item.name) {
      void run(() => backend.rename(item, name), 'Failed to rename the item');
    }
    setRenaming(null);
    setRenameValue('');
  }, [backend, visible, renaming, renameValue, run]);

  const duplicate = useCallback(() => {
    if (!backend || !selectedItems.length) return;
    void run(async () => {
      for (const item of selectedItems) await backend.duplicate(item);
    }, 'Failed to duplicate');
  }, [backend, selectedItems, run]);

  const trashSelection = useCallback(() => {
    if (!backend || !selectedItems.length) return;
    void run(async () => {
      for (const item of selectedItems) {
        const trashedPath = await backend.trash(item);
        // The folder is the trash; this just remembers where it came from.
        recordTrashed(trashedPath, item.path);
      }
      setSelected(new Set());
    }, 'Failed to move to Trash');
  }, [backend, selectedItems, run, recordTrashed]);

  const copySelection = useCallback(
    (mode: 'copy' | 'cut') => {
      if (selectedItems.length) setClipboard(mode, selectedItems.map(toClipboardEntry));
    },
    [selectedItems, setClipboard]
  );

  const paste = useCallback(
    (destination = path) => {
      if (!backend || !clipboard) return;
      void run(async () => {
        for (const entry of clipboard.entries) {
          // Cutting and pasting back into the same folder is a no-op, not a
          // rename to "X copy".
          if (clipboard.mode === 'cut' && backend.parent(entry.path) === destination) continue;
          if (clipboard.mode === 'cut') await backend.moveInto(entry.path, destination);
          else await backend.copyInto(entry.path, destination);
        }
        if (clipboard.mode === 'cut') clearClipboard();
      }, 'Failed to paste');
    },
    [backend, clipboard, path, run, clearClipboard]
  );

  const showInfo = useCallback(() => {
    if (!backend || !primary) return;
    void Promise.all([backend.dirSize(primary), backend.createdAt(primary)]).then(
      ([size, created]) => setInfo({ item: primary, size, created })
    );
  }, [backend, primary]);

  /* ------------------------------------------------------------ keyboard */

  const gridColumns = useCallback(() => {
    const el = gridRef.current;
    if (!el) return 1;
    return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
  }, []);

  const moveSelection = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      const index = primary ? visible.findIndex((item) => item.id === primary.id) : -1;
      const next = Math.max(0, Math.min(visible.length - 1, index === -1 ? 0 : index + delta));
      selectOnly(visible[next]);
    },
    [visible, primary, selectOnly]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (renaming) return; // the rename input owns the keyboard
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key;
      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };

      if (meta) {
        if (key === '1') return stop(), setViewMode('grid');
        if (key === '2') return stop(), setViewMode('list');
        if (key === '3') return stop(), setViewMode('columns');
        if (key.toLowerCase() === 'i') return stop(), showInfo();
        if (key.toLowerCase() === 'n' && e.shiftKey) return stop(), newFolder();
        if (key.toLowerCase() === 'd') return stop(), duplicate();
        if (key.toLowerCase() === 'c') return stop(), copySelection('copy');
        if (key.toLowerCase() === 'x') return stop(), copySelection('cut');
        if (key.toLowerCase() === 'v') return stop(), paste();
        if (key.toLowerCase() === 'a') return stop(), setSelected(new Set(visible.map((i) => i.id)));
        if (key === 'Backspace' || key === 'Delete') return stop(), trashSelection();
        if (key === 'ArrowUp') return stop(), goParent();
        if (key === '[') return stop(), goBack();
        if (key === ']') return stop(), goForward();
        return;
      }

      if (key === 'ArrowUp') return stop(), moveSelection(viewMode === 'grid' ? -gridColumns() : -1);
      if (key === 'ArrowDown') return stop(), moveSelection(viewMode === 'grid' ? gridColumns() : 1);
      if (key === 'ArrowLeft') return stop(), moveSelection(-1);
      if (key === 'ArrowRight') return stop(), moveSelection(1);
      if (key === 'Enter') {
        if (primary) {
          stop();
          open(primary);
        }
        return;
      }
      if (key === 'F2') {
        if (primary) {
          stop();
          startRename(primary);
        }
        return;
      }
      if (key === 'Escape') return setSelected(new Set());

      // Type-ahead: consecutive letters build a prefix, a pause resets it.
      if (key.length === 1 && !e.altKey) {
        const now = Date.now();
        const buffer = now - typeAhead.current.at < 800 ? typeAhead.current.text + key : key;
        typeAhead.current = { text: buffer, at: now };
        const match = visible.find((item) => item.name.toLowerCase().startsWith(buffer.toLowerCase()));
        if (match) {
          stop();
          selectOnly(match);
        }
      }
    },
    [
      renaming,
      viewMode,
      visible,
      primary,
      setViewMode,
      showInfo,
      newFolder,
      duplicate,
      copySelection,
      paste,
      trashSelection,
      goParent,
      goBack,
      goForward,
      moveSelection,
      gridColumns,
      open,
      startRename,
      selectOnly,
    ]
  );

  /* ------------------------------------------------------------ dragging */

  const [pendingDrag, setPendingDrag] = useState<{ item: FsItem; x: number; y: number } | null>(null);
  const isDropTarget = isDragging && dragData?.source === 'desktop';

  const handleItemPointerDown = useCallback((e: React.PointerEvent, item: FsItem) => {
    if (e.button !== 0 || (e.target as HTMLElement).tagName === 'INPUT') return;
    e.stopPropagation();
    setPendingDrag({ item, x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!pendingDrag) return;
    const onMove = (e: PointerEvent) => {
      if (isDragging) return;
      if (Math.abs(e.clientX - pendingDrag.x) > 5 || Math.abs(e.clientY - pendingDrag.y) > 5) {
        startDrag(
          {
            name: pendingDrag.item.name,
            path: pendingDrag.item.path,
            isDirectory: pendingDrag.item.isDir,
            source: 'file-manager' as const,
          },
          { x: e.clientX, y: e.clientY }
        );
        setPendingDrag(null);
      }
    };
    const onUp = () => setPendingDrag(null);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [pendingDrag, isDragging, startDrag]);

  /** Copy in whatever the desktop just dropped on us. */
  const acceptDesktopDrop = useCallback(
    (sourcePath: string, destination = path) => {
      if (!backend || !sourcePath) return;
      void run(() => backend.copyInto(sourcePath, destination), 'Failed to copy the item');
    },
    [backend, path, run]
  );

  // DragOverlay clears the drag in a document capture listener, which runs before
  // this bubble handler — so keep the last drag payload to read on drop.
  const lastDrag = useRef(dragData);
  if (dragData) lastDrag.current = dragData;

  /* This per-window pointerup is the ONE path that accepts a desktop drop.
   * DragOverlay also broadcasts `porcelain-drop-to-filemanager`, but listening to
   * that as well copied the item twice, and being global it would have made every
   * open Files window copy it. Landing on a window is what picks the target. */
  const handleRootPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDropTarget || !lastDrag.current) return;
      e.stopPropagation();
      const source = lastDrag.current.path;
      lastDrag.current = null;
      endDrag();
      acceptDesktopDrop(source);
    },
    [isDropTarget, endDrag, acceptDesktopDrop]
  );

  /** A breadcrumb segment is a drop target: dropping there moves the item in. */
  const handleCrumbPointerUp = useCallback(
    (e: React.PointerEvent, target: string) => {
      if (!isDragging || !dragData || !backend) return;
      e.stopPropagation();
      const source = dragData.path;
      const fromDesktop = dragData.source === 'desktop';
      endDrag();
      if (!source || backend.parent(source) === target) return;
      void run(
        () => (fromDesktop ? backend.copyInto(source, target) : backend.moveInto(source, target)),
        'Failed to move the item'
      );
    },
    [isDragging, dragData, backend, endDrag, run]
  );

  /* ------------------------------------------------------------- marquee */

  const handleSurfacePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (viewMode !== 'grid' || e.button !== 0) return;
      if (e.target !== e.currentTarget) return; // only from empty space
      const start = { x: e.clientX, y: e.clientY };
      setMarquee({ x0: start.x, y0: start.y, x1: start.x, y1: start.y });

      const onMove = (move: PointerEvent) => {
        marqueeDragged.current = true;
        setMarquee({ x0: start.x, y0: start.y, x1: move.clientX, y1: move.clientY });
        const box = {
          left: Math.min(start.x, move.clientX),
          right: Math.max(start.x, move.clientX),
          top: Math.min(start.y, move.clientY),
          bottom: Math.max(start.y, move.clientY),
        };
        const hits = new Set<string>();
        gridRef.current?.querySelectorAll('[data-item-id]').forEach((node) => {
          const rect = node.getBoundingClientRect();
          const overlaps =
            rect.right >= box.left &&
            rect.left <= box.right &&
            rect.bottom >= box.top &&
            rect.top <= box.bottom;
          if (overlaps) hits.add((node as HTMLElement).dataset.itemId!);
        });
        setSelected(hits);
      };
      const onUp = () => {
        setMarquee(null);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        // The click that follows this pointerup may land outside the grid, in
        // which case clearSelection never runs to reset the flag.
        window.setTimeout(() => {
          marqueeDragged.current = false;
        }, 0);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [viewMode]
  );

  /* --------------------------------------------------------------- views */

  const renderName = (item: FsItem) =>
    renaming === item.id ? (
      <input
        className="file-manager__rename-input"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        // Unmounting the focused input fires blur, so Enter and Escape must
        // settle the rename before that blur can commit (or re-commit) it.
        onBlur={() => {
          if (!renameSettled.current) commitRename();
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            renameSettled.current = true;
            commitRename();
          }
          if (e.key === 'Escape') {
            renameSettled.current = true;
            setRenaming(null);
            setRenameValue('');
          }
        }}
        onFocus={() => {
          renameSettled.current = false;
        }}
        autoFocus
      />
    ) : (
      <span title={item.name}>{item.name}</span>
    );

  const itemProps = (item: FsItem) => ({
    'data-item-id': item.id,
    className: selected.has(item.id) ? 'selected' : '',
    onClick: (e: React.MouseEvent) => handleItemClick(item, e),
    onDoubleClick: () => open(item),
    onPointerDown: (e: React.PointerEvent) => handleItemPointerDown(e, item),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectOnly(item);
      setContextMenu({ ...toLocal(e.clientX, e.clientY), item });
    },
  });

  const thumbFor = (item: FsItem) => backend?.thumb(item);

  const iconView = (
    <div
      className="file-manager__grid"
      ref={gridRef}
      onPointerDown={handleSurfacePointerDown}
      onClick={clearSelection}
    >
      {visible.map((item) => {
        const { className, ...rest } = itemProps(item);
        const thumb = thumbFor(item);
        return (
          <div key={item.id} className={`file-manager__grid-item ${className}`} {...rest}>
            <div className="file-manager__grid-icon">
              {thumb ? (
                <img src={thumb} alt={item.name} className="file-manager__thumbnail" />
              ) : (
                <Icon name={iconFor(item)} size={40} color="var(--color-porcelain-500)" />
              )}
            </div>
            <span className="file-manager__grid-name">{renderName(item)}</span>
          </div>
        );
      })}
    </div>
  );

  const listView = (
    <div className="file-manager__list" onClick={clearSelection}>
      <div className="file-manager__list-header">
        {COLUMNS.map((column) => (
          <button
            key={column.by}
            className={`pcl-bare file-manager__list-col file-manager__list-col--${column.className} file-manager__sort-btn`}
            onClick={(e) => {
              e.stopPropagation();
              cycleSort(path, column.by);
            }}
          >
            {column.label}
            {sortState.by === column.by && (
              <Icon name={sortState.order === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
            )}
          </button>
        ))}
      </div>
      {visible.map((item) => {
        const { className, ...rest } = itemProps(item);
        const thumb = thumbFor(item);
        return (
          <div key={item.id} className={`file-manager__list-item ${className}`} {...rest}>
            <span className="file-manager__list-col file-manager__list-col--name">
              {thumb ? (
                <img src={thumb} alt={item.name} className="file-manager__list-thumbnail" />
              ) : (
                <Icon name={iconFor(item)} size={16} color="var(--color-porcelain-500)" />
              )}
              {renderName(item)}
            </span>
            <span className="file-manager__list-col file-manager__list-col--date">
              {formatDate(item.modifiedAt)}
            </span>
            <span className="file-manager__list-col file-manager__list-col--size">
              {item.isDir ? '--' : formatFileSize(item.size)}
            </span>
            <span className="file-manager__list-col file-manager__list-col--kind">{kindOf(item)}</span>
          </div>
        );
      })}
    </div>
  );

  const columnView = (
    <div className="file-manager__columns" onClick={clearSelection}>
      {chain.map((level, index) => {
        const entries = sortItems(dirCache[level] ?? [], sortState);
        const nextPath = chain[index + 1];
        return (
          <div key={level} className="file-manager__column">
            {entries.map((item) => {
              const isOnPath = item.path === nextPath;
              const { className, ...rest } = itemProps(item);
              return (
                <div
                  key={item.id}
                  className={`file-manager__column-item ${className} ${isOnPath ? 'on-path' : ''}`}
                  {...rest}
                >
                  <Icon name={iconFor(item)} size={16} color="var(--color-porcelain-500)" />
                  {renderName(item)}
                  {item.isDir && <Icon name="chevron-right" size={12} />}
                </div>
              );
            })}
          </div>
        );
      })}
      {primary && (
        <div className="file-manager__column-preview">
          {thumbFor(primary) ? (
            <img src={thumbFor(primary)} alt={primary.name} className="file-manager__preview-image" />
          ) : (
            <Icon name={iconFor(primary)} size={64} color="var(--color-porcelain-400)" />
          )}
          <div className="file-manager__preview-name">{primary.name}</div>
          <div className="file-manager__preview-meta">{kindOf(primary)}</div>
          {!primary.isDir && (
            <div className="file-manager__preview-meta">{formatFileSize(primary.size)}</div>
          )}
          <div className="file-manager__preview-meta">{formatDate(primary.modifiedAt)}</div>
        </div>
      )}
    </div>
  );

  const sidebarSection = (id: string, title: string, entries: FsBackend['favorites']) => (
    <div className="file-manager__sidebar-section">
      <button className="pcl-bare file-manager__sidebar-title" onClick={() => toggleSection(id)}>
        <Icon name={collapsed[id] ? 'chevron-right' : 'chevron-down'} size={10} />
        {title}
      </button>
      {!collapsed[id] &&
        entries.map((entry) => (
          <div
            key={entry.id}
            className={`file-manager__sidebar-item ${path === entry.path ? 'active' : ''}`}
            onClick={() => navigate(entry.path)}
          >
            <Icon name={entry.icon} size={16} />
            <span>{entry.name}</span>
          </div>
        ))}
    </div>
  );

  const selectionSize = selectedItems.reduce((sum, item) => sum + (item.isDir ? 0 : item.size), 0);

  /* -------------------------------------------------------------- render */

  return (
    <div
      className={`file-manager ${isDropTarget ? 'file-manager--drop-target' : ''}`}
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerUp={handleRootPointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ ...toLocal(e.clientX, e.clientY), item: null });
      }}
    >
      <div className="file-manager__toolbar">
        <div className="file-manager__nav-buttons">
          <button className="file-manager__nav-btn" onClick={goBack} disabled={!canBack} title="Back (⌘[)">
            <Icon name="chevron-left" size={16} />
          </button>
          <button
            className="file-manager__nav-btn"
            onClick={goForward}
            disabled={!canForward}
            title="Forward (⌘])"
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <button
            className="file-manager__nav-btn"
            onClick={goParent}
            disabled={!path || path === '/'}
            title="Enclosing folder (⌘↑)"
          >
            <Icon name="chevron-up" size={16} />
          </button>
        </div>

        <div className="file-manager__breadcrumb">
          {chain.map((crumb, index) => (
            <React.Fragment key={crumb}>
              {index > 0 && <span className="file-manager__breadcrumb-sep">/</span>}
              <span
                className={`file-manager__breadcrumb-item ${crumb === path ? 'current' : ''}`}
                onClick={() => navigate(crumb)}
                onPointerUp={(e) => handleCrumbPointerUp(e, crumb)}
              >
                {index === 0 ? (backend?.home === crumb ? 'Home' : 'Computer') : basename(crumb)}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="file-manager__search">
          <Icon name="search" size={14} color="var(--color-porcelain-400)" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button
            className={`file-manager__search-scope ${searchHere ? 'active' : ''}`}
            onClick={() => setSearchHere((on) => !on)}
            title="Search inside subfolders"
          >
            Search Here
          </button>
        </div>

        <div className="file-manager__view-modes">
          {(
            [
              ['grid', 'grid', 'Icons (⌘1)'],
              ['list', 'list', 'List (⌘2)'],
              ['columns', 'align-left', 'Columns (⌘3)'],
            ] as [ViewMode, string, string][]
          ).map(([mode, icon, title]) => (
            <button
              key={mode}
              className={`file-manager__view-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => setViewMode(mode)}
              title={title}
            >
              <Icon name={icon} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div className="file-manager__main">
        <div className="file-manager__sidebar">
          {backend && sidebarSection('favorites', 'Favorites', backend.favorites)}
          {backend && sidebarSection('locations', 'Locations', backend.locations)}
        </div>

        <div className="file-manager__content">
          <div className="file-manager__actions">
            <button className="file-manager__action-btn" onClick={newFolder} title="⌘⇧N">
              <Icon name="plus" size={14} />
              New Folder
            </button>
            {primary && (
              <>
                <button className="file-manager__action-btn" onClick={() => copySelection('copy')} title="⌘C">
                  <Icon name="copy" size={14} />
                  Copy
                </button>
                <button className="file-manager__action-btn" onClick={() => startRename(primary)} title="F2">
                  Rename
                </button>
                <button className="file-manager__action-btn" onClick={duplicate} title="⌘D">
                  Duplicate
                </button>
                <button className="file-manager__action-btn" onClick={showInfo} title="⌘I">
                  <Icon name="info" size={14} />
                  Get Info
                </button>
                <button
                  className="file-manager__action-btn file-manager__action-btn--danger"
                  onClick={trashSelection}
                  title="⌘⌫"
                >
                  <Icon name="trash" size={14} />
                  Move to Trash
                </button>
              </>
            )}
            {clipboard && (
              <button className="file-manager__action-btn" onClick={() => paste()} title="⌘V">
                Paste
              </button>
            )}
          </div>

          {loading ? (
            <div className="file-manager__loading">
              <div className="file-manager__loading-spinner" />
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="file-manager__empty">
              <Icon name="alert-circle" size={48} color="var(--color-error)" />
              <p>{error}</p>
            </div>
          ) : viewMode === 'columns' ? (
            columnView
          ) : visible.length === 0 ? (
            <div className="file-manager__empty">
              <Icon name="folder" size={48} color="var(--color-porcelain-300)" />
              <p>{search ? 'No matches' : 'This folder is empty'}</p>
            </div>
          ) : viewMode === 'grid' ? (
            iconView
          ) : (
            listView
          )}
        </div>

        {info && (
          <div className="file-manager__info" onClick={(e) => e.stopPropagation()}>
            <div className="file-manager__info-header">
              <span>Get Info</span>
              <button onClick={() => setInfo(null)}>
                <Icon name="close" size={12} />
              </button>
            </div>
            {isImageFile(info.item.name) && thumbFor(info.item) && (
              <img src={thumbFor(info.item)} alt={info.item.name} className="file-manager__info-thumb" />
            )}
            <dl>
              <dt>Name</dt>
              <dd>{info.item.name}</dd>
              <dt>Kind</dt>
              <dd>{kindOf(info.item)}</dd>
              <dt>Size</dt>
              <dd>{formatFileSize(info.size)}</dd>
              <dt>Created</dt>
              <dd>{formatDate(info.created)}</dd>
              <dt>Modified</dt>
              <dd>{formatDate(info.item.modifiedAt)}</dd>
              <dt>Where</dt>
              <dd className="file-manager__info-path">{info.item.path}</dd>
            </dl>
          </div>
        )}
      </div>

      <div className="file-manager__statusbar">
        {backend?.isReal && <span className="file-manager__statusbar-tauri">📁 Real File System</span>}
        {notice && (
          <span className="file-manager__statusbar-notice" role="alert" onClick={() => setNotice(null)}>
            <Icon name="alert-circle" size={12} /> {notice}
          </span>
        )}
        {visible.length} items
        {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
        {selectedItems.length > 0 && ` • ${formatFileSize(selectionSize)}`}
      </div>

      {marquee && (
        <div
          className="file-manager__marquee"
          style={{
            left: toLocal(Math.min(marquee.x0, marquee.x1), 0).x,
            top: toLocal(0, Math.min(marquee.y0, marquee.y1)).y,
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
          }}
        />
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="file-manager__context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item ? (
            <>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  open(contextMenu.item!);
                  setContextMenu(null);
                }}
              >
                <Icon name="folder" size={14} />
                Open
              </button>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  showInfo();
                  setContextMenu(null);
                }}
              >
                <Icon name="info" size={14} />
                Get Info
              </button>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  void openWith('archive', {
                    compressPaths: (selectedItems.length ? selectedItems : [contextMenu.item!]).map(
                      (i) => i.path
                    ),
                  });
                  setContextMenu(null);
                }}
              >
                <Icon name="archive" size={14} />
                Compress
              </button>
              {getFileExtension(contextMenu.item.name) === 'zip' && (
                <button
                  className="file-manager__context-menu-item"
                  onClick={() => {
                    void openWith('archive', { archivePath: contextMenu.item!.path });
                    setContextMenu(null);
                  }}
                >
                  <Icon name="upload" size={14} />
                  Extract
                </button>
              )}
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  copySelection('copy');
                  setContextMenu(null);
                }}
              >
                <Icon name="copy" size={14} />
                Copy
              </button>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  copySelection('cut');
                  setContextMenu(null);
                }}
              >
                Cut
              </button>
              <button
                className="file-manager__context-menu-item"
                onClick={() => startRename(contextMenu.item!)}
              >
                Rename
              </button>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  duplicate();
                  setContextMenu(null);
                }}
              >
                Duplicate
              </button>
              <div className="file-manager__context-menu-divider" />
              <button
                className="file-manager__context-menu-item file-manager__context-menu-item--danger"
                onClick={() => {
                  trashSelection();
                  setContextMenu(null);
                }}
              >
                <Icon name="trash" size={14} />
                Move to Trash
              </button>
            </>
          ) : (
            <>
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  newFolder();
                  setContextMenu(null);
                }}
              >
                <Icon name="plus" size={14} />
                New Folder
              </button>
              <button
                className="file-manager__context-menu-item"
                disabled={!clipboard}
                onClick={() => {
                  paste();
                  setContextMenu(null);
                }}
              >
                <Icon name="copy" size={14} />
                Paste
              </button>
              <div className="file-manager__context-menu-divider" />
              <button
                className="file-manager__context-menu-item"
                onClick={() => {
                  refresh();
                  setContextMenu(null);
                }}
              >
                <Icon name="refresh" size={14} />
                Refresh
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileManager;
