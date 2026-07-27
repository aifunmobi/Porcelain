import { create } from 'zustand';

/**
 * What the focused app can do right now.
 *
 * The menu bar has no way to reach inside an app, so an app publishes the
 * commands it is currently offering and the menu reads them for whichever
 * window is focused. A command that is present is enabled; one that is absent
 * is greyed. That is how Back can be dead at the top of a folder tree and live
 * a moment later without the menu knowing anything about file systems.
 */
export type AppCommands = Record<string, (() => void) | undefined>;

interface AppCommandState {
  /** Keyed by windowId — two Finder windows have their own histories. */
  byWindow: Map<string, AppCommands>;
  publish: (windowId: string, commands: AppCommands) => void;
  withdraw: (windowId: string) => void;
}

export const useAppCommandStore = create<AppCommandState>((set) => ({
  byWindow: new Map(),

  publish: (windowId, commands) =>
    set((state) => {
      const next = new Map(state.byWindow);
      next.set(windowId, commands);
      return { byWindow: next };
    }),

  withdraw: (windowId) =>
    set((state) => {
      if (!state.byWindow.has(windowId)) return state;
      const next = new Map(state.byWindow);
      next.delete(windowId);
      return { byWindow: next };
    }),
}));
