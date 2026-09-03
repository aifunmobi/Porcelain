import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, DesktopIcon } from '../types';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface SettingsState extends UserSettings {
  theme: ThemeMode;
  // Actions
  setWallpaper: (wallpaper: string, type?: 'image' | 'color' | 'gradient') => void;
  setVolume: (volume: number) => void;
  setBrightness: (brightness: number) => void;
  setAccentColor: (color: string) => void;
  setPinnedApps: (apps: string[]) => void;
  addPinnedApp: (appId: string) => void;
  removePinnedApp: (appId: string) => void;
  setDesktopIcons: (icons: DesktopIcon[]) => void;
  updateDesktopIcon: (id: string, updates: Partial<DesktopIcon>) => void;
  addDesktopIcon: (icon: DesktopIcon) => void;
  removeDesktopIcon: (id: string) => void;
  setDockPosition: (position: 'bottom' | 'left' | 'right') => void;
  setDockAutoHide: (autoHide: boolean) => void;
  setShowSeconds: (show: boolean) => void;
  setUse24Hour: (use24: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  resetSettings: () => void;
}

/* The default desk is expressed in paper tokens, not literal hex, so it
 * follows the theme instead of staying cream in dark mode. */
export const DEFAULT_WALLPAPER =
  'linear-gradient(160deg, var(--paper-1) 0%, var(--paper-2) 55%, var(--paper-3) 100%)';

const LEGACY_WALLPAPERS = [
  'linear-gradient(135deg, #f5f3ef 0%, #ebe8e2 50%, #ddd9d0 100%)',
];

const defaultSettings: UserSettings & { theme: ThemeMode } = {
  wallpaper: DEFAULT_WALLPAPER,
  wallpaperType: 'gradient',
  volume: 75,
  brightness: 100,
  accentColor: '#a8b5c4',
  pinnedApps: [
    'file-manager',
    'browser',
    'photo-viewer',
    'music-player',
    'video-player',
    'notes',
    'text-editor',
    'calculator',
    'calendar',
    'clock',
    'weather',
    'camera',
    'terminal',
    'preview',
    'archive',
    'screenshot',
    'settings',
  ],
  desktopIcons: [
    { id: 'desktop-1', appId: 'file-manager', name: 'Files', icon: 'folder', position: { x: 20, y: 20 } },
    { id: 'desktop-2', appId: 'terminal', name: 'Terminal', icon: 'terminal', position: { x: 20, y: 110 } },
    { id: 'desktop-3', appId: 'notes', name: 'Notes', icon: 'notepad', position: { x: 20, y: 200 } },
    { id: 'desktop-4', appId: 'photo-viewer', name: 'Photos', icon: 'image', position: { x: 20, y: 290 } },
    { id: 'desktop-5', appId: 'trash', name: 'Trash', icon: 'trash', position: { x: 20, y: 380 } },
  ],
  dockPosition: 'bottom',
  dockAutoHide: false,
  showSeconds: false,
  use24Hour: false,
  theme: 'light',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setWallpaper: (wallpaper, type = 'image') =>
        set({ wallpaper, wallpaperType: type }),

      setVolume: (volume) =>
        set({ volume: Math.max(0, Math.min(100, volume)) }),

      setBrightness: (brightness) =>
        set({ brightness: Math.max(0, Math.min(100, brightness)) }),

      setAccentColor: (accentColor) =>
        set({ accentColor }),

      setPinnedApps: (pinnedApps) =>
        set({ pinnedApps }),

      addPinnedApp: (appId) =>
        set((state) => ({
          pinnedApps: state.pinnedApps.includes(appId)
            ? state.pinnedApps
            : [...state.pinnedApps, appId],
        })),

      removePinnedApp: (appId) =>
        set((state) => ({
          pinnedApps: state.pinnedApps.filter((id) => id !== appId),
        })),

      setDesktopIcons: (desktopIcons) =>
        set({ desktopIcons }),

      updateDesktopIcon: (id, updates) =>
        set((state) => ({
          desktopIcons: state.desktopIcons.map((icon) =>
            icon.id === id ? { ...icon, ...updates } : icon
          ),
        })),

      addDesktopIcon: (icon) =>
        set((state) => ({
          desktopIcons: [...state.desktopIcons, icon],
        })),

      removeDesktopIcon: (id) =>
        set((state) => ({
          desktopIcons: state.desktopIcons.filter((icon) => icon.id !== id),
        })),

      setDockPosition: (dockPosition) =>
        set({ dockPosition }),

      setDockAutoHide: (dockAutoHide) =>
        set({ dockAutoHide }),

      setShowSeconds: (showSeconds) =>
        set({ showSeconds }),

      setUse24Hour: (use24Hour) =>
        set({ use24Hour }),

      setTheme: (theme) =>
        set({ theme }),

      resetSettings: () =>
        set(defaultSettings),
    }),
    {
      name: 'porcelain-settings',
      version: 3, // Increment this when defaults change
      // Each step applies on top of the previous one — an early return here
      // would skip every later migration for older installs.
      migrate: (persistedState: unknown, version: number) => {
        let state = { ...(persistedState as SettingsState) };
        // If version is old, reset desktop icons and pinned apps to include new apps
        if (version < 1.5) {
          console.log('[Settings] Migrating from version', version, 'to 1.5');
          state = {
            ...state,
            desktopIcons: defaultSettings.desktopIcons,
            pinnedApps: defaultSettings.pinnedApps,
          };
        }
        // 2.0: the stock desk gradient became token-based so it follows the
        // theme. Anyone still on the old hardcoded cream gets moved across;
        // a deliberately chosen wallpaper is left alone.
        if (version < 2 && LEGACY_WALLPAPERS.includes(state.wallpaper)) {
          state = { ...state, wallpaper: DEFAULT_WALLPAPER, wallpaperType: 'gradient' as const };
        }
        // 3.0: Preview, Archive Utility and Screenshot arrived. Add any dock
        // app the user is missing rather than resetting their arrangement.
        if (version < 3) {
          const missing = defaultSettings.pinnedApps.filter(
            (id) => !state.pinnedApps?.includes(id)
          );
          if (missing.length) {
            state = { ...state, pinnedApps: [...(state.pinnedApps ?? []), ...missing] };
          }
        }
        return state;
      },
      // blob: URLs only live for the page that created them, so a thumbnail
      // persisted from a native file drop is dead after a reload.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<SettingsState>;
        const desktopIcons = persisted.desktopIcons?.map((icon) =>
          icon.thumbnail?.startsWith('blob:') ? { ...icon, thumbnail: undefined } : icon
        );
        return { ...currentState, ...persisted, ...(desktopIcons ? { desktopIcons } : {}) };
      },
    }
  )
);
