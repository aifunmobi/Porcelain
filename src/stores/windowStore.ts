import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { WindowInstance, AppDefinition, Position, Size } from '../types';

interface WindowState {
  windows: Map<string, WindowInstance>;
  activeWindowId: string | null;
  zIndexCounter: number;

  // Actions
  openWindow: (app: AppDefinition, props?: Record<string, unknown>) => string;
  closeWindow: (id: string) => void;
  closeAllWindows: () => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, position: Position) => void;
  updateWindowSize: (id: string, size: Size) => void;
  updateWindowTitle: (id: string, title: string) => void;
  getWindow: (id: string) => WindowInstance | undefined;
  getWindowsByApp: (appId: string) => WindowInstance[];
  isAppRunning: (appId: string) => boolean;
}

// The window manager is the strip between the menu bar and the dock
// (see WindowManager.css: top 28px, bottom 70px). A maximized window fills
// that strip exactly; positions are relative to it, so y starts at 0.
const MENUBAR_HEIGHT = 28;
const DOCK_AREA_HEIGHT = 70;

const getInitialPosition = (index: number): Position => {
  const baseX = 100 + (index % 5) * 30;
  const baseY = 80 + (index % 5) * 30;
  return { x: baseX, y: baseY };
};

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: new Map(),
  activeWindowId: null,
  zIndexCounter: 100,

  openWindow: (app, props) => {
    const state = get();

    // Check for single instance apps
    if (app.singleInstance) {
      const existing = Array.from(state.windows.values()).find(w => w.appId === app.id);
      if (existing) {
        // Hand the new props over, otherwise ⌘⇧3 with Screenshot already open
        // (or "open this file" for any single-instance app) does nothing.
        if (props) {
          set((s) => {
            const current = s.windows.get(existing.id);
            if (!current) return s;
            return {
              windows: new Map(s.windows).set(existing.id, {
                ...current,
                props: { ...current.props, ...props },
              }),
            };
          });
        }
        if (existing.isMinimized) {
          get().restoreWindow(existing.id);
        } else {
          get().focusWindow(existing.id);
        }
        return existing.id;
      }
    }

    const id = uuidv4();
    const windowCount = state.windows.size;
    const position = getInitialPosition(windowCount);
    const newZIndex = state.zIndexCounter + 1;

    const newWindow: WindowInstance = {
      id,
      appId: app.id,
      title: app.name,
      position,
      size: { ...app.defaultSize },
      minSize: { ...app.minSize },
      maxSize: app.maxSize,
      isMinimized: false,
      isMaximized: false,
      zIndex: newZIndex,
      props,
    };

    set(state => ({
      windows: new Map(state.windows).set(id, newWindow),
      activeWindowId: id,
      zIndexCounter: newZIndex,
    }));

    return id;
  },

  closeWindow: (id) => {
    set(state => {
      const newWindows = new Map(state.windows);
      newWindows.delete(id);

      // Set active to the highest z-index window
      let newActiveId: string | null = null;
      let highestZ = 0;
      newWindows.forEach((w) => {
        if (!w.isMinimized && w.zIndex > highestZ) {
          highestZ = w.zIndex;
          newActiveId = w.id;
        }
      });

      return {
        windows: newWindows,
        activeWindowId: state.activeWindowId === id ? newActiveId : state.activeWindowId,
      };
    });
  },

  closeAllWindows: () => {
    set({ windows: new Map(), activeWindowId: null });
  },

  minimizeWindow: (id) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, isMinimized: true });

      // Find next window to focus
      let newActiveId: string | null = null;
      let highestZ = 0;
      newWindows.forEach((w) => {
        if (!w.isMinimized && w.zIndex > highestZ) {
          highestZ = w.zIndex;
          newActiveId = w.id;
        }
      });

      return {
        windows: newWindows,
        activeWindowId: state.activeWindowId === id ? newActiveId : state.activeWindowId,
      };
    });
  },

  maximizeWindow: (id) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      const screenWidth = globalThis.innerWidth;
      const screenHeight = globalThis.innerHeight - MENUBAR_HEIGHT - DOCK_AREA_HEIGHT;

      newWindows.set(id, {
        ...window,
        isMaximized: true,
        // Keep the first un-maximized geometry: maximizing twice in a row
        // (e.g. after a viewport resize) must not remember the maximized box.
        previousState: window.previousState ?? {
          position: { ...window.position },
          size: { ...window.size },
        },
        position: { x: 0, y: 0 },
        size: { width: screenWidth, height: Math.max(window.minSize.height, screenHeight) },
      });

      return { windows: newWindows };
    });
  },

  restoreWindow: (id) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      const newZIndex = state.zIndexCounter + 1;

      if (window.isMinimized) {
        newWindows.set(id, { ...window, isMinimized: false, zIndex: newZIndex });
      } else if (window.isMaximized && window.previousState) {
        newWindows.set(id, {
          ...window,
          isMaximized: false,
          position: window.previousState.position,
          size: window.previousState.size,
          previousState: undefined,
        });
      }

      return {
        windows: newWindows,
        activeWindowId: id,
        zIndexCounter: newZIndex,
      };
    });
  },

  focusWindow: (id) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window || window.isMinimized) return state;

      const newZIndex = state.zIndexCounter + 1;
      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, zIndex: newZIndex });

      return {
        windows: newWindows,
        activeWindowId: id,
        zIndexCounter: newZIndex,
      };
    });
  },

  updateWindowPosition: (id, position) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, position, isMaximized: false, previousState: undefined });

      return { windows: newWindows };
    });
  },

  updateWindowSize: (id, size) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, size, isMaximized: false, previousState: undefined });

      return { windows: newWindows };
    });
  },

  updateWindowTitle: (id, title) => {
    set(state => {
      const window = state.windows.get(id);
      if (!window) return state;

      const newWindows = new Map(state.windows);
      newWindows.set(id, { ...window, title });

      return { windows: newWindows };
    });
  },

  getWindow: (id) => get().windows.get(id),

  getWindowsByApp: (appId) =>
    Array.from(get().windows.values()).filter(w => w.appId === appId),

  isAppRunning: (appId) =>
    Array.from(get().windows.values()).some(w => w.appId === appId),
}));
