import React, { useState, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { Icon } from '../../components/Icons';
import type { AppProps, FileNode, ViewMode } from '../../types';
import './FileManager.css';

export const FileManager: React.FC<AppProps> = () => {
  const {
    files,
    currentPath,
    initializeFileSystem,
    getChildren,
    getFileByPath,
    navigateToPath,
    createFolder,
    deleteFile,
    renameFile,
  } = useFileSystemStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    initializeFileSystem();
  }, [initializeFileSystem]);

  const currentFolder = getFileByPath(currentPath);
  const children = currentFolder ? getChildren(currentFolder.id) : [];

  const filteredChildren = searchQuery
    ? children.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : children;

  const handleNavigate = useCallback((file: FileNode) => {
    if (file.type === 'folder') {
      navigateToPath(file.path);
      setSelectedFile(null);
    }
  }, [navigateToPath]);

  const handleBack = useCallback(() => {
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      pathParts.pop();
      navigateToPath('/' + pathParts.join('/') || '/');
    }
  }, [currentPath, navigateToPath]);

  const handleNewFolder = () => {
    if (currentFolder) {
      createFolder('New Folder', currentFolder.id);
    }
  };

  const handleDelete = () => {
    if (selectedFile) {
      deleteFile(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleStartRename = useCallback((file: FileNode) => {
    setRenamingFile(file.id);
    setNewName(file.name);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (renamingFile && newName.trim()) {
      renameFile(renamingFile, newName.trim());
    }
    setRenamingFile(null);
    setNewName('');
  }, [renamingFile, newName, renameFile]);

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') return 'folder';
    if (file.mimeType?.startsWith('image/')) return 'image';
    if (file.mimeType?.startsWith('audio/')) return 'music';
    if (file.mimeType?.startsWith('video/')) return 'video';
    return 'file';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const sidebarItems = [
    { id: 'desktop', name: 'Desktop', icon: 'computer', path: '/Desktop' },
    { id: 'documents', name: 'Documents', icon: 'folder', path: '/Documents' },
    { id: 'downloads', name: 'Downloads', icon: 'download', path: '/Downloads' },
    { id: 'music', name: 'Music', icon: 'music', path: '/Music' },
    { id: 'pictures', name: 'Pictures', icon: 'image', path: '/Pictures' },
    { id: 'videos', name: 'Videos', icon: 'video', path: '/Videos' },
  ];

  return (
    <div className="file-manager">
      <div className="file-manager__toolbar">
        <div className="file-manager__nav-buttons">
          <button
            className="file-manager__nav-btn"
            onClick={handleBack}
            disabled={currentPath === '/'}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <button className="file-manager__nav-btn" disabled>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div className="file-manager__breadcrumb">
          <span
            className="file-manager__breadcrumb-item"
            onClick={() => navigateToPath('/')}
          >
            Root
          </span>
          {currentPath.split('/').filter(Boolean).map((part, index, arr) => (
            <React.Fragment key={index}>
              <span className="file-manager__breadcrumb-sep">/</span>
              <span
                className="file-manager__breadcrumb-item"
                onClick={() => navigateToPath('/' + arr.slice(0, index + 1).join('/'))}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
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
                onClick={() => navigateToPath(item.path)}
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
                  onClick={() => {
                    const file = files[selectedFile];
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

          {filteredChildren.length === 0 ? (
            <div className="file-manager__empty">
              <Icon name="folder" size={48} color="var(--color-porcelain-300)" />
              <p>This folder is empty</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="file-manager__grid">
              {filteredChildren.map((file) => (
                <div
                  key={file.id}
                  className={`file-manager__grid-item ${selectedFile === file.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file.id)}
                  onDoubleClick={() => handleNavigate(file)}
                >
                  <div className="file-manager__grid-icon">
                    <Icon name={getFileIcon(file)} size={40} color="var(--color-porcelain-500)" />
                  </div>
                  {renamingFile === file.id ? (
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
                    <span className="file-manager__grid-name">{file.name}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="file-manager__list">
              <div className="file-manager__list-header">
                <span className="file-manager__list-col file-manager__list-col--name">Name</span>
                <span className="file-manager__list-col file-manager__list-col--date">Date Modified</span>
                <span className="file-manager__list-col file-manager__list-col--size">Size</span>
              </div>
              {filteredChildren.map((file) => (
                <div
                  key={file.id}
                  className={`file-manager__list-item ${selectedFile === file.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file.id)}
                  onDoubleClick={() => handleNavigate(file)}
                >
                  <span className="file-manager__list-col file-manager__list-col--name">
                    <Icon name={getFileIcon(file)} size={16} color="var(--color-porcelain-500)" />
                    {renamingFile === file.id ? (
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
                      <span>{file.name}</span>
                    )}
                  </span>
                  <span className="file-manager__list-col file-manager__list-col--date">
                    {formatDate(file.modifiedAt)}
                  </span>
                  <span className="file-manager__list-col file-manager__list-col--size">
                    {file.type === 'folder' ? '--' : formatSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="file-manager__statusbar">
        {filteredChildren.length} items
        {selectedFile && ` • 1 selected`}
      </div>
    </div>
  );
};

export default FileManager;
