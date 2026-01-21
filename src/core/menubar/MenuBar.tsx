import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import './MenuBar.css';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface MenuDefinition {
  [menuName: string]: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const {
    activeWindowId,
    windows,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    openWindow
  } = useWindowStore();
  const { volume, showSeconds, use24Hour } = useSettingsStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const activeWindow = activeWindowId ? windows.get(activeWindowId) : null;
  const activeApp = activeWindow ? appRegistry[activeWindow.appId] : null;
  const activeAppId = activeWindow?.appId || null;

  // Menu actions
  const closeActiveWindow = useCallback(() => {
    if (activeWindowId) {
      closeWindow(activeWindowId);
    }
  }, [activeWindowId, closeWindow]);

  const minimizeActiveWindow = useCallback(() => {
    if (activeWindowId) {
      minimizeWindow(activeWindowId);
    }
  }, [activeWindowId, minimizeWindow]);

  const zoomActiveWindow = useCallback(() => {
    if (activeWindowId) {
      const window = windows.get(activeWindowId);
      if (window?.isMaximized) {
        useWindowStore.getState().restoreWindow(activeWindowId);
      } else {
        maximizeWindow(activeWindowId);
      }
    }
  }, [activeWindowId, windows, maximizeWindow]);

  const openNewWindow = useCallback(() => {
    if (activeApp) {
      openWindow(activeApp);
    }
  }, [activeApp, openWindow]);

  const openSettings = useCallback(() => {
    const settingsApp = appRegistry['settings'];
    if (settingsApp) {
      openWindow(settingsApp);
    }
  }, [openWindow]);

  const bringAllToFront = useCallback(() => {
    // Focus all windows of the active app
    if (activeAppId) {
      const appWindows = Array.from(windows.values()).filter(w => w.appId === activeAppId);
      appWindows.forEach(w => {
        if (w.isMinimized) {
          useWindowStore.getState().restoreWindow(w.id);
        }
      });
    }
  }, [activeAppId, windows]);

  // Create menus with actions
  const getMenus = useCallback((): MenuDefinition => {
    // Default menus for Porcelain OS (when no app is focused)
    const defaultMenus: MenuDefinition = {
      File: [
        { label: 'New Window', shortcut: '⌘N', action: openNewWindow, disabled: !activeApp },
        { label: 'divider', divider: true },
        { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow, disabled: !activeWindowId },
      ],
      Edit: [
        { label: 'Undo', shortcut: '⌘Z', disabled: true },
        { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
        { label: 'divider', divider: true },
        { label: 'Cut', shortcut: '⌘X', disabled: true },
        { label: 'Copy', shortcut: '⌘C', disabled: true },
        { label: 'Paste', shortcut: '⌘V', disabled: true },
        { label: 'Select All', shortcut: '⌘A', disabled: true },
      ],
      View: [
        { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: zoomActiveWindow, disabled: !activeWindowId },
      ],
      Window: [
        { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow, disabled: !activeWindowId },
        { label: 'Zoom', action: zoomActiveWindow, disabled: !activeWindowId },
        { label: 'divider', divider: true },
        { label: 'Bring All to Front', action: bringAllToFront },
      ],
      Help: [
        { label: 'Porcelain OS Help', disabled: true },
      ],
    };

    // App-specific menus
    const appMenus: { [appId: string]: MenuDefinition } = {
      'file-manager': {
        File: [
          { label: 'New Folder', shortcut: '⇧⌘N', disabled: true },
          { label: 'New Window', shortcut: '⌘N', action: openNewWindow },
          { label: 'divider', divider: true },
          { label: 'Open', shortcut: '⌘O', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
          { label: 'Get Info', shortcut: '⌘I', disabled: true },
        ],
        Edit: [
          { label: 'Undo', shortcut: '⌘Z', disabled: true },
          { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Cut', shortcut: '⌘X', disabled: true },
          { label: 'Copy', shortcut: '⌘C', disabled: true },
          { label: 'Paste', shortcut: '⌘V', disabled: true },
          { label: 'Select All', shortcut: '⌘A', disabled: true },
        ],
        View: [
          { label: 'as Icons', shortcut: '⌘1', disabled: true },
          { label: 'as List', shortcut: '⌘2', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Show Path Bar', shortcut: '⌥⌘P', disabled: true },
        ],
        Go: [
          { label: 'Back', shortcut: '⌘[', disabled: true },
          { label: 'Forward', shortcut: '⌘]', disabled: true },
          { label: 'Enclosing Folder', shortcut: '⌘↑', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Home', shortcut: '⇧⌘H', disabled: true },
          { label: 'Desktop', shortcut: '⇧⌘D', disabled: true },
          { label: 'Documents', shortcut: '⇧⌘O', disabled: true },
          { label: 'Downloads', shortcut: '⌥⌘L', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
          { label: 'divider', divider: true },
          { label: 'Bring All to Front', action: bringAllToFront },
        ],
        Help: [
          { label: 'Files Help', disabled: true },
        ],
      },
      'notes': {
        File: [
          { label: 'New Note', shortcut: '⌘N', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Export as PDF...', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Undo', shortcut: '⌘Z', disabled: true },
          { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Cut', shortcut: '⌘X', disabled: true },
          { label: 'Copy', shortcut: '⌘C', disabled: true },
          { label: 'Paste', shortcut: '⌘V', disabled: true },
          { label: 'Select All', shortcut: '⌘A', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Find', shortcut: '⌘F', disabled: true },
        ],
        Format: [
          { label: 'Bold', shortcut: '⌘B', disabled: true },
          { label: 'Italic', shortcut: '⌘I', disabled: true },
          { label: 'Underline', shortcut: '⌘U', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Bulleted List', disabled: true },
          { label: 'Numbered List', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Notes Help', disabled: true },
        ],
      },
      'terminal': {
        Shell: [
          { label: 'New Window', shortcut: '⌘N', action: openNewWindow },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Copy', shortcut: '⌘C', disabled: true },
          { label: 'Paste', shortcut: '⌘V', disabled: true },
          { label: 'Select All', shortcut: '⌘A', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Clear', shortcut: '⌘K', disabled: true },
        ],
        View: [
          { label: 'Bigger', shortcut: '⌘+', disabled: true },
          { label: 'Smaller', shortcut: '⌘-', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Terminal Help', disabled: true },
        ],
      },
      'browser': {
        File: [
          { label: 'New Window', shortcut: '⌘N', action: openNewWindow },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Undo', shortcut: '⌘Z', disabled: true },
          { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Cut', shortcut: '⌘X', disabled: true },
          { label: 'Copy', shortcut: '⌘C', disabled: true },
          { label: 'Paste', shortcut: '⌘V', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Find...', shortcut: '⌘F', disabled: true },
        ],
        View: [
          { label: 'Reload Page', shortcut: '⌘R', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Zoom In', shortcut: '⌘+', disabled: true },
          { label: 'Zoom Out', shortcut: '⌘-', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: zoomActiveWindow },
        ],
        History: [
          { label: 'Back', shortcut: '⌘[', disabled: true },
          { label: 'Forward', shortcut: '⌘]', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Home', disabled: true },
        ],
        Bookmarks: [
          { label: 'Add Bookmark...', shortcut: '⌘D', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Show Bookmarks', shortcut: '⌥⌘B', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Browser Help', disabled: true },
        ],
      },
      'photo-viewer': {
        File: [
          { label: 'Open...', shortcut: '⌘O', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Copy', shortcut: '⌘C', disabled: true },
        ],
        View: [
          { label: 'Zoom In', shortcut: '⌘+', disabled: true },
          { label: 'Zoom Out', shortcut: '⌘-', disabled: true },
          { label: 'Actual Size', shortcut: '⌘0', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: zoomActiveWindow },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Photos Help', disabled: true },
        ],
      },
      'music-player': {
        File: [
          { label: 'Open...', shortcut: '⌘O', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Copy', shortcut: '⌘C', disabled: true },
        ],
        Controls: [
          { label: 'Play/Pause', shortcut: 'Space', disabled: true },
          { label: 'Next', shortcut: '⌘→', disabled: true },
          { label: 'Previous', shortcut: '⌘←', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Shuffle', disabled: true },
          { label: 'Repeat', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Music Help', disabled: true },
        ],
      },
      'video-player': {
        File: [
          { label: 'Open...', shortcut: '⌘O', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Copy', shortcut: '⌘C', disabled: true },
        ],
        Playback: [
          { label: 'Play/Pause', shortcut: 'Space', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Skip Forward', shortcut: '→', disabled: true },
          { label: 'Skip Backward', shortcut: '←', disabled: true },
        ],
        View: [
          { label: 'Enter Full Screen', shortcut: '⌃⌘F', action: zoomActiveWindow },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Video Help', disabled: true },
        ],
      },
      'settings': {
        File: [
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Undo', shortcut: '⌘Z', disabled: true },
          { label: 'Redo', shortcut: '⇧⌘Z', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Settings Help', disabled: true },
        ],
      },
      'calculator': {
        File: [
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Edit: [
          { label: 'Copy', shortcut: '⌘C', disabled: true },
          { label: 'Paste', shortcut: '⌘V', disabled: true },
        ],
        View: [
          { label: 'Basic', disabled: true },
          { label: 'Scientific', disabled: true },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Calculator Help', disabled: true },
        ],
      },
      'weather': {
        File: [
          { label: 'Refresh', shortcut: '⌘R', disabled: true },
          { label: 'divider', divider: true },
          { label: 'Close Window', shortcut: '⌘W', action: closeActiveWindow },
        ],
        Window: [
          { label: 'Minimize', shortcut: '⌘M', action: minimizeActiveWindow },
          { label: 'Zoom', action: zoomActiveWindow },
        ],
        Help: [
          { label: 'Weather Help', disabled: true },
        ],
      },
    };

    return activeAppId && appMenus[activeAppId] ? appMenus[activeAppId] : defaultMenus;
  }, [activeAppId, activeApp, activeWindowId, openNewWindow, closeActiveWindow, minimizeActiveWindow, zoomActiveWindow, bringAllToFront]);

  const currentMenus = getMenus();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
    };

    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    let period = '';

    if (!use24Hour) {
      period = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const timeStr = use24Hour
      ? `${hours.toString().padStart(2, '0')}:${minutes}`
      : `${hours}:${minutes}`;

    return showSeconds ? `${timeStr}:${seconds}${period}` : `${timeStr}${period}`;
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return 'volume';
    return 'volume';
  };

  const handleMenuClick = useCallback((menuName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === menuName ? null : menuName);
  }, [activeMenu]);

  const handleMenuHover = useCallback((menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  }, [activeMenu]);

  const handleMenuItemClick = useCallback((item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.disabled || item.divider) return;

    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  }, []);

  const menuNames = Object.keys(currentMenus);

  return (
    <motion.div
      className="menubar"
      initial={{ y: -28 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="menubar__left">
        <div
          className={`menubar__apple ${activeMenu === 'apple' ? 'menubar__apple--active' : ''}`}
          onClick={(e) => handleMenuClick('apple', e)}
          onMouseEnter={() => handleMenuHover('apple')}
        >
          <svg width="14" height="17" viewBox="0 0 14 17" fill="currentColor">
            <path d="M13.2 12.8c-.3.7-.5 1-.9 1.6-.6.8-1.4 1.8-2.4 1.9-1 0-1.2-.6-2.5-.6-1.3 0-1.6.6-2.5.7-1 0-1.8-1-2.4-1.9C1.2 12.5.5 10.2.9 8.5c.3-1.2 1-2.2 1.9-2.9.8-.6 1.9-1 2.9-.9.9 0 1.8.5 2.3.5s1.5-.6 2.7-.5c.5 0 1.8.2 2.6 1.4-2.2 1.3-1.8 4.6.6 5.5-.5 1.3-.7 1.9-1.7 3.2zM9.2 0c.1.8-.2 1.6-.7 2.2-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.6.8-2.1C7.6.5 8.5.1 9.2 0z" />
          </svg>
        </div>

        <AnimatePresence>
          {activeMenu === 'apple' && (
            <motion.div
              className="menubar__dropdown menubar__dropdown--apple"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menubar__dropdown-item">
                <span><strong>About Porcelain OS</strong></span>
              </div>
              <div className="menubar__dropdown-divider" />
              <div
                className="menubar__dropdown-item"
                onClick={() => { openSettings(); setActiveMenu(null); }}
              >
                <span>System Preferences...</span>
                <span className="menubar__shortcut">⌘,</span>
              </div>
              <div className="menubar__dropdown-divider" />
              <div className="menubar__dropdown-item menubar__dropdown-item--disabled">
                <span>Sleep</span>
              </div>
              <div className="menubar__dropdown-item menubar__dropdown-item--disabled">
                <span>Restart...</span>
              </div>
              <div className="menubar__dropdown-item menubar__dropdown-item--disabled">
                <span>Shut Down...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`menubar__app-name ${activeMenu === 'app' ? 'menubar__app-name--active' : ''}`}
          onClick={(e) => handleMenuClick('app', e)}
          onMouseEnter={() => handleMenuHover('app')}
        >
          {activeApp?.name || 'Porcelain OS'}
        </div>

        <AnimatePresence>
          {activeMenu === 'app' && (
            <motion.div
              className="menubar__dropdown menubar__dropdown--app"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menubar__dropdown-item">
                <span><strong>About {activeApp?.name || 'Porcelain OS'}</strong></span>
              </div>
              <div className="menubar__dropdown-divider" />
              <div
                className="menubar__dropdown-item"
                onClick={() => { openSettings(); setActiveMenu(null); }}
              >
                <span>Preferences...</span>
                <span className="menubar__shortcut">⌘,</span>
              </div>
              <div className="menubar__dropdown-divider" />
              <div
                className={`menubar__dropdown-item ${!activeWindowId ? 'menubar__dropdown-item--disabled' : ''}`}
                onClick={() => { if (activeWindowId) { minimizeActiveWindow(); setActiveMenu(null); } }}
              >
                <span>Hide {activeApp?.name || 'Porcelain OS'}</span>
                <span className="menubar__shortcut">⌘H</span>
              </div>
              <div className="menubar__dropdown-divider" />
              <div
                className={`menubar__dropdown-item ${!activeWindowId ? 'menubar__dropdown-item--disabled' : ''}`}
                onClick={() => { if (activeWindowId) { closeActiveWindow(); setActiveMenu(null); } }}
              >
                <span>Quit {activeApp?.name || 'Porcelain OS'}</span>
                <span className="menubar__shortcut">⌘Q</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="menubar__menus">
          {menuNames.map((menuName) => (
            <div key={menuName} className="menubar__menu-container">
              <button
                className={`menubar__menu ${activeMenu === menuName ? 'menubar__menu--active' : ''}`}
                onClick={(e) => handleMenuClick(menuName, e)}
                onMouseEnter={() => handleMenuHover(menuName)}
              >
                {menuName}
              </button>

              <AnimatePresence>
                {activeMenu === menuName && (
                  <motion.div
                    className="menubar__dropdown"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentMenus[menuName].map((item, index) => (
                      item.divider ? (
                        <div key={index} className="menubar__dropdown-divider" />
                      ) : (
                        <div
                          key={index}
                          className={`menubar__dropdown-item ${item.disabled ? 'menubar__dropdown-item--disabled' : ''}`}
                          onClick={(e) => handleMenuItemClick(item, e)}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="menubar__shortcut">{item.shortcut}</span>
                          )}
                        </div>
                      )
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="menubar__right">
        <div className="menubar__status-item">
          <Icon name="bluetooth" size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name="wifi" size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name={getVolumeIcon()} size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name="battery" size={18} />
        </div>
        <div className="menubar__datetime">
          <span className="menubar__date">{formatDate(currentTime)}</span>
          <span className="menubar__time">{formatTime(currentTime)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuBar;
