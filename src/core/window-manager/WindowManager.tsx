import React, { useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { appRegistry } from '../../apps/registry';
import './WindowManager.css';

export const WindowManager: React.FC = () => {
  // Get the Map directly, then convert to array in useMemo to prevent infinite loops
  const windowsMap = useWindowStore((state) => state.windows);
  const windows = useMemo(() => Array.from(windowsMap.values()), [windowsMap]);

  // Allow drag events to pass through to the Desktop below
  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Don't prevent default - let it bubble to Desktop
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((_e: React.DragEvent) => {
    // Don't handle drops here - let them go to Desktop
    // The WindowManager has pointer-events: none anyway, but just in case
  }, []);

  return (
    <div
      className="window-manager"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {windows.map((win) => {
          const app = appRegistry[win.appId];
          if (!app) return null;

          const AppComponent = app.component;

          return (
            <Window key={win.id} window={win}>
              <AppComponent windowId={win.id} {...win.props} />
            </Window>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default WindowManager;
