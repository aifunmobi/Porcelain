import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { FileNode } from '../types';
import { blobStore, isIdbMarker, idbMarkerFor } from '../services/blobStore';

interface FileSystemState {
  files: Record<string, FileNode>;
  currentPath: string;

  // Actions
  initializeFileSystem: () => void;
  getFile: (id: string) => FileNode | undefined;
  getFileByPath: (path: string) => FileNode | undefined;
  getChildren: (parentId: string) => FileNode[];
  getChildrenByPath: (path: string) => FileNode[];
  /** `size` overrides the size derived from `content` (bytes held in IndexedDB). */
  createFile: (name: string, parentId: string, content?: string, mimeType?: string, size?: number) => string;
  createFolder: (name: string, parentId: string) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  moveFile: (id: string, newParentId: string) => void;
  /** `newName` omitted keeps the " copy" suffix; pass one to place it verbatim. */
  copyFile: (id: string, newParentId: string, newName?: string) => string;
  updateFileContent: (id: string, content: string, size?: number) => void;
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

/**
 * Bytes a node's content stands for. Binary files are held as base64 data
 * URLs, whose string length overstates the real size by a third.
 */
const contentSize = (content: string): number => {
  if (isIdbMarker(content)) return 0; // the caller passes the real size
  if (!content.startsWith('data:')) return new TextEncoder().encode(content).length;
  const comma = content.indexOf(',');
  const header = content.slice(0, comma);
  const payload = content.slice(comma + 1);
  if (!header.includes(';base64')) return payload.length;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
};

/**
 * A folder's path is baked into every descendant, so moving or renaming one has
 * to re-path the whole subtree — otherwise lookups by path orphan the children.
 */
const repath = (files: Record<string, FileNode>, id: string, newPath: string) => {
  const node = files[id];
  if (!node) return;
  files[id] = { ...node, path: newPath };
  node.children?.forEach((childId) => {
    const child = files[childId];
    if (child) repath(files, childId, `${newPath === '/' ? '' : newPath}/${child.name}`);
  });
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

      createFile: (name, parentId, content = '', mimeType = 'text/plain', size) => {
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
              size: size ?? contentSize(content),
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
        if (isIdbMarker(file.content)) void blobStore.remove(id);

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

        set((state) => {
          const newFiles = { ...state.files };
          newFiles[id] = { ...file, name: newName, modifiedAt: new Date() };
          repath(newFiles, id, newPath);
          return { files: newFiles };
        });
      },

      moveFile: (id, newParentId) => {
        const file = get().files[id];
        const oldParent = get().files[file?.parentId || 'root'];
        const newParent = get().files[newParentId];
        if (!file || !newParent || id === 'root') return;
        if (file.parentId === newParentId) return;
        // A folder cannot be moved into itself or one of its own descendants:
        // repath would loop and the subtree would vanish from every listing.
        if (
          newParentId === id ||
          newParent.path.startsWith(`${file.path === '/' ? '' : file.path}/`)
        ) {
          return;
        }

        const now = new Date();
        const newPath = `${newParent.path === '/' ? '' : newParent.path}/${file.name}`;

        set((state) => {
          const newFiles = { ...state.files };

          // Update file, carrying its subtree to the new path
          newFiles[id] = { ...file, parentId: newParentId, modifiedAt: now };
          repath(newFiles, id, newPath);

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

      copyFile: (id, newParentId, newName) => {
        const file = get().files[id];
        const newParent = get().files[newParentId];
        if (!file || !newParent) return '';

        if (file.type === 'folder') {
          const newFolderId = get().createFolder(newName ?? file.name + ' copy', newParentId);
          // Descendants keep their own names — only the top of the copy is renamed.
          file.children?.forEach((childId) => {
            const child = get().files[childId];
            if (child) get().copyFile(childId, newFolderId, child.name);
          });
          return newFolderId;
        } else {
          const copyName = newName ?? file.name.replace(/(\.[^.]+)?$/, ' copy$1');
          if (isIdbMarker(file.content)) {
            // The bytes get their own row, keyed by the new node's id.
            const newId = get().createFile(copyName, newParentId, '', file.mimeType, file.size);
            if (newId) {
              get().updateFileContent(newId, idbMarkerFor(newId), file.size);
              void blobStore.copy(id, newId);
            }
            return newId;
          }
          return get().createFile(
            copyName,
            newParentId,
            typeof file.content === 'string' ? file.content : '',
            file.mimeType
          );
        }
      },

      updateFileContent: (id, content, size) => {
        const file = get().files[id];
        if (!file || file.type !== 'file') return;
        // Replacing IndexedDB-backed bytes with inline content orphans the row.
        if (isIdbMarker(file.content) && !isIdbMarker(content)) void blobStore.remove(id);

        set((state) => ({
          files: {
            ...state.files,
            [id]: {
              ...file,
              content,
              size: size ?? contentSize(content),
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
