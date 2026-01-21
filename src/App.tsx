import { useEffect, useCallback, useState } from 'react';
import { Desktop } from './core/desktop/Desktop';
import { MenuBar } from './core/menubar/MenuBar';
import { Dock } from './core/dock/Dock';
import { WindowManager } from './core/window-manager/WindowManager';
import { DragOverlay } from './components/DragOverlay';
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
const MIN_X = 20;
const MIN_Y = 20;
const ICON_WIDTH = 80;
const ICON_HEIGHT = 100;
const DOCK_HEIGHT = 80;
const MENUBAR_HEIGHT = 28;

const snapToGrid = (x: number, y: number) => {
  // Safety check for window dimensions
  const winWidth = window.innerWidth || 1920;
  const winHeight = window.innerHeight || 1080;

  // Desktop area is window minus menubar at top and dock at bottom
  const desktopHeight = winHeight - MENUBAR_HEIGHT - DOCK_HEIGHT;
  const desktopWidth = winWidth;

  // Calculate valid grid boundaries (ensure at least 0)
  const maxGridX = Math.max(0, Math.floor((desktopWidth - ICON_WIDTH - MIN_X) / GRID_SIZE));
  const maxGridY = Math.max(0, Math.floor((desktopHeight - ICON_HEIGHT - MIN_Y) / GRID_SIZE));

  // Snap to nearest grid position
  let gridX = Math.round((x - MIN_X) / GRID_SIZE);
  let gridY = Math.round((y - MIN_Y) / GRID_SIZE);

  // Clamp to valid grid range
  gridX = Math.max(0, Math.min(maxGridX, gridX));
  gridY = Math.max(0, Math.min(maxGridY, gridY));

  // Convert back to pixel coordinates
  return {
    x: gridX * GRID_SIZE + MIN_X,
    y: gridY * GRID_SIZE + MIN_Y
  };
};

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

  // Handle drop from the DragOverlay (pointer-based drag system)
  const handleOverlayDrop = useCallback((
    data: { name: string; path: string; isDirectory: boolean },
    dropX: number,
    dropY: number
  ) => {
    console.log('[App] overlay drop:', data, 'at', dropX, dropY);

    const snapped = snapToGrid(dropX, dropY);

    // Check if icon already exists for this path
    const existingIcon = desktopIcons.find(i => i.filePath === data.path);
    if (existingIcon) {
      // Just move the existing icon
      updateDesktopIcon(existingIcon.id, { position: snapped });
      return;
    }

    // Generate thumbnail for images
    let thumbnail: string | undefined;
    if (isImageFile(data.name) && convertFileSrc && data.path) {
      thumbnail = convertFileSrc(data.path);
    }

    const newIcon: DesktopIcon = {
      id: `desktop-file-${Date.now()}`,
      name: data.name,
      icon: getFileIcon(data.name),
      position: snapped,
      filePath: data.path,
      isFile: !data.isDirectory,
      thumbnail,
    };

    console.log('[App] overlay drop - adding icon:', newIcon);
    addDesktopIcon(newIcon);
  }, [desktopIcons, addDesktopIcon, updateDesktopIcon]);

  // Handle drop to file manager - this is a placeholder, actual copy happens in FileManager
  const handleDropToFileManager = useCallback((
    data: { name: string; path: string; isDirectory: boolean; iconId?: string }
  ) => {
    console.log('[App] drop to file manager:', data);
    // The actual file copy will be handled by the FileManager component
    // This is dispatched via a custom event
    window.dispatchEvent(new CustomEvent('porcelain-drop-to-filemanager', {
      detail: data
    }));
  }, []);

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
      <DragOverlay onDropToDesktop={handleOverlayDrop} onDropToFileManager={handleDropToFileManager} />
    </div>
  );
}

export default App;
