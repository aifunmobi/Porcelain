import { useEffect, useCallback } from 'react';
import { useWindowStore } from '../stores/windowStore';
import { appRegistry } from '../apps/registry';

interface ShortcutConfig {
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const {
    activeWindowId,
    windows,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    openWindow,
  } = useWindowStore();

  // Get list of open windows sorted by z-index for app switching
  const getWindowsByZIndex = useCallback(() => {
    return Array.from(windows.values())
      .filter((w) => !w.isMinimized)
      .sort((a, b) => b.zIndex - a.zIndex);
  }, [windows]);

  // Close active window
  const handleClose = useCallback(() => {
    if (activeWindowId) {
      closeWindow(activeWindowId);
    }
  }, [activeWindowId, closeWindow]);

  // Minimize active window
  const handleMinimize = useCallback(() => {
    if (activeWindowId) {
      minimizeWindow(activeWindowId);
    }
  }, [activeWindowId, minimizeWindow]);

  // Maximize/restore active window
  const handleMaximize = useCallback(() => {
    if (activeWindowId) {
      const win = windows.get(activeWindowId);
      if (win?.isMaximized) {
        restoreWindow(activeWindowId);
      } else {
        maximizeWindow(activeWindowId);
      }
    }
  }, [activeWindowId, windows, maximizeWindow, restoreWindow]);

  // Quit app (close all windows of the active app)
  const handleQuit = useCallback(() => {
    if (activeWindowId) {
      const activeWindow = windows.get(activeWindowId);
      if (activeWindow) {
        const appWindows = Array.from(windows.values()).filter(
          (w) => w.appId === activeWindow.appId
        );
        appWindows.forEach((w) => closeWindow(w.id));
      }
    }
  }, [activeWindowId, windows, closeWindow]);

  // Cycle to next window (Cmd+Tab)
  const handleCycleWindows = useCallback(() => {
    const sortedWindows = getWindowsByZIndex();
    if (sortedWindows.length < 2) return;

    // Find current window index and focus next
    const currentIndex = sortedWindows.findIndex((w) => w.id === activeWindowId);
    const nextIndex = (currentIndex + 1) % sortedWindows.length;
    focusWindow(sortedWindows[nextIndex].id);
  }, [activeWindowId, getWindowsByZIndex, focusWindow]);

  // Cycle to previous window (Cmd+Shift+Tab)
  const handleCycleWindowsReverse = useCallback(() => {
    const sortedWindows = getWindowsByZIndex();
    if (sortedWindows.length < 2) return;

    const currentIndex = sortedWindows.findIndex((w) => w.id === activeWindowId);
    const prevIndex = currentIndex <= 0 ? sortedWindows.length - 1 : currentIndex - 1;
    focusWindow(sortedWindows[prevIndex].id);
  }, [activeWindowId, getWindowsByZIndex, focusWindow]);

  // Open Settings (Cmd+,)
  const handleOpenSettings = useCallback(() => {
    const settingsApp = appRegistry['settings'];
    if (settingsApp) {
      openWindow(settingsApp);
    }
  }, [openWindow]);

  // Hide all windows (Cmd+H)
  const handleHideAll = useCallback(() => {
    if (activeWindowId) {
      const activeWindow = windows.get(activeWindowId);
      if (activeWindow) {
        const appWindows = Array.from(windows.values()).filter(
          (w) => w.appId === activeWindow.appId
        );
        appWindows.forEach((w) => minimizeWindow(w.id));
      }
    }
  }, [activeWindowId, windows, minimizeWindow]);

  // New window for active app (Cmd+N)
  const handleNewWindow = useCallback(() => {
    if (activeWindowId) {
      const activeWindow = windows.get(activeWindowId);
      if (activeWindow) {
        const app = appRegistry[activeWindow.appId];
        if (app && !app.singleInstance) {
          openWindow(app);
        }
      }
    }
  }, [activeWindowId, windows, openWindow]);

  useEffect(() => {
    const shortcuts: ShortcutConfig[] = [
      { key: 'w', metaKey: true, action: handleClose, description: 'Close window' },
      { key: 'm', metaKey: true, action: handleMinimize, description: 'Minimize window' },
      { key: 'q', metaKey: true, action: handleQuit, description: 'Quit app' },
      { key: 'Tab', metaKey: true, action: handleCycleWindows, description: 'Next window' },
      { key: 'Tab', metaKey: true, shiftKey: true, action: handleCycleWindowsReverse, description: 'Previous window' },
      { key: ',', metaKey: true, action: handleOpenSettings, description: 'Open Settings' },
      { key: 'h', metaKey: true, action: handleHideAll, description: 'Hide app' },
      { key: 'n', metaKey: true, action: handleNewWindow, description: 'New window' },
      { key: 'f', metaKey: true, ctrlKey: true, action: handleMaximize, description: 'Toggle fullscreen' },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Still allow Cmd+W to close even in inputs
        if (!(e.key === 'w' && e.metaKey)) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey;
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          shiftMatch &&
          altMatch &&
          ctrlMatch
        ) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleClose,
    handleMinimize,
    handleQuit,
    handleCycleWindows,
    handleCycleWindowsReverse,
    handleOpenSettings,
    handleHideAll,
    handleNewWindow,
    handleMaximize,
  ]);
};

export default useKeyboardShortcuts;
