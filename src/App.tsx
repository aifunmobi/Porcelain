import { useEffect, useCallback, useState } from 'react';
import { Desktop } from './core/desktop/Desktop';
import { MenuBar } from './core/menubar/MenuBar';
import { Dock } from './core/dock/Dock';
import { WindowManager } from './core/window-manager/WindowManager';
import { useFileSystemStore } from './stores/fileSystemStore';
import { useSettingsStore } from './stores/settingsStore';
import type { DesktopIcon } from './types';
import './styles/globals.css';

// Check if running in Tauri
let convertFileSrc: ((path: string) => string) | null = null;

const initTauri = async () => {
  try {
    const core = await import('@tauri-apps/api/core');
    convertFileSrc = core.convertFileSrc;
    return true;
  } catch {
    return false;
  }
};

// Helper to check if file is an image
const isImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext);
};

// Helper to get file icon based on extension
const getFileIcon = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';

  if (isImageFile(filename)) return 'image';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'music';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['pdf'].includes(ext)) return 'file-text';
  if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return 'file-text';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'file-spreadsheet';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'rs'].includes(ext)) return 'code';

  return 'file';
};

// Grid snapping for icon positions
const GRID_SIZE = 90;
const snapToGrid = (x: number, y: number) => ({
  x: Math.round(x / GRID_SIZE) * GRID_SIZE + 20,
  y: Math.round(y / GRID_SIZE) * GRID_SIZE + 20,
});

function App() {
  const initializeFileSystem = useFileSystemStore((state) => state.initializeFileSystem);
  const brightness = useSettingsStore((state) => state.brightness);
  const desktopIcons = useSettingsStore((state) => state.desktopIcons);
  const addDesktopIcon = useSettingsStore((state) => state.addDesktopIcon);
  const updateDesktopIcon = useSettingsStore((state) => state.updateDesktopIcon);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    initializeFileSystem();
    initTauri();
  }, [initializeFileSystem]);

  // Global drag handlers to catch drops anywhere
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const types = Array.from(e.dataTransfer.types);
    // Check if it's a file being dragged from FileManager
    if (types.includes('application/x-porcelain-file') ||
        types.includes('text/plain') ||
        types.includes('Files')) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the entire app
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const dropX = e.clientX;
    const dropY = e.clientY - 28; // Adjust for menu bar

    console.log('[App] drop event - clientX:', dropX, 'clientY:', dropY);
    console.log('[App] drop event - types:', Array.from(e.dataTransfer.types));

    // Check for internal file transfer (from FileManager)
    let porcelainData = '';
    try {
      porcelainData = e.dataTransfer.getData('application/x-porcelain-file');
      console.log('[App] drop - application/x-porcelain-file:', porcelainData);
    } catch (err) {
      console.log('[App] drop - error getting custom type:', err);
    }

    if (!porcelainData) {
      try {
        porcelainData = e.dataTransfer.getData('text/plain');
        console.log('[App] drop - text/plain:', porcelainData);
      } catch (err) {
        console.log('[App] drop - error getting text/plain:', err);
      }
    }

    console.log('[App] Drop - final porcelainData:', porcelainData);

    if (porcelainData) {
      try {
        const fileData = JSON.parse(porcelainData);
        console.log('App Drop - Parsed file data:', fileData);

        // Validate it's our data format
        if (fileData.name && fileData.path !== undefined) {
          const snapped = snapToGrid(dropX, dropY);

          // Check if icon already exists for this path
          const existingIcon = desktopIcons.find(i => i.filePath === fileData.path);
          if (existingIcon) {
            // Just move the existing icon
            updateDesktopIcon(existingIcon.id, { position: snapped });
            return;
          }

          // Generate thumbnail for images
          let thumbnail: string | undefined;
          if (isImageFile(fileData.name) && convertFileSrc && fileData.path) {
            thumbnail = convertFileSrc(fileData.path);
          }

          const newIcon: DesktopIcon = {
            id: `desktop-file-${Date.now()}`,
            name: fileData.name,
            icon: getFileIcon(fileData.name),
            position: snapped,
            filePath: fileData.path,
            isFile: !fileData.isDirectory,
            thumbnail,
          };

          console.log('App Drop - Adding new icon:', newIcon);
          addDesktopIcon(newIcon);
          return;
        }
      } catch (err) {
        console.log('App Drop - Not JSON data');
      }
    }

    // Handle native file drops (from OS file manager)
    if (e.dataTransfer.files.length > 0) {
      console.log('App Drop - Native file drop:', e.dataTransfer.files);
      const files = Array.from(e.dataTransfer.files);
      let offsetY = 0;

      for (const file of files) {
        const snapped = snapToGrid(dropX, dropY + offsetY);

        let thumbnail: string | undefined;
        if (isImageFile(file.name)) {
          thumbnail = URL.createObjectURL(file);
        }

        const newIcon: DesktopIcon = {
          id: `desktop-file-${Date.now()}-${offsetY}`,
          name: file.name,
          icon: getFileIcon(file.name),
          position: snapped,
          isFile: true,
          thumbnail,
          mimeType: file.type,
        };

        addDesktopIcon(newIcon);
        offsetY += GRID_SIZE;
      }
    }
  }, [desktopIcons, addDesktopIcon, updateDesktopIcon]);

  return (
    <div
      className={`porcelain-os ${isDragOver ? 'porcelain-os--drag-over' : ''}`}
      style={{
        filter: `brightness(${brightness / 100})`,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <MenuBar />
      <Desktop />
      <WindowManager />
      <Dock />
    </div>
  );
}

export default App;
