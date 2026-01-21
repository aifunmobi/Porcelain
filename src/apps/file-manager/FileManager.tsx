import React, { useState, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { useDragStore } from '../../stores/dragStore';
import { Icon } from '../../components/Icons';
import type { AppProps, FileNode, ViewMode } from '../../types';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  createDirectory,
  deleteFile as deleteTauriFile,
  renameFile as renameTauriFile,
  copyFileToPath,
  getFileIcon as getTauriFileIcon,
  formatFileSize,
  isImageFile,
} from '../../services/tauriFs';
import type { FileEntry } from '../../services/tauriFs';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import './FileManager.css';

// Type for real file system entries
interface RealFileEntry extends FileEntry {
  id: string;
}

export const FileManager: React.FC<AppProps> = () => {
  // Virtual file system (for browser mode)
  const {
    files,
    currentPath: virtualCurrentPath,
    initializeFileSystem,
    getChildren,
    getFileByPath,
    navigateToPath: virtualNavigateToPath,
    createFolder: virtualCreateFolder,
    deleteFile: virtualDeleteFile,
    renameFile: virtualRenameFile,
  } = useFileSystemStore();

  // Tauri mode state
  const [isInTauri, setIsInTauri] = useState(false);
  const [realCurrentPath, setRealCurrentPath] = useState('');
  const [realFiles, setRealFiles] = useState<RealFileEntry[]>([]);
  const [specialDirs, setSpecialDirs] = useState<Awaited<ReturnType<typeof getSpecialDirs>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  // Initialize
  useEffect(() => {
    const init = async () => {
      const tauriEnv = isTauri();
      setIsInTauri(tauriEnv);

      if (tauriEnv) {
        // Get special directories
        const dirs = await getSpecialDirs();
        setSpecialDirs(dirs);
        // Start at home directory
        if (dirs.home) {
          setRealCurrentPath(dirs.home);
          loadRealDirectory(dirs.home);
        }
      } else {
        // Use virtual file system
        initializeFileSystem();
      }
    };
    init();
  }, [initializeFileSystem]);

  // Load real directory contents
  const loadRealDirectory = async (path: string) => {
    setIsLoading(true);
    setError(null);
    setThumbnails({}); // Clear old thumbnails
    try {
      const entries = await readDirectory(path);
      // Add IDs to entries for selection tracking
      const entriesWithIds: RealFileEntry[] = entries.map((entry) => ({
        ...entry,
        id: entry.path,
      }));
      setRealFiles(entriesWithIds);

      // Load thumbnails for image files
      const imageThumbs: Record<string, string> = {};
      for (const entry of entriesWithIds) {
        if (!entry.isDirectory && isImageFile(entry.name)) {
          try {
            imageThumbs[entry.path] = convertFileSrc(entry.path);
          } catch (err) {
            console.error('Error loading thumbnail:', err);
          }
        }
      }
      setThumbnails(imageThumbs);
    } catch (err) {
      console.error('Error loading directory:', err);
      setError('Unable to read this directory');
      setRealFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation for Tauri mode
  const navigateToRealPath = (path: string) => {
    setRealCurrentPath(path);
    loadRealDirectory(path);
    setSelectedFile(null);
  };

  // Get current path based on mode
  const currentPath = isInTauri ? realCurrentPath : virtualCurrentPath;

  // Get current folder contents based on mode
  const getCurrentChildren = (): (FileNode | RealFileEntry)[] => {
    if (isInTauri) {
      return realFiles;
    }
    const currentFolder = getFileByPath(virtualCurrentPath);
    return currentFolder ? getChildren(currentFolder.id) : [];
  };

  const children = getCurrentChildren();

  // Filter children based on search
  const filteredChildren = searchQuery
    ? children.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : children;

  // Handle navigation / file open
  const handleNavigate = useCallback(async (file: FileNode | RealFileEntry) => {
    const isDir = isInTauri
      ? (file as RealFileEntry).isDirectory
      : (file as FileNode).type === 'folder';

    if (isDir) {
      // Navigate into directory
      if (isInTauri) {
        navigateToRealPath((file as RealFileEntry).path);
      } else {
        virtualNavigateToPath((file as FileNode).path);
      }
      setSelectedFile(null);
    } else {
      // Open file with system default app (Tauri only)
      if (isInTauri) {
        try {
          const filePath = (file as RealFileEntry).path;
          // Use custom Tauri command to open files with default app
          await invoke('open_file_with_default_app', { path: filePath });
        } catch (err) {
          console.error('Error opening file:', err);
          alert('Failed to open file: ' + (err instanceof Error ? err.message : String(err)));
        }
      }
    }
  }, [isInTauri, virtualNavigateToPath]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (isInTauri) {
      // Get parent directory
      const pathParts = realCurrentPath.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        pathParts.pop();
        navigateToRealPath('/' + pathParts.join('/'));
      } else if (pathParts.length === 1) {
        navigateToRealPath('/');
      }
    } else {
      const pathParts = virtualCurrentPath.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        pathParts.pop();
        virtualNavigateToPath('/' + pathParts.join('/') || '/');
      }
    }
  }, [isInTauri, realCurrentPath, virtualCurrentPath, virtualNavigateToPath]);

  // Handle new folder
  const handleNewFolder = async () => {
    if (isInTauri) {
      const folderName = prompt('Enter folder name:');
      if (folderName) {
        try {
          await createDirectory(`${realCurrentPath}/${folderName}`);
          loadRealDirectory(realCurrentPath);
        } catch (err) {
          console.error('Error creating folder:', err);
          alert('Failed to create folder');
        }
      }
    } else {
      const currentFolder = getFileByPath(virtualCurrentPath);
      if (currentFolder) {
        virtualCreateFolder('New Folder', currentFolder.id);
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedFile) return;

    if (isInTauri) {
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          await deleteTauriFile(selectedFile);
          loadRealDirectory(realCurrentPath);
          setSelectedFile(null);
        } catch (err) {
          console.error('Error deleting file:', err);
          alert('Failed to delete item');
        }
      }
    } else {
      virtualDeleteFile(selectedFile);
      setSelectedFile(null);
    }
  };

  // Handle rename
  const handleStartRename = useCallback((file: FileNode | RealFileEntry) => {
    const id = isInTauri ? (file as RealFileEntry).path : (file as FileNode).id;
    setRenamingFile(id);
    setNewName(file.name);
  }, [isInTauri]);

  const handleFinishRename = useCallback(async () => {
    if (renamingFile && newName.trim()) {
      if (isInTauri) {
        try {
          const oldPath = renamingFile;
          const pathParts = oldPath.split('/');
          pathParts.pop();
          const newPath = `${pathParts.join('/')}/${newName.trim()}`;
          await renameTauriFile(oldPath, newPath);
          loadRealDirectory(realCurrentPath);
        } catch (err) {
          console.error('Error renaming file:', err);
          alert('Failed to rename item');
        }
      } else {
        virtualRenameFile(renamingFile, newName.trim());
      }
    }
    setRenamingFile(null);
    setNewName('');
  }, [renamingFile, newName, isInTauri, realCurrentPath, virtualRenameFile]);

  // Get file icon
  const getFileIconName = (file: FileNode | RealFileEntry): string => {
    if (isInTauri) {
      const realFile = file as RealFileEntry;
      return getTauriFileIcon(realFile.name, realFile.isDirectory);
    }
    const virtualFile = file as FileNode;
    if (virtualFile.type === 'folder') return 'folder';
    if (virtualFile.mimeType?.startsWith('image/')) return 'image';
    if (virtualFile.mimeType?.startsWith('audio/')) return 'music';
    if (virtualFile.mimeType?.startsWith('video/')) return 'video';
    return 'file';
  };

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return '--';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Format size
  const formatSize = (file: FileNode | RealFileEntry) => {
    if (isInTauri) {
      const realFile = file as RealFileEntry;
      if (realFile.isDirectory) return '--';
      return realFile.size !== undefined ? formatFileSize(realFile.size) : '--';
    }
    const virtualFile = file as FileNode;
    if (virtualFile.type === 'folder') return '--';
    return formatFileSize(virtualFile.size);
  };

  // Get file ID for selection
  const getFileId = (file: FileNode | RealFileEntry): string => {
    return isInTauri ? (file as RealFileEntry).path : (file as FileNode).id;
  };

  // Get drag store
  const { startDrag, isDragging, dragData, endDrag } = useDragStore();
  const [pendingDrag, setPendingDrag] = useState<{
    file: FileNode | RealFileEntry;
    startX: number;
    startY: number;
  } | null>(null);

  // Track if we're a drop target (dragging from desktop)
  const isDropTarget = isDragging && dragData?.source === 'desktop';

  // Threshold for starting drag (pixels)
  const DRAG_THRESHOLD = 5;

  // Use pointer events instead of native drag - bypasses React-Rnd interference
  const handlePointerDown = useCallback((e: React.PointerEvent, file: FileNode | RealFileEntry) => {
    // Only start drag on primary button (left click)
    if (e.button !== 0) return;

    // Don't start drag if clicking on rename input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    e.stopPropagation();

    // Store the pending drag info - we'll start the actual drag after movement threshold
    setPendingDrag({
      file,
      startX: e.clientX,
      startY: e.clientY,
    });

    console.log('[FileManager] pointerDown - pending drag for:', file.name);
  }, []);

  // Handle drops from desktop icons
  useEffect(() => {
    const handleDesktopDrop = async (e: CustomEvent<{ name: string; path: string; isDirectory: boolean; iconId?: string }>) => {
      const data = e.detail;
      console.log('[FileManager] received drop from desktop:', data);

      if (!isInTauri) {
        console.log('[FileManager] virtual file system - skipping copy');
        return;
      }

      // Validate source path
      const sourcePath = data.path;
      if (!sourcePath || sourcePath === '') {
        console.error('[FileManager] No source path provided for drop!');
        alert('Cannot copy: The desktop icon does not have a file path. Try dragging from the File Manager first.');
        return;
      }

      // Build destination path - avoid double slashes
      const cleanCurrentPath = realCurrentPath.endsWith('/') ? realCurrentPath.slice(0, -1) : realCurrentPath;
      const destPath = `${cleanCurrentPath}/${data.name}`;

      console.log('[FileManager] copying from:', sourcePath, 'to:', destPath);

      try {
        await copyFileToPath(sourcePath, destPath);
        console.log('[FileManager] successfully copied file to:', destPath);
        // Refresh the directory listing
        loadRealDirectory(realCurrentPath);
      } catch (err) {
        console.error('[FileManager] Error copying file:', err);
        alert('Failed to copy file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };

    window.addEventListener('porcelain-drop-to-filemanager', handleDesktopDrop as unknown as EventListener);

    return () => {
      window.removeEventListener('porcelain-drop-to-filemanager', handleDesktopDrop as unknown as EventListener);
    };
  }, [isInTauri, realCurrentPath]);

  // Handle pointer move to detect drag threshold
  useEffect(() => {
    if (!pendingDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!pendingDrag || isDragging) return;

      const dx = Math.abs(e.clientX - pendingDrag.startX);
      const dy = Math.abs(e.clientY - pendingDrag.startY);

      // Start drag if moved beyond threshold
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        const file = pendingDrag.file;
        const isDir = isInTauri
          ? (file as RealFileEntry).isDirectory
          : (file as FileNode).type === 'folder';

        const transferData = {
          name: file.name,
          path: isInTauri ? (file as RealFileEntry).path : (file as FileNode).path,
          isDirectory: isDir,
          source: 'file-manager' as const,
        };

        console.log('[FileManager] threshold exceeded - starting drag:', transferData);
        startDrag(transferData, { x: e.clientX, y: e.clientY });
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
  }, [pendingDrag, isDragging, isInTauri, startDrag]);

  // Sidebar items
  const getSidebarItems = () => {
    if (isInTauri && specialDirs) {
      return [
        { id: 'home', name: 'Home', icon: 'home', path: specialDirs.home },
        { id: 'desktop', name: 'Desktop', icon: 'computer', path: specialDirs.desktop },
        { id: 'documents', name: 'Documents', icon: 'folder', path: specialDirs.documents },
        { id: 'downloads', name: 'Downloads', icon: 'download', path: specialDirs.downloads },
        { id: 'pictures', name: 'Pictures', icon: 'image', path: specialDirs.pictures },
        { id: 'music', name: 'Music', icon: 'music', path: specialDirs.music },
        { id: 'videos', name: 'Videos', icon: 'video', path: specialDirs.videos },
      ];
    }
    return [
      { id: 'desktop', name: 'Desktop', icon: 'computer', path: '/Desktop' },
      { id: 'documents', name: 'Documents', icon: 'folder', path: '/Documents' },
      { id: 'downloads', name: 'Downloads', icon: 'download', path: '/Downloads' },
      { id: 'music', name: 'Music', icon: 'music', path: '/Music' },
      { id: 'pictures', name: 'Pictures', icon: 'image', path: '/Pictures' },
      { id: 'videos', name: 'Videos', icon: 'video', path: '/Videos' },
    ];
  };

  const sidebarItems = getSidebarItems();

  // Handle sidebar navigation
  const handleSidebarNavigate = (path: string) => {
    if (isInTauri) {
      navigateToRealPath(path);
    } else {
      virtualNavigateToPath(path);
    }
  };

  // Get display path for breadcrumb
  const getDisplayPath = () => {
    if (isInTauri) {
      // Show a simplified path
      if (specialDirs) {
        if (realCurrentPath === specialDirs.home) return ['Home'];
        if (realCurrentPath.startsWith(specialDirs.home)) {
          return ['Home', ...realCurrentPath.replace(specialDirs.home, '').split('/').filter(Boolean)];
        }
      }
      return realCurrentPath.split('/').filter(Boolean);
    }
    return virtualCurrentPath.split('/').filter(Boolean);
  };

  const pathParts = getDisplayPath();

  // Check if at root
  const isAtRoot = isInTauri ? realCurrentPath === '/' : virtualCurrentPath === '/';

  // Handle pointer up directly on file manager - this catches drops from desktop
  const handleFileManagerPointerUp = useCallback(async (e: React.PointerEvent) => {
    // Only handle if we're a drop target (desktop item is being dragged)
    if (!isDropTarget || !dragData) return;

    e.stopPropagation();
    e.preventDefault();

    // End the drag immediately to prevent DragOverlay from also handling it
    const capturedDragData = { ...dragData };
    endDrag();

    console.log('[FileManager] direct pointerUp - handling drop from desktop:', capturedDragData);

    if (!isInTauri) {
      console.log('[FileManager] virtual file system - skipping copy');
      return;
    }

    const sourcePath = capturedDragData.path;
    if (!sourcePath || sourcePath === '') {
      console.error('[FileManager] No source path provided!');
      return;
    }

    const cleanCurrentPath = realCurrentPath.endsWith('/') ? realCurrentPath.slice(0, -1) : realCurrentPath;
    const destPath = `${cleanCurrentPath}/${capturedDragData.name}`;

    console.log('[FileManager] copying from:', sourcePath, 'to:', destPath);

    try {
      await copyFileToPath(sourcePath, destPath);
      console.log('[FileManager] successfully copied file!');
      loadRealDirectory(realCurrentPath);
    } catch (err) {
      console.error('[FileManager] Error copying file:', err);
    }
  }, [isDropTarget, dragData, isInTauri, realCurrentPath, endDrag]);

  return (
    <div
      className={`file-manager ${isDropTarget ? 'file-manager--drop-target' : ''}`}
      onPointerUp={handleFileManagerPointerUp}
    >
      <div className="file-manager__toolbar">
        <div className="file-manager__nav-buttons">
          <button
            className="file-manager__nav-btn"
            onClick={handleBack}
            disabled={isAtRoot || (isInTauri && realCurrentPath === specialDirs?.home)}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <button className="file-manager__nav-btn" disabled>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div className="file-manager__breadcrumb">
          {isInTauri ? (
            <>
              <span
                className="file-manager__breadcrumb-item"
                onClick={() => specialDirs && navigateToRealPath(specialDirs.home)}
              >
                Home
              </span>
              {pathParts.slice(1).map((part, index) => (
                <React.Fragment key={index}>
                  <span className="file-manager__breadcrumb-sep">/</span>
                  <span className="file-manager__breadcrumb-item">
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </>
          ) : (
            <>
              <span
                className="file-manager__breadcrumb-item"
                onClick={() => virtualNavigateToPath('/')}
              >
                Root
              </span>
              {pathParts.map((part, index, arr) => (
                <React.Fragment key={index}>
                  <span className="file-manager__breadcrumb-sep">/</span>
                  <span
                    className="file-manager__breadcrumb-item"
                    onClick={() => virtualNavigateToPath('/' + arr.slice(0, index + 1).join('/'))}
                  >
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </>
          )}
        </div>

        <div className="file-manager__search">
          <Icon name="search" size={14} color="var(--color-porcelain-400)" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="file-manager__view-modes">
          <button
            className={`file-manager__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Icon name="grid" size={16} />
          </button>
          <button
            className={`file-manager__view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <Icon name="list" size={16} />
          </button>
        </div>
      </div>

      <div className="file-manager__main">
        <div className="file-manager__sidebar">
          <div className="file-manager__sidebar-section">
            <div className="file-manager__sidebar-title">Favorites</div>
            {sidebarItems.map((item) => (
              <div
                key={item.id}
                className={`file-manager__sidebar-item ${currentPath === item.path ? 'active' : ''}`}
                onClick={() => handleSidebarNavigate(item.path)}
              >
                <Icon name={item.icon} size={16} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="file-manager__content">
          <div className="file-manager__actions">
            <button className="file-manager__action-btn" onClick={handleNewFolder}>
              <Icon name="plus" size={14} />
              New Folder
            </button>
            {selectedFile && (
              <>
                <button
                  className="file-manager__action-btn"
                  onClick={async () => {
                    const file = isInTauri
                      ? realFiles.find(f => f.path === selectedFile)
                      : files[selectedFile];
                    if (file) {
                      // Copy to system clipboard for paste on desktop
                      const iconData = {
                        type: 'porcelain-desktop-icon',
                        icon: {
                          id: `file-${Date.now()}`,
                          name: file.name,
                          icon: isInTauri
                            ? ((file as RealFileEntry).isDirectory ? 'folder' : 'file')
                            : ((file as FileNode).type === 'folder' ? 'folder' : 'file'),
                          position: { x: 20, y: 20 },
                          isFile: isInTauri
                            ? !(file as RealFileEntry).isDirectory
                            : (file as FileNode).type !== 'folder',
                          filePath: isInTauri ? (file as RealFileEntry).path : (file as FileNode).path,
                        },
                      };
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(iconData));
                        console.log('[FileManager] Copied to clipboard:', iconData);
                      } catch (err) {
                        console.error('[FileManager] Failed to copy:', err);
                      }
                    }
                  }}
                >
                  <Icon name="copy" size={14} />
                  Copy
                </button>
                <button
                  className="file-manager__action-btn"
                  onClick={() => {
                    const file = isInTauri
                      ? realFiles.find(f => f.path === selectedFile)
                      : files[selectedFile];
                    if (file) handleStartRename(file);
                  }}
                >
                  Rename
                </button>
                <button
                  className="file-manager__action-btn file-manager__action-btn--danger"
                  onClick={handleDelete}
                >
                  <Icon name="trash" size={14} />
                  Delete
                </button>
              </>
            )}
          </div>

          {isLoading ? (
            <div className="file-manager__loading">
              <div className="file-manager__loading-spinner" />
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="file-manager__empty">
              <Icon name="alert" size={48} color="var(--color-error)" />
              <p>{error}</p>
            </div>
          ) : filteredChildren.length === 0 ? (
            <div className="file-manager__empty">
              <Icon name="folder" size={48} color="var(--color-porcelain-300)" />
              <p>This folder is empty</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-manager__grid">
              {filteredChildren.map((file) => {
                const fileId = getFileId(file);
                const hasThumbnail = isInTauri && thumbnails[fileId];
                return (
                  <div
                    key={fileId}
                    className={`file-manager__grid-item ${selectedFile === fileId ? 'selected' : ''}`}
                    onClick={() => setSelectedFile(fileId)}
                    onDoubleClick={() => handleNavigate(file)}
                    onPointerDown={(e) => handlePointerDown(e, file)}
                  >
                    <div className="file-manager__grid-icon">
                      {hasThumbnail ? (
                        <img
                          src={thumbnails[fileId]}
                          alt={file.name}
                          className="file-manager__thumbnail"
                        />
                      ) : (
                        <Icon name={getFileIconName(file)} size={40} color="var(--color-porcelain-500)" />
                      )}
                    </div>
                    {renamingFile === fileId ? (
                      <input
                        className="file-manager__rename-input"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={handleFinishRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename();
                          if (e.key === 'Escape') setRenamingFile(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="file-manager__grid-name" title={file.name}>{file.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="file-manager__list">
              <div className="file-manager__list-header">
                <span className="file-manager__list-col file-manager__list-col--name">Name</span>
                <span className="file-manager__list-col file-manager__list-col--date">Date Modified</span>
                <span className="file-manager__list-col file-manager__list-col--size">Size</span>
              </div>
              {filteredChildren.map((file) => {
                const fileId = getFileId(file);
                const modDate = isInTauri
                  ? (file as RealFileEntry).modifiedAt
                  : (file as FileNode).modifiedAt;
                const hasListThumbnail = isInTauri && thumbnails[fileId];
                return (
                  <div
                    key={fileId}
                    className={`file-manager__list-item ${selectedFile === fileId ? 'selected' : ''}`}
                    onClick={() => setSelectedFile(fileId)}
                    onDoubleClick={() => handleNavigate(file)}
                    onPointerDown={(e) => handlePointerDown(e, file)}
                  >
                    <span className="file-manager__list-col file-manager__list-col--name">
                      {hasListThumbnail ? (
                        <img
                          src={thumbnails[fileId]}
                          alt={file.name}
                          className="file-manager__list-thumbnail"
                        />
                      ) : (
                        <Icon name={getFileIconName(file)} size={16} color="var(--color-porcelain-500)" />
                      )}
                      {renamingFile === fileId ? (
                        <input
                          className="file-manager__rename-input"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onBlur={handleFinishRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename();
                            if (e.key === 'Escape') setRenamingFile(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span title={file.name}>{file.name}</span>
                      )}
                    </span>
                    <span className="file-manager__list-col file-manager__list-col--date">
                      {formatDate(modDate)}
                    </span>
                    <span className="file-manager__list-col file-manager__list-col--size">
                      {formatSize(file)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="file-manager__statusbar">
        {isInTauri && <span className="file-manager__statusbar-tauri">📁 Real File System</span>}
        {filteredChildren.length} items
        {selectedFile && ` • 1 selected`}
      </div>
    </div>
  );
};

export default FileManager;
