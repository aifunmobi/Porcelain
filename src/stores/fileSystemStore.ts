import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { FileNode } from '../types';

interface FileSystemState {
  files: Record<string, FileNode>;
  currentPath: string;

  // Actions
  initializeFileSystem: () => void;
  getFile: (id: string) => FileNode | undefined;
  getFileByPath: (path: string) => FileNode | undefined;
  getChildren: (parentId: string) => FileNode[];
  getChildrenByPath: (path: string) => FileNode[];
  createFile: (name: string, parentId: string, content?: string, mimeType?: string) => string;
  createFolder: (name: string, parentId: string) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  moveFile: (id: string, newParentId: string) => void;
  copyFile: (id: string, newParentId: string) => string;
  updateFileContent: (id: string, content: string) => void;
  getPathParts: (path: string) => string[];
  navigateToPath: (path: string) => void;
}

const createInitialFileSystem = (): Record<string, FileNode> => {
  const now = new Date();

  const files: Record<string, FileNode> = {
    root: {
      id: 'root',
      name: 'Root',
      type: 'folder',
      path: '/',
      parentId: null,
      children: ['desktop', 'documents', 'downloads', 'music', 'pictures', 'videos'],
      size: 0,
      createdAt: now,
      modifiedAt: now,
    },
    desktop: {
      id: 'desktop',
      name: 'Desktop',
      type: 'folder',
      path: '/Desktop',
      parentId: 'root',
      children: [],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'desktop',
    },
    documents: {
      id: 'documents',
      name: 'Documents',
      type: 'folder',
      path: '/Documents',
      parentId: 'root',
      children: ['readme'],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'folder',
    },
    downloads: {
      id: 'downloads',
      name: 'Downloads',
      type: 'folder',
      path: '/Downloads',
      parentId: 'root',
      children: [],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'download',
    },
    music: {
      id: 'music',
      name: 'Music',
      type: 'folder',
      path: '/Music',
      parentId: 'root',
      children: [],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'music',
    },
    pictures: {
      id: 'pictures',
      name: 'Pictures',
      type: 'folder',
      path: '/Pictures',
      parentId: 'root',
      children: [],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'image',
    },
    videos: {
      id: 'videos',
      name: 'Videos',
      type: 'folder',
      path: '/Videos',
      parentId: 'root',
      children: [],
      size: 0,
      createdAt: now,
      modifiedAt: now,
      icon: 'video',
    },
    readme: {
      id: 'readme',
      name: 'Welcome.txt',
      type: 'file',
      path: '/Documents/Welcome.txt',
      parentId: 'documents',
      content: 'Welcome to Porcelain OS!\n\nThis is a beautiful desktop simulation with a soft porcelain aesthetic.\n\nExplore the apps in the dock below to discover all the features.',
      mimeType: 'text/plain',
      size: 156,
      createdAt: now,
      modifiedAt: now,
      icon: 'document',
    },
  };

  return files;
};

