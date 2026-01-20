import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { appRegistry } from '../../apps/registry';
import './WindowManager.css';

export const WindowManager: React.FC = () => {
  // Get the Map directly, then convert to array in useMemo to prevent infinite loops
  const windowsMap = useWindowStore((state) => state.windows);
  const windows = useMemo(() => Array.from(windowsMap.values()), [windowsMap]);

  return (
    <div className="window-manager">
      <AnimatePresence>
        {windows.map((win) => {
          const app = appRegistry[win.appId];
          if (!app) return null;

          const AppComponent = app.component;

          return (
            <Window key={win.id} window={win}>
              <AppComponent windowId={win.id} />
            </Window>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default WindowManager;
