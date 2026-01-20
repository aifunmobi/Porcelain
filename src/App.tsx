import { useEffect } from 'react';
import { Desktop } from './core/desktop/Desktop';
import { MenuBar } from './core/menubar/MenuBar';
import { Dock } from './core/dock/Dock';
import { WindowManager } from './core/window-manager/WindowManager';
import { useFileSystemStore } from './stores/fileSystemStore';
import { useSettingsStore } from './stores/settingsStore';
import './styles/globals.css';

function App() {
  const initializeFileSystem = useFileSystemStore((state) => state.initializeFileSystem);
  const brightness = useSettingsStore((state) => state.brightness);

  useEffect(() => {
    initializeFileSystem();
  }, [initializeFileSystem]);

  return (
    <div
      className="porcelain-os"
      style={{
        filter: `brightness(${brightness / 100})`,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <MenuBar />
      <Desktop />
      <WindowManager />
      <Dock />
    </div>
  );
}

export default App;
