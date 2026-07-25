import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SortBy, SortOrder, ViewMode } from '../types';

export interface ClipboardEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export interface SortState {
  by: SortBy;
  order: SortOrder;
}

interface FileBrowserState {
  viewMode: ViewMode;
  /** Sidebar section id -> collapsed. Persisted so it survives a reload. */
  collapsed: Record<string, boolean>;
  /** Folder path -> sort state. Persisted per folder. */
  sort: Record<string, SortState>;
  /** Shared by every Files window, so copy/paste crosses windows. Not persisted. */
  clipboard: { mode: 'copy' | 'cut'; entries: ClipboardEntry[] } | null;

  setViewMode: (mode: ViewMode) => void;
  toggleSection: (id: string) => void;
  /** Same column again flips the direction, a new column starts ascending. */
  cycleSort: (path: string, by: SortBy) => void;
  getSort: (path: string) => SortState;
  setClipboard: (mode: 'copy' | 'cut', entries: ClipboardEntry[]) => void;
  clearClipboard: () => void;
}

const DEFAULT_SORT: SortState = { by: 'name', order: 'asc' };

export const useFileBrowserStore = create<FileBrowserState>()(
  persist(
    (set, get) => ({
      viewMode: 'grid',
      collapsed: {},
      sort: {},
      clipboard: null,

      setViewMode: (viewMode) => set({ viewMode }),

      toggleSection: (id) =>
        set((state) => ({ collapsed: { ...state.collapsed, [id]: !state.collapsed[id] } })),

      cycleSort: (path, by) =>
        set((state) => {
          const current = state.sort[path] ?? DEFAULT_SORT;
          const order: SortOrder =
            current.by === by ? (current.order === 'asc' ? 'desc' : 'asc') : 'asc';
          return { sort: { ...state.sort, [path]: { by, order } } };
        }),

      getSort: (path) => get().sort[path] ?? DEFAULT_SORT,

      setClipboard: (mode, entries) => set({ clipboard: { mode, entries } }),

      clearClipboard: () => set({ clipboard: null }),
    }),
    {
      name: 'porcelain-file-browser',
      // The clipboard is session state, not a preference.
      partialize: (state) => ({
        viewMode: state.viewMode,
        collapsed: state.collapsed,
        sort: state.sort,
      }),
    }
  )
);
