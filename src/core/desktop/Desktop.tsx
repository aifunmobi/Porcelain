import React, { useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWindowStore } from '../../stores/windowStore';
import { useDragStore } from '../../stores/dragStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import {
  snapToGrid,
  isImageFile,
  getFileIcon,
  GRID_SIZE,
} from '../../utils/desktop';
import type { DesktopIcon } from '../../types';
import './Desktop.css';

// Check if running in Tauri
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let convertFileSrc: ((path: string) => string) | null = null;

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

initTauri();

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
  const { isDragging, startDrag, dragData, endDrag } = useDragStore();

  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iconId?: string } | null>(null);
  const [tauriReady, setTauriReady] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('untitled folder');
  const [newFolderPosition, setNewFolderPosition] = useState({ x: 20, y: 20 });
  const [clipboard, setClipboard] = useState<DesktopIcon | null>(null);

  useEffect(() => {
    const checkTauri = async () => {
      const ready = await initTauri();
      setTauriReady(ready);
    };
    checkTauri();
  }, []);

  // Helper function to add icon from dropped file data
  const addIconFromData = useCallback((fileData: { name: string; path: string; isDirectory: boolean }, dropX: number, dropY: number) => {
    const snapped = snapToGrid(dropX, dropY);

    // Avoid placing on existing icon
    const existingIcon = desktopIcons.find(
      icon => icon.position.x === snapped.x && icon.position.y === snapped.y
    );
    if (existingIcon) {
      snapped.y += GRID_SIZE;
    }

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

  // Listen for add icon events from DragOverlay (type-safe alternative to global function)
  useEffect(() => {
    const handleAddIcon = (e: CustomEvent<{ name: string; path: string; isDirectory: boolean; x: number; y: number }>) => {
      const { name, path, isDirectory, x, y } = e.detail;
      addIconFromData({ name, path, isDirectory }, x, y);
    };

    window.addEventListener('porcelain-add-desktop-icon', handleAddIcon as EventListener);
    return () => {
      window.removeEventListener('porcelain-add-desktop-icon', handleAddIcon as EventListener);
    };
  }, [addIconFromData]);

  // Listen for icon reposition events from DragOverlay
  useEffect(() => {
    const handleReposition = (e: CustomEvent<{ iconId: string; x: number; y: number }>) => {
      const { iconId, x, y } = e.detail;
      const newPos = snapToGrid(x, y);
      console.log('[Desktop] repositioning icon:', iconId, 'to', newPos);
      updateDesktopIcon(iconId, { position: newPos });
    };

    window.addEventListener('porcelain-reposition-desktop-icon', handleReposition as unknown as EventListener);
    return () => {
      window.removeEventListener('porcelain-reposition-desktop-icon', handleReposition as unknown as EventListener);
    };
  }, [updateDesktopIcon]);

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

      // If it's an app icon, open the app
      if (icon.appId) {
        const app = appRegistry[icon.appId];
        if (app) {
          openWindow(app);
        }
        return;
      }

      // If it's a folder (with or without filePath)
      if (!icon.isFile) {
        const fileManagerApp = appRegistry['file-manager'];
        if (fileManagerApp) {
          openWindow(fileManagerApp);
        }
        return;
      }

      // If it's a file with a real path, open with system default app
      if (icon.filePath && icon.isFile && tauriReady && invoke) {
        try {
          await invoke('open_file_with_default_app', { path: icon.filePath });
        } catch (err) {
          console.error('Error opening file:', err);
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
    if (iconId) {
      setSelectedIcon(iconId);
    }
  }, []);

  const handleNewFolder = useCallback((x: number, y: number) => {
    setNewFolderPosition(snapToGrid(x - 40, y - 50));
    setNewFolderName('untitled folder');
    setIsCreatingFolder(true);
    setContextMenu(null);
  }, []);

  const handleFinishNewFolder = useCallback(() => {
    if (newFolderName.trim()) {
      const newIcon: DesktopIcon = {
        id: `folder-${Date.now()}`,
        name: newFolderName.trim(),
        icon: 'folder',
        position: newFolderPosition,
        isFile: false,
      };
      addDesktopIcon(newIcon);
    }
    setIsCreatingFolder(false);
    setNewFolderName('untitled folder');
  }, [newFolderName, newFolderPosition, addDesktopIcon]);

  const handleCancelNewFolder = useCallback(() => {
    setIsCreatingFolder(false);
    setNewFolderName('untitled folder');
  }, []);

  const handleCopyIcon = useCallback(() => {
    if (selectedIcon) {
      const icon = desktopIcons.find(i => i.id === selectedIcon);
      if (icon) {
        setClipboard(icon);
      }
    }
    setContextMenu(null);
  }, [selectedIcon, desktopIcons]);

  const handlePasteIcon = useCallback((x: number, y: number) => {
    if (clipboard) {
      const snapped = snapToGrid(x - 40, y - 50);
      const newIcon: DesktopIcon = {
        ...clipboard,
        id: `${clipboard.id}-copy-${Date.now()}`,
        name: `${clipboard.name} copy`,
        position: snapped,
      };
      addDesktopIcon(newIcon);
    }
    setContextMenu(null);
  }, [clipboard, addDesktopIcon]);

  const handleDeleteIcon = useCallback(() => {
    if (selectedIcon) {
      removeDesktopIcon(selectedIcon);
      setSelectedIcon(null);
    }
    setContextMenu(null);
  }, [selectedIcon, removeDesktopIcon]);

  // Show visual indicator when dragging from file manager over desktop
  const showDropIndicator = isDragging && dragData?.source === 'file-manager';

  // Handle starting cross-component drag - now works for all icons
  const handleStartCrossComponentDrag = useCallback((icon: DesktopIcon, pos: { x: number; y: number }) => {
    console.log('[Desktop] Starting cross-component drag for:', icon.name, 'hasPath:', !!icon.filePath);
    startDrag({
      name: icon.name,
      path: icon.filePath || '', // Virtual folders have empty path
      isDirectory: !icon.isFile,
      source: 'desktop',
      iconId: icon.id,
    }, pos);
  }, [startDrag]);

  // Handle dropping a file/folder onto a desktop folder
  const handleDropToFolder = useCallback(async (targetFolder: DesktopIcon) => {
    if (!dragData || targetFolder.isFile) return;

    console.log('[Desktop] dropping', dragData.name, 'into folder:', targetFolder.name);

    // Capture the data we need before ending the drag
    const sourcePath = dragData.path;
    const sourceIconId = dragData.iconId;
    const sourceType = dragData.source;
    const fileName = dragData.name;

    // End the drag immediately
    endDrag();

    // If the target folder has a real path (Tauri), copy the file there
    if (targetFolder.filePath && sourcePath && tauriReady && invoke) {
      try {
        const destPath = `${targetFolder.filePath}/${fileName}`;
        console.log('[Desktop] copying from:', sourcePath, 'to:', destPath);

        // Import copyFileToPath dynamically
        const { copyFileToPath } = await import('../../services/tauriFs');
        await copyFileToPath(sourcePath, destPath);
        console.log('[Desktop] successfully copied file to folder');
      } catch (err) {
        console.error('[Desktop] Error copying file to folder:', err);
      }
    } else {
      console.log('[Desktop] virtual folder drop - no real file operation');
    }

    // Remove the dragged icon from desktop if it was a desktop icon
    if (sourceType === 'desktop' && sourceIconId) {
      removeDesktopIcon(sourceIconId);
    }
  }, [dragData, tauriReady, removeDesktopIcon, endDrag]);

  return (
    <div
      className={`desktop ${showDropIndicator ? 'desktop--drag-over' : ''}`}
      style={getWallpaperStyle()}
      onClick={handleDesktopClick}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Desktop Icons */}
      <div className="desktop__icons">
        {desktopIcons.map((icon) => (
          <DesktopIconComponent
            key={icon.id}
            icon={icon}
            isSelected={selectedIcon === icon.id}
            isDraggingGlobal={isDragging}
            draggedIconId={dragData?.iconId || null}
            onSelect={(e) => handleIconClick(icon.id, e)}
            onDoubleClick={() => handleIconDoubleClick(icon)}
            onContextMenu={(e) => handleContextMenu(e, icon.id)}
            onStartCrossComponentDrag={handleStartCrossComponentDrag}
            onDropToFolder={handleDropToFolder}
          />
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

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="desktop__context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.iconId ? (
            <>
              <button
                className="desktop__context-menu-item"
                onClick={() => {
                  const icon = desktopIcons.find(i => i.id === contextMenu.iconId);
                  if (icon) handleIconDoubleClick(icon);
                  setContextMenu(null);
                }}
              >
                Open
              </button>
              <button className="desktop__context-menu-item" onClick={handleCopyIcon}>
                Copy
              </button>
              <div className="desktop__context-menu-divider" />
              <button
                className="desktop__context-menu-item desktop__context-menu-item--danger"
                onClick={handleDeleteIcon}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                className="desktop__context-menu-item"
                onClick={() => handleNewFolder(contextMenu.x, contextMenu.y)}
              >
                New Folder
              </button>
              {clipboard && (
                <button
                  className="desktop__context-menu-item"
                  onClick={() => handlePasteIcon(contextMenu.x, contextMenu.y)}
                >
                  Paste
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Separate component for desktop icon to handle its own drag state
interface DesktopIconComponentProps {
  icon: DesktopIcon;
  isSelected: boolean;
  isDraggingGlobal: boolean;
  draggedIconId: string | null;
  onSelect: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onStartCrossComponentDrag: (icon: DesktopIcon, pos: { x: number; y: number }) => void;
  onDropToFolder: (targetIcon: DesktopIcon) => void;
}

const DesktopIconComponent: React.FC<DesktopIconComponentProps> = ({
  icon,
  isSelected,
  isDraggingGlobal,
  draggedIconId,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onStartCrossComponentDrag,
  onDropToFolder,
}) => {
  const [pendingDrag, setPendingDrag] = useState<{ startX: number; startY: number } | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  // Threshold for starting drag (pixels)
  const DRAG_THRESHOLD = 5;

  const isThisIconBeingDragged = isDraggingGlobal && draggedIconId === icon.id;

  // This folder can accept drops if:
  // - It's a folder (not a file)
  // - Something is being dragged
  // - It's not the icon being dragged itself
  const canAcceptDrop = !icon.isFile && isDraggingGlobal && draggedIconId !== icon.id;

  // Handle pointer down - start tracking potential drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click

    // Don't start drag on double-click
    if (e.detail === 2) return;

    e.stopPropagation();

    // Store the pending drag info - we'll start the actual drag after movement threshold
    setPendingDrag({
      startX: e.clientX,
      startY: e.clientY,
    });
  }, []);

  // Handle pointer move to detect drag threshold
  useEffect(() => {
    if (!pendingDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!pendingDrag || isDraggingGlobal) return;

      const dx = Math.abs(e.clientX - pendingDrag.startX);
      const dy = Math.abs(e.clientY - pendingDrag.startY);

      // Start drag if moved beyond threshold
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        console.log('[DesktopIcon] threshold exceeded - starting drag for:', icon.name);
        onStartCrossComponentDrag(icon, { x: e.clientX, y: e.clientY });
        setPendingDrag(null);
      }
    };

    const handlePointerUp = () => {
      // Clear pending drag on mouse up (click without drag)
      setPendingDrag(null);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [pendingDrag, isDraggingGlobal, icon, onStartCrossComponentDrag]);

  // Handle pointer enter/leave for drop target highlighting
  const handlePointerEnter = useCallback(() => {
    if (canAcceptDrop) {
      setIsDropTarget(true);
    }
  }, [canAcceptDrop]);

  const handlePointerLeave = useCallback(() => {
    setIsDropTarget(false);
  }, []);

  // Handle drop on this folder
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (canAcceptDrop && isDropTarget) {
      e.stopPropagation();
      e.preventDefault();
      console.log('[DesktopIcon] dropping on folder:', icon.name);
      onDropToFolder(icon);
      setIsDropTarget(false);
    }
  }, [canAcceptDrop, isDropTarget, icon, onDropToFolder]);

  return (
    <motion.div
      className={`desktop__icon ${isSelected ? 'desktop__icon--selected' : ''} ${icon.isFile ? 'desktop__icon--file' : ''} ${isDropTarget ? 'desktop__icon--drop-target' : ''}`}
      style={{
        left: icon.position.x,
        top: icon.position.y,
        // Hide this icon while it's being dragged (DragOverlay shows preview)
        opacity: isThisIconBeingDragged ? 0.3 : 1,
        // CRITICAL: Keep pointer events enabled so folders can receive drops
        pointerEvents: isThisIconBeingDragged ? 'none' : 'auto',
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      // Disable framer-motion drag - we use pointer events for all icons now
      drag={false}
      whileHover={{ scale: isDropTarget ? 1.1 : 1.05 }}
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
  );
};

export default Desktop;