export const useFileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      files: {},
      currentPath: '/',

      initializeFileSystem: () => {
        const state = get();
        if (Object.keys(state.files).length === 0) {
          set({ files: createInitialFileSystem() });
        }
      },

      getFile: (id) => get().files[id],

      getFileByPath: (path) => {
        const files = get().files;
        return Object.values(files).find((f) => f.path === path);
      },

      getChildren: (parentId) => {
        const files = get().files;
        const parent = files[parentId];
        if (!parent || !parent.children) return [];
        return parent.children.map((id) => files[id]).filter(Boolean);
      },

      getChildrenByPath: (path) => {
        const file = get().getFileByPath(path);
        if (!file) return [];
        return get().getChildren(file.id);
      },

      createFile: (name, parentId, content = '', mimeType = 'text/plain') => {
        const id = uuidv4();
        const parent = get().files[parentId];
        if (!parent) return '';

        const now = new Date();
        const path = `${parent.path === '/' ? '' : parent.path}/${name}`;

        set((state) => ({
          files: {
            ...state.files,
            [id]: {
              id,
              name,
              type: 'file',
              path,
              parentId,
              content,
              mimeType,
              size: content.length,
              createdAt: now,
              modifiedAt: now,
            },
            [parentId]: {
              ...parent,
              children: [...(parent.children || []), id],
              modifiedAt: now,
            },
          },
        }));

        return id;
      },

      createFolder: (name, parentId) => {
        const id = uuidv4();
        const parent = get().files[parentId];
        if (!parent) return '';

        const now = new Date();
        const path = `${parent.path === '/' ? '' : parent.path}/${name}`;

        set((state) => ({
          files: {
            ...state.files,
            [id]: {
              id,
              name,
              type: 'folder',
              path,
              parentId,
              children: [],
              size: 0,
              createdAt: now,
              modifiedAt: now,
            },
            [parentId]: {
              ...parent,
              children: [...(parent.children || []), id],
              modifiedAt: now,
            },
          },
        }));

        return id;
      },

      deleteFile: (id) => {
        const file = get().files[id];
        if (!file || id === 'root') return;

        // Recursively delete children
        if (file.type === 'folder' && file.children) {
          file.children.forEach((childId) => get().deleteFile(childId));
        }

        set((state) => {
          const newFiles = { ...state.files };
          delete newFiles[id];

          // Remove from parent
          if (file.parentId && newFiles[file.parentId]) {
            newFiles[file.parentId] = {
              ...newFiles[file.parentId],
              children: newFiles[file.parentId].children?.filter((cid) => cid !== id),
              modifiedAt: new Date(),
            };
          }

          return { files: newFiles };
        });
      },

      renameFile: (id, newName) => {
        const file = get().files[id];
        if (!file) return;

        const parent = get().files[file.parentId || 'root'];
        const newPath = `${parent?.path === '/' ? '' : parent?.path}/${newName}`;

        set((state) => ({
          files: {
            ...state.files,
            [id]: {
              ...file,
              name: newName,
              path: newPath,
              modifiedAt: new Date(),
            },
          },
        }));
      },

      moveFile: (id, newParentId) => {
        const file = get().files[id];
        const oldParent = get().files[file?.parentId || 'root'];
        const newParent = get().files[newParentId];
        if (!file || !newParent) return;

        const now = new Date();
        const newPath = `${newParent.path === '/' ? '' : newParent.path}/${file.name}`;

        set((state) => {
          const newFiles = { ...state.files };

          // Update file
          newFiles[id] = { ...file, parentId: newParentId, path: newPath, modifiedAt: now };

          // Remove from old parent
          if (oldParent) {
            newFiles[oldParent.id] = {
              ...oldParent,
              children: oldParent.children?.filter((cid) => cid !== id),
              modifiedAt: now,
            };
          }

          // Add to new parent
          newFiles[newParentId] = {
            ...newParent,
            children: [...(newParent.children || []), id],
            modifiedAt: now,
          };

          return { files: newFiles };
        });
      },

      copyFile: (id, newParentId) => {
        const file = get().files[id];
        const newParent = get().files[newParentId];
        if (!file || !newParent) return '';

        if (file.type === 'folder') {
          const newFolderId = get().createFolder(file.name + ' copy', newParentId);
          file.children?.forEach((childId) => get().copyFile(childId, newFolderId));
          return newFolderId;
        } else {
          return get().createFile(
            file.name.replace(/(\.[^.]+)?$/, ' copy$1'),
            newParentId,
            file.content as string,
            file.mimeType
          );
        }
      },

      updateFileContent: (id, content) => {
        const file = get().files[id];
        if (!file || file.type !== 'file') return;

        set((state) => ({
          files: {
            ...state.files,
            [id]: {
              ...file,
              content,
              size: content.length,
              modifiedAt: new Date(),
            },
          },
        }));
      },

      getPathParts: (path) => {
        return path.split('/').filter(Boolean);
      },

      navigateToPath: (path) => {
        set({ currentPath: path });
      },
    }),
    {
      name: 'porcelain-filesystem',
    }
  )
);
