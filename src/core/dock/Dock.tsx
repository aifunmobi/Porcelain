import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import './Dock.css';

export const Dock: React.FC = () => {
  const { pinnedApps } = useSettingsStore();
  const { openWindow, windows, focusWindow, restoreWindow } = useWindowStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const allRunningAppIds = Array.from(windows.values()).map((w) => w.appId);

  // Get all apps to show (pinned + running not pinned)
  const dockApps = [
    ...pinnedApps.map((id) => appRegistry[id]).filter(Boolean),
    ...Object.values(appRegistry)
      .filter((app) => allRunningAppIds.includes(app.id) && !pinnedApps.includes(app.id)),
  ];

  const handleAppClick = useCallback(
    (appId: string) => {
      const existingWindow = Array.from(windows.values()).find((w) => w.appId === appId);

      if (existingWindow) {
        if (existingWindow.isMinimized) {
          restoreWindow(existingWindow.id);
        } else {
          focusWindow(existingWindow.id);
        }
      } else {
        const app = appRegistry[appId];
        if (app) {
          openWindow(app);
        }
      }
    },
    [windows, openWindow, focusWindow, restoreWindow]
  );

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.3;
    if (distance === 1) return 1.15;
    if (distance === 2) return 1.05;
    return 1;
  };

  const getTranslateY = (index: number) => {
    if (hoveredIndex === null) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return -12;
    if (distance === 1) return -6;
    if (distance === 2) return -2;
    return 0;
  };

  return (
    <div className="dock-container">
      <motion.div
        className="dock"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="dock__items">
          {dockApps.map((app, index) => {
            const isRunning = allRunningAppIds.includes(app.id);

            return (
              <motion.div
                key={app.id}
                className="dock__item-wrapper"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                animate={{
                  scale: getScale(index),
                  y: getTranslateY(index),
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <button
                  className={`dock__item ${isRunning ? 'dock__item--running' : ''}`}
                  onClick={() => handleAppClick(app.id)}
                  title={app.name}
                >
                  <div className="dock__icon">
                    <Icon name={app.icon} size={32} color="var(--color-porcelain-600)" />
                  </div>
                </button>
                {isRunning && <div className="dock__indicator" />}
                <div className="dock__tooltip">{app.name}</div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Dock;
