import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWindowStore } from '../../stores/windowStore';
import { useDragStore } from '../../stores/dragStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import type { DesktopIcon } from '../../types';
import './Desktop.css';

// Check if running in Tauri
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let convertFileSrc: ((path: string) => string) | null = null;

// Dynamically import Tauri APIs
const initTauri = async () => {
  try {
    const core = await import('@tauri-apps/api/core');
    invoke = core.invoke;
    convertFileSrc = core.convertFileSrc;
    return true;
  } catch {
    return false;
  }
};

// Initialize Tauri on module load
initTauri();

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

// Grid snapping for icon positions with boundary clamping
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
  const result = {
    x: gridX * GRID_SIZE + MIN_X,
    y: gridY * GRID_SIZE + MIN_Y
  };

  console.log('[snapToGrid] input:', { x, y }, 'output:', result, 'desktop:', { desktopWidth, desktopHeight }, 'maxGrid:', { maxGridX, maxGridY });

  return result;
};

export const Desktop: React.FC = () => {
  const {
    wallpaper,
    wallpaperType,
    desktopIcons,
    updateDesktopIcon,
    addDesktopIcon,
    removeDesktopIcon
  } = useSettingsStore();
  const { openWindow } = useWindowStore();
  const { isDragging } = useDragStore();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iconId?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [tauriReady, setTauriReady] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('untitled folder');
  const [newFolderPosition, setNewFolderPosition] = useState({ x: 20, y: 20 });
  const [clipboard, setClipboard] = useState<DesktopIcon | null>(null);
  const [systemClipboardHasFile, setSystemClipboardHasFile] = useState(false);

  // Wait for Tauri to initialize
  useEffect(() => {
    const checkTauri = async () => {
      const ready = await initTauri();
      setTauriReady(ready);
    };
    checkTauri();
  }, []);

  // Helper function to add icon from file data
  const addIconFromData = useCallback((fileData: { name: string; path: string; isDirectory: boolean }, dropX: number, dropY: number) => {
    const snapped = snapToGrid(dropX, dropY);

    // Check if there's already an icon at this position
    const existingIcon = desktopIcons.find(
      icon => icon.position.x === snapped.x && icon.position.y === snapped.y
    );

    if (existingIcon) {
      snapped.y += GRID_SIZE;
    }

    // Determine if it's an image for thumbnail
    let thumbnail: string | undefined;
    if (tauriReady && convertFileSrc && isImageFile(fileData.name)) {
      try {
        thumbnail = convertFileSrc(fileData.path);
      } catch (err) {
        console.error('Error creating thumbnail URL:', err);
      }
    }

    const newIcon: DesktopIcon = {
      id: `desktop-file-${Date.now()}`,
      name: fileData.name,
      icon: fileData.isDirectory ? 'folder' : getFileIcon(fileData.name),
      position: snapped,
      isFile: !fileData.isDirectory,
      filePath: fileData.path,
      thumbnail,
    };

    console.log('[Desktop] adding icon:', newIcon);
    addDesktopIcon(newIcon);
  }, [desktopIcons, addDesktopIcon, tauriReady]);

  // Global drag and drop event handlers (document level to catch drops from windows)
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      // Always allow drag over to enable drops
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }

      // Check if we're dragging from file manager
      const dragStoreData = useDragStore.getState();
      if (dragStoreData.isDragging) {
        setIsDragOver(true);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      // Only reset if leaving the viewport
      if (e.clientX <= 0 || e.clientY <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const dropX = e.clientX;
      const dropY = e.clientY - 28; // Adjust for menu bar

      console.log('[Desktop Global] drop event at:', dropX, dropY);

      // First, check the drag store (zustand state - most reliable)
      const dragStoreState = useDragStore.getState();
      console.log('[Desktop Global] dragStore state:', dragStoreState);

      if (dragStoreState.dragData && dragStoreState.dragData.source === 'porcelain-file-manager') {
        addIconFromData(dragStoreState.dragData, dropX, dropY);
        dragStoreState.endDrag();
        return;
      }

      // Fallback: Try to get data from dataTransfer
      console.log('[Desktop Global] dataTransfer types:', e.dataTransfer?.types);
      let porcelainData = '';
      try {
        porcelainData = e.dataTransfer?.getData('application/x-porcelain-file') || '';
        if (!porcelainData) {
          porcelainData = e.dataTransfer?.getData('text/plain') || '';
        }
      } catch (err) {
        console.log('[Desktop Global] error reading dataTransfer:', err);
      }

      console.log('[Desktop Global] porcelainData:', porcelainData);

      if (porcelainData) {
        try {
          const fileData = JSON.parse(porcelainData);
          if (fileData.name && fileData.path !== undefined && fileData.source === 'porcelain-file-manager') {
            addIconFromData(fileData, dropX, dropY);
          }
        } catch (err) {
          console.log('[Desktop Global] Not valid JSON');
        }
      }
    };

    // Also listen for mouseup as a backup for when drag events don't fire properly
    const handleGlobalMouseUp = (e: MouseEvent) => {
      const dragStoreState = useDragStore.getState();
      if (dragStoreState.isDragging && dragStoreState.dragData) {
        console.log('[Desktop Global] mouseup while dragging:', dragStoreState.dragData);

        const dropX = e.clientX;
        const dropY = e.clientY - 28;

        // Check if mouse is over the desktop area (not over a window)
        const target = e.target as HTMLElement;
        const isOverDesktop = target.closest('.desktop') && !target.closest('.window');

        if (isOverDesktop && dragStoreState.dragData.source === 'porcelain-file-manager') {
          addIconFromData(dragStoreState.dragData, dropX, dropY);
        }

        dragStoreState.endDrag();
        setIsDragOver(false);
      }
    };

    // Add global listeners
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [addIconFromData]);

  const getWallpaperStyle = () => {
    if (wallpaperType === 'color') {
      return { backgroundColor: wallpaper };
    }
    if (wallpaperType === 'gradient') {
      return { background: wallpaper };
    }
    return { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  };

  const handleIconDoubleClick = useCallback(
    async (icon: DesktopIcon) => {
      console.log('[Desktop] double-click icon:', icon);

      // If it's an app icon
      if (icon.appId) {
        const app = appRegistry[icon.appId];
        if (app) {
          openWindow(app);
        }
        return;
      }

      // If it's a folder (not a file), open File Manager
      if (!icon.isFile) {
        const fileManagerApp = appRegistry['file-manager'];
        if (fileManagerApp) {
          openWindow(fileManagerApp);
        }
        return;
      }

      // If it's a file with a real path (Tauri)
      if (icon.filePath && tauriReady && invoke) {
        try {
          await invoke('open_file_with_default_app', { path: icon.filePath });
        } catch (err) {
          console.error('Failed to open file:', err);
        }
        return;
      }

      // Fallback: open appropriate app based on file type
      if (icon.isFile) {
        const ext = icon.name.toLowerCase().split('.').pop() || '';

        if (isImageFile(icon.name)) {
          const photoApp = appRegistry['photo-viewer'];
          if (photoApp) openWindow(photoApp);
        } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
          const musicApp = appRegistry['music-player'];
          if (musicApp) openWindow(musicApp);
        } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
          const videoApp = appRegistry['video-player'];
          if (videoApp) openWindow(videoApp);
        } else {
          const notesApp = appRegistry['notes'];
          if (notesApp) openWindow(notesApp);
        }
      }
    },
    [openWindow, tauriReady]
  );

  const handleIconClick = useCallback((iconId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIcon(iconId);
    setContextMenu(null);
  }, []);

  const handleDesktopClick = useCallback(() => {
    setSelectedIcon(null);
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback(async (e: React.MouseEvent, iconId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, iconId });
    if (iconId) setSelectedIcon(iconId);

    // Check if system clipboard has a valid porcelain icon
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        const parsed = JSON.parse(clipboardText);
        if (parsed.type === 'porcelain-desktop-icon' && parsed.icon) {
          setSystemClipboardHasFile(true);
          setClipboard(parsed.icon);
          return;
        }
      }
    } catch {
      // Ignore clipboard read errors
    }
    setSystemClipboardHasFile(false);
  }, []);

  const handleRemoveIcon = useCallback(() => {
    if (contextMenu?.iconId) {
      removeDesktopIcon(contextMenu.iconId);
      setContextMenu(null);
      setSelectedIcon(null);
    }
  }, [contextMenu, removeDesktopIcon]);

  // Handle creating a new folder on desktop
  const handleNewFolder = useCallback(() => {
    // Find a free position for the new folder
    const usedPositions = new Set(
      desktopIcons.map(icon => `${icon.position.x},${icon.position.y}`)
    );

    let position = { x: 20, y: 20 };
    // If context menu was used, place folder near click position
    if (contextMenu) {
      position = snapToGrid(contextMenu.x, contextMenu.y - 28);
    }

    // Find next free position if occupied
    while (usedPositions.has(`${position.x},${position.y}`)) {
      position.y += GRID_SIZE;
      if (position.y > window.innerHeight - 200) {
        position.y = 20;
        position.x += GRID_SIZE;
      }
    }

    setNewFolderPosition(position);
    setNewFolderName('untitled folder');
    setIsCreatingFolder(true);
    setContextMenu(null);
  }, [contextMenu, desktopIcons]);

  // Finish creating the folder
  const handleFinishNewFolder = useCallback(() => {
    if (newFolderName.trim()) {
      const newIcon: DesktopIcon = {
        id: `desktop-folder-${Date.now()}`,
        name: newFolderName.trim(),
        icon: 'folder',
        position: newFolderPosition,
        isFile: false,
      };
      addDesktopIcon(newIcon);
    }
    setIsCreatingFolder(false);
  }, [newFolderName, newFolderPosition, addDesktopIcon]);

  // Cancel folder creation
  const handleCancelNewFolder = useCallback(() => {
    setIsCreatingFolder(false);
  }, []);

  // Copy selected icon to system clipboard
  const handleCopy = useCallback(async () => {
    console.log('[Desktop] handleCopy called, contextMenu:', contextMenu);
    if (contextMenu?.iconId) {
      const icon = desktopIcons.find(i => i.id === contextMenu.iconId);
      console.log('[Desktop] found icon to copy:', icon);
      if (icon) {
        // Store in local state
        setClipboard(icon);

        // Also write to system clipboard as JSON
        try {
          const clipboardData = JSON.stringify({
            type: 'porcelain-desktop-icon',
            icon: icon,
          });
          await navigator.clipboard.writeText(clipboardData);
          console.log('[Desktop] written to system clipboard:', clipboardData);
        } catch (err) {
          console.error('[Desktop] failed to write to system clipboard:', err);
        }
      }
    }
    setContextMenu(null);
  }, [contextMenu, desktopIcons]);

  // Paste icon from clipboard (reads from system clipboard)
  const handlePaste = useCallback(async () => {
    let iconToPaste: DesktopIcon | null = clipboard;

    // Try to read from system clipboard first
    try {
      const clipboardText = await navigator.clipboard.readText();
      console.log('[Desktop] system clipboard text:', clipboardText);

      if (clipboardText) {
        const parsed = JSON.parse(clipboardText);
        if (parsed.type === 'porcelain-desktop-icon' && parsed.icon) {
          iconToPaste = parsed.icon as DesktopIcon;
          console.log('[Desktop] parsed icon from system clipboard:', iconToPaste);
        }
      }
    } catch (err) {
      console.log('[Desktop] could not read system clipboard, using local:', err);
    }

    if (!iconToPaste) {
      console.log('[Desktop] no icon to paste');
      return;
    }

    // Find a free position near the context menu location or default position
    const usedPositions = new Set(
      desktopIcons.map(icon => `${icon.position.x},${icon.position.y}`)
    );

    let position = contextMenu
      ? snapToGrid(contextMenu.x, contextMenu.y - 28)
      : { x: 110, y: 110 };

    // Find next free position if occupied
    while (usedPositions.has(`${position.x},${position.y}`)) {
      position.y += GRID_SIZE;
      if (position.y > window.innerHeight - 200) {
        position.y = 20;
        position.x += GRID_SIZE;
      }
    }

    // Create a copy of the clipboard item
    const newIcon: DesktopIcon = {
      ...iconToPaste,
      id: `${iconToPaste.id}-copy-${Date.now()}`,
      name: iconToPaste.name.endsWith(' copy') ? iconToPaste.name : `${iconToPaste.name} copy`,
      position,
    };

    addDesktopIcon(newIcon);
    setContextMenu(null);
  }, [clipboard, contextMenu, desktopIcons, addDesktopIcon]);

  // Handle drag over for file drops
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if it's a file being dragged - be more permissive
    const types = Array.from(e.dataTransfer.types);
    console.log('[Desktop] dragOver - types:', types);

    if (types.includes('Files') ||
        types.includes('application/x-porcelain-file') ||
        types.includes('text/plain')) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're leaving the desktop element entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  // Handle file drop on desktop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dropX = e.clientX;
    const dropY = e.clientY - 28; // Adjust for menu bar

    console.log('[Desktop] drop event triggered at:', { dropX, dropY });
    console.log('[Desktop] drop - available types:', Array.from(e.dataTransfer.types));

    // Check for internal file transfer (from FileManager)
    // Try custom type first, then fallback to text/plain
    let porcelainData = '';
    try {
      porcelainData = e.dataTransfer.getData('application/x-porcelain-file');
      console.log('[Desktop] drop - application/x-porcelain-file data:', porcelainData);
    } catch (err) {
      console.log('[Desktop] drop - error getting custom type:', err);
    }

    if (!porcelainData) {
      try {
        porcelainData = e.dataTransfer.getData('text/plain');
        console.log('[Desktop] drop - text/plain data:', porcelainData);
      } catch (err) {
        console.log('[Desktop] drop - error getting text/plain:', err);
      }
    }

    if (porcelainData) {
      try {
        const fileData = JSON.parse(porcelainData);
        console.log('Parsed file data:', fileData);

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

          console.log('Adding new icon:', newIcon);
          addDesktopIcon(newIcon);
          return;
        }
      } catch (err) {
        console.log('Not JSON data, trying as file drop');
      }
    }

    // Handle native file drops (from OS file manager)
    if (e.dataTransfer.files.length > 0) {
      console.log('Native file drop:', e.dataTransfer.files);
      const files = Array.from(e.dataTransfer.files);
      let offsetY = 0;

      for (const file of files) {
        const snapped = snapToGrid(dropX, dropY + offsetY);

        // For native drops, we get the file but not the full path
        let thumbnail: string | undefined;
        if (isImageFile(file.name)) {
          // Create object URL for preview
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
      className={`desktop ${isDragOver ? 'desktop--drag-over' : ''}`}
      style={getWallpaperStyle()}
      onClick={handleDesktopClick}
      onContextMenu={(e) => handleContextMenu(e)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(isDragOver || isDragging) && (
        <div className="desktop__drop-indicator">
          <Icon name="plus" size={32} />
          <span>Drop files here</span>
        </div>
      )}

      <div className="desktop__icons">
        {desktopIcons.map((icon) => (
          <motion.div
            key={icon.id}
            className={`desktop__icon ${selectedIcon === icon.id ? 'desktop__icon--selected' : ''} ${icon.isFile ? 'desktop__icon--file' : ''}`}
            style={{
              left: icon.position.x,
              top: icon.position.y,
            }}
            onClick={(e) => handleIconClick(icon.id, e)}
            onDoubleClick={() => handleIconDoubleClick(icon)}
            onContextMenu={(e) => handleContextMenu(e, icon.id)}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragSnapToOrigin
            onDragStart={() => setSelectedIcon(icon.id)}
            onDragEnd={(_, info) => {
              // Use offset from original position
              const newX = icon.position.x + info.offset.x;
              const newY = icon.position.y + info.offset.y;
              const newPos = snapToGrid(newX, newY);
              console.log('[Desktop] onDragEnd - icon:', icon.name, 'newPos:', newPos);
              updateDesktopIcon(icon.id, { position: newPos });
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`desktop__icon-image ${icon.thumbnail ? 'desktop__icon-image--thumbnail' : ''}`}>
              {icon.thumbnail ? (
                <img
                  src={icon.thumbnail}
                  alt={icon.name}
                  className="desktop__icon-thumbnail"
                  draggable={false}
                />
              ) : (
                <Icon name={icon.icon} size={48} color="var(--color-porcelain-600)" />
              )}
            </div>
            <div className="desktop__icon-label">{icon.name}</div>
          </motion.div>
        ))}
      </div>

      {/* New folder creation UI */}
      {isCreatingFolder && (
        <div
          className="desktop__icon desktop__icon--selected desktop__icon--creating"
          style={{
            transform: `translate(${newFolderPosition.x}px, ${newFolderPosition.y}px)`,
          }}
        >
          <div className="desktop__icon-image">
            <Icon name="folder" size={48} color="var(--color-porcelain-600)" />
          </div>
          <input
            type="text"
            className="desktop__new-folder-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleFinishNewFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFinishNewFolder();
              } else if (e.key === 'Escape') {
                handleCancelNewFolder();
              }
            }}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {contextMenu && (
        <>
          <div
            className="desktop__context-overlay"
            onClick={() => setContextMenu(null)}
          />
          <motion.div
            className="desktop__context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {contextMenu.iconId ? (
              // Icon-specific context menu
              <>
                <div
                  className="desktop__context-item"
                  onClick={() => {
                    const icon = desktopIcons.find(i => i.id === contextMenu.iconId);
                    if (icon) handleIconDoubleClick(icon);
                    setContextMenu(null);
                  }}
                >
                  Open
                </div>
                <div className="desktop__context-divider" />
                <div className="desktop__context-item desktop__context-item--disabled">Get Info</div>
                <div className="desktop__context-item desktop__context-item--disabled">Rename</div>
                <div className="desktop__context-divider" />
                <div
                  className="desktop__context-item"
                  onClick={handleCopy}
                >
                  Copy
                </div>
                <div className="desktop__context-divider" />
                <div
                  className="desktop__context-item desktop__context-item--danger"
                  onClick={handleRemoveIcon}
                >
                  Remove from Desktop
                </div>
              </>
            ) : (
              // Desktop context menu (right-click on empty desktop)
              <>
                <div
                  className="desktop__context-item"
                  onClick={handleNewFolder}
                >
                  New Folder
                </div>
                <div
                  className={`desktop__context-item ${(!clipboard && !systemClipboardHasFile) ? 'desktop__context-item--disabled' : ''}`}
                  onClick={() => {
                    console.log('[Desktop] Paste clicked, clipboard:', clipboard, 'systemClipboardHasFile:', systemClipboardHasFile);
                    if (clipboard || systemClipboardHasFile) {
                      handlePaste();
                    }
                  }}
                >
                  Paste{clipboard ? ` "${clipboard.name}"` : ''}
                </div>
                <div className="desktop__context-divider" />
                <div
                  className="desktop__context-item"
                  onClick={() => {
                    const settingsApp = appRegistry['settings'];
                    if (settingsApp) openWindow(settingsApp);
                    setContextMenu(null);
                  }}
                >
                  Change Desktop Background...
                </div>
                <div className="desktop__context-divider" />
                <div className="desktop__context-item desktop__context-item--disabled">Sort By</div>
                <div className="desktop__context-item desktop__context-item--disabled">Clean Up</div>
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Desktop;
