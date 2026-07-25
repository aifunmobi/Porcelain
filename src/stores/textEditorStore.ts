import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorMode = 'rich' | 'plain';

export interface RecentDoc {
  path: string;
  name: string;
  openedAt: number;
}

export const FONT_FAMILIES = [
  { id: 'sans', label: 'System Sans', stack: 'var(--font-sans, system-ui, sans-serif)' },
  { id: 'serif', label: 'Serif', stack: 'Iowan Old Style, Palatino, Georgia, serif' },
  { id: 'mono', label: 'Mono', stack: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' },
] as const;

export type FontFamilyId = (typeof FONT_FAMILIES)[number]['id'];

export const RECENTS_LIMIT = 10;

interface TextEditorState {
  recents: RecentDoc[];
  fontFamily: FontFamilyId;
  fontSize: number;
  lineHeight: number;
  wrapToPage: boolean;
  /** Path -> mode, so a document reopens in the mode it was last edited in. */
  modeByPath: Record<string, EditorMode>;

  addRecent: (path: string) => void;
  clearRecents: () => void;
  setFontFamily: (id: FontFamilyId) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setWrapToPage: (on: boolean) => void;
  setModeForPath: (path: string, mode: EditorMode) => void;
}

export const useTextEditorStore = create<TextEditorState>()(
  persist(
    (set) => ({
      recents: [],
      fontFamily: 'sans',
      fontSize: 15,
      lineHeight: 1.6,
      wrapToPage: true,
      modeByPath: {},

      addRecent: (path) =>
        set((state) => ({
          recents: [
            { path, name: path.split('/').filter(Boolean).pop() ?? path, openedAt: Date.now() },
            ...state.recents.filter((r) => r.path !== path),
          ].slice(0, RECENTS_LIMIT),
        })),

      clearRecents: () => set({ recents: [] }),

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize: Math.max(10, Math.min(32, fontSize)) }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setWrapToPage: (wrapToPage) => set({ wrapToPage }),

      setModeForPath: (path, mode) =>
        set((state) => ({ modeByPath: { ...state.modeByPath, [path]: mode } })),
    }),
    { name: 'porcelain-text-editor' }
  )
);
