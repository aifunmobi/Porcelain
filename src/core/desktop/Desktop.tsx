import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWindowStore } from '../../stores/windowStore';
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
const snapToGrid = (x: number, y: number) => {
  // Snap to grid
  let snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE + 20;
  let snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE + 20;

  // Clamp to valid boundaries (keep icons visible)
  const minX = 20;
  const minY = 20;
  const maxX = window.innerWidth - 100;  // Leave room for icon width
  const maxY = window.innerHeight - 150; // Leave room for icon height + taskbar

  snappedX = Math.max(minX, Math.min(maxX, snappedX));
  snappedY = Math.max(minY, Math.min(maxY, snappedY));

  return { x: snappedX, y: snappedY };
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
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iconId?: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [tauriReady, setTauriReady] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('untitled folder');
  const [newFolderPosition, setNewFolderPosition] = useState({ x: 20, y: 20 });
  const [clipboard, setClipboard] = useState<DesktopIcon | null>(null);

  // Wait for Tauri to initialize
  useEffect(() => {
    const checkTauri = async () => {
      const ready = await initTauri();
      setTauriReady(ready);
    };
    checkTauri();
  }, []);

  // Global drag and drop event handlers (document level to catch drops from windows)
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      // Only handle porcelain file drags
      if (e.dataTransfer?.types.includes('application/x-porcelain-file') ||
          e.dataTransfer?.types.includes('text/plain')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
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
      setIsDragOver(false);

      console.log('[Desktop Global] drop event');
      console.log('[Desktop Global] types:', e.dataTransfer?.types);

      // Try to get porcelain file data
      let porcelainData = e.dataTransfer?.getData('application/x-porcelain-file') || '';
      if (!porcelainData) {
        porcelainData = e.dataTransfer?.getData('text/plain') || '';
      }

      console.log('[Desktop Global] porcelainData:', porcelainData);

      if (porcelainData) {
        try {
          const fileData = JSON.parse(porcelainData);
          console.log('[Desktop Global] parsed fileData:', fileData);

          if (fileData.name && fileData.path !== undefined && fileData.source === 'porcelain-file-manager') {
            const dropX = e.clientX;
            const dropY = e.clientY - 28; // Adjust for menu bar

            const snapped = snapToGrid(dropX, dropY);

            // Check if there's already an icon at this position
            const existingIcon = desktopIcons.find(
              icon => icon.position.x === snapped.x && icon.position.y === snapped.y
            );

            if (existingIcon) {
              // Offset to next available position
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

            console.log('[Desktop Global] adding icon:', newIcon);
            addDesktopIcon(newIcon);
          }
        } catch (err) {
          console.log('[Desktop Global] Not valid JSON:', err);
        }
      }
    };

    // Add global listeners
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [desktopIcons, addDesktopIcon, tauriReady]);

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
      // If it's an app icon
      if (icon.appId) {
        const app = appRegistry[icon.appId];
        if (app) {
          openWindow(app);
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

  const handleContextMenu = useCallback((e: React.MouseEvent, iconId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, iconId });
    if (iconId) setSelectedIcon(iconId);
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

  // Copy selected icon to clipboard
  const handleCopy = useCallback(() => {
    if (contextMenu?.iconId) {
      const icon = desktopIcons.find(i => i.id === contextMenu.iconId);
      if (icon) {
        setClipboard(icon);
      }
    }
    setContextMenu(null);
  }, [contextMenu, desktopIcons]);

  // Paste icon from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard) return;

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
      ...clipboard,
      id: `${clipboard.id}-copy-${Date.now()}`,
      name: `${clipboard.name} copy`,
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
      {isDragOver && (
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
            onDragStart={() => setSelectedIcon(icon.id)}
            onDragEnd={(_, info) => {
              const newPos = snapToGrid(
                icon.position.x + info.offset.x,
                icon.position.y + info.offset.y
              );
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
            left: newFolderPosition.x,
            top: newFolderPosition.y,
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
              // Desktop context menu
              <>
                <div
                  className="desktop__context-item"
                  onClick={handleNewFolder}
                >
                  New Folder
                </div>
                <div
                  className={`desktop__context-item ${!clipboard ? 'desktop__context-item--disabled' : ''}`}
                  onClick={clipboard ? handlePaste : undefined}
                >
                  Paste
                </div>
                <div className="desktop__context-divider" />
                <div className="desktop__context-item desktop__context-item--disabled">Get Info</div>
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
                <div className="desktop__context-item desktop__context-item--disabled">Use Stacks</div>
                <div className="desktop__context-item desktop__context-item--disabled">Sort By</div>
                <div className="desktop__context-item desktop__context-item--disabled">Clean Up</div>
                <div className="desktop__context-item desktop__context-item--disabled">Clean Up By</div>
                <div className="desktop__context-divider" />
                <div className="desktop__context-item desktop__context-item--disabled">Show View Options</div>
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Desktop;
