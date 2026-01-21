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

// Grid snapping constants
const GRID_SIZE = 90;
const MIN_X = 20;
const MIN_Y = 20;
const ICON_WIDTH = 80;
const ICON_HEIGHT = 100;
const DOCK_HEIGHT = 80;
const MENUBAR_HEIGHT = 28;

const snapToGrid = (x: number, y: number) => {
  const winWidth = window.innerWidth || 1920;
  const winHeight = window.innerHeight || 1080;
  const desktopHeight = winHeight - MENUBAR_HEIGHT - DOCK_HEIGHT;
  const desktopWidth = winWidth;

  const maxGridX = Math.max(0, Math.floor((desktopWidth - ICON_WIDTH - MIN_X) / GRID_SIZE));
  const maxGridY = Math.max(0, Math.floor((desktopHeight - ICON_HEIGHT - MIN_Y) / GRID_SIZE));

  let gridX = Math.round((x - MIN_X) / GRID_SIZE);
  let gridY = Math.round((y - MIN_Y) / GRID_SIZE);

  gridX = Math.max(0, Math.min(maxGridX, gridX));
  gridY = Math.max(0, Math.min(maxGridY, gridY));

  return {
    x: gridX * GRID_SIZE + MIN_X,
    y: gridY * GRID_SIZE + MIN_Y
  };
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
  const { isDragging, startDrag, dragData } = useDragStore();

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

  // Expose addIconFromData globally for DragOverlay
  useEffect(() => {
    (window as any).__desktopAddIcon = addIconFromData;
    return () => { delete (window as any).__desktopAddIcon; };
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

  // Handle starting cross-component drag immediately when drag starts
  const handleStartCrossComponentDrag = useCallback((icon: DesktopIcon, pos: { x: number; y: number }) => {
    if (!icon.filePath) return;

    console.log('[Desktop] Starting cross-component drag for file:', icon.name);
    startDrag({
      name: icon.name,
      path: icon.filePath,
      isDirectory: !icon.isFile,
      source: 'desktop',
      iconId: icon.id,
    }, pos);
  }, [startDrag]);

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
            onPositionChange={(pos) => updateDesktopIcon(icon.id, { position: pos })}
            onStartCrossComponentDrag={handleStartCrossComponentDrag}
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
  onPositionChange: (pos: { x: number; y: number }) => void;
  onStartCrossComponentDrag: (icon: DesktopIcon, pos: { x: number; y: number }) => void;
}

const DesktopIconComponent: React.FC<DesktopIconComponentProps> = ({
  icon,
  isSelected,
  isDraggingGlobal,
  draggedIconId,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onPositionChange,
  onStartCrossComponentDrag,
}) => {
  // For icons WITH file paths: use pointer-based drag (handled by DragOverlay)
  // For icons WITHOUT file paths: use framer-motion drag (local desktop movement only)
  const hasFilePath = !!icon.filePath;
  const isThisIconBeingDragged = isDraggingGlobal && draggedIconId === icon.id;

  // Handle pointer down for file-based icons
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!hasFilePath) return;
    if (e.button !== 0) return; // Only left click

    // Don't start drag on double-click
    if (e.detail === 2) return;

    e.preventDefault();
    e.stopPropagation();

    // Start the cross-component drag immediately
    onStartCrossComponentDrag(icon, { x: e.clientX, y: e.clientY });
  }, [hasFilePath, icon, onStartCrossComponentDrag]);

  return (
    <motion.div
      className={`desktop__icon ${isSelected ? 'desktop__icon--selected' : ''} ${icon.isFile ? 'desktop__icon--file' : ''}`}
      style={{
        left: icon.position.x,
        top: icon.position.y,
        // Hide this icon while it's being dragged (DragOverlay shows preview)
        opacity: isThisIconBeingDragged ? 0.3 : 1,
        // CRITICAL: Disable pointer events while dragging so elementFromPoint can see through
        pointerEvents: isThisIconBeingDragged ? 'none' : 'auto',
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onPointerDown={hasFilePath ? handlePointerDown : undefined}
      // Only use framer-motion drag for icons WITHOUT file paths
      drag={!hasFilePath && !isDraggingGlobal}
      dragMomentum={false}
      dragElastic={0}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (hasFilePath || isDraggingGlobal) return;

        const newX = icon.position.x + info.offset.x;
        const newY = icon.position.y + info.offset.y;
        const newPos = snapToGrid(newX, newY);
        onPositionChange(newPos);
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
  );
};

export default Desktop;
