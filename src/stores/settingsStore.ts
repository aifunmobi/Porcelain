import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, DesktopIcon } from '../types';

interface SettingsState extends UserSettings {
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
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  wallpaper: 'linear-gradient(135deg, #f5f3ef 0%, #ebe8e2 50%, #ddd9d0 100%)',
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
    'calculator',
    'calendar',
    'clock',
    'weather',
    'camera',
    'terminal',
    'settings',
  ],
  desktopIcons: [
    { id: 'desktop-1', appId: 'file-manager', name: 'Files', icon: 'folder', position: { x: 20, y: 20 } },
    { id: 'desktop-2', appId: 'terminal', name: 'Terminal', icon: 'terminal', position: { x: 20, y: 110 } },
    { id: 'desktop-3', appId: 'notes', name: 'Notes', icon: 'notepad', position: { x: 20, y: 200 } },
    { id: 'desktop-4', appId: 'photo-viewer', name: 'Photos', icon: 'image', position: { x: 20, y: 290 } },
  ],
  dockPosition: 'bottom',
  dockAutoHide: false,
  showSeconds: false,
  use24Hour: false,
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

      resetSettings: () =>
        set(defaultSettings),
    }),
    {
      name: 'porcelain-settings',
    }
  )
);
