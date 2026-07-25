/**
 * One normalised view over the two filesystems Files can browse: the real one
 * (Tauri) and the in-memory one (browser). Everything above this file works in
 * FsItem and never branches on which backend is live.
 */

import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  createDirectory,
  renameFile as renameRealFile,
  copyFileToPath,
  getFileStats,
  fileExists,
  isImageFile,
  getFileExtension,
  readFileText,
  writeTextFile,
} from './tauriFs';
import { useFileSystemStore } from '../stores/fileSystemStore';
import type { FileNode } from '../types';

export interface FsItem {
  /** Stable key: the real path, or the virtual node id. */
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedAt?: Date;
}

export interface SidebarEntry {
  id: string;
  name: string;
  icon: string;
  path: string;
}

export interface FsBackend {
  isReal: boolean;
  home: string;
  trashDir: string;
  favorites: SidebarEntry[];
  locations: SidebarEntry[];
  list: (path: string) => Promise<FsItem[]>;
  parent: (path: string) => string;
  join: (dir: string, name: string) => string;
  mkdir: (dir: string, name: string) => Promise<void>;
  rename: (item: FsItem, newName: string) => Promise<void>;
  copyInto: (sourcePath: string, destDir: string) => Promise<void>;
  moveInto: (sourcePath: string, destDir: string) => Promise<void>;
  duplicate: (item: FsItem) => Promise<void>;
  trash: (item: FsItem) => Promise<void>;
  dirSize: (item: FsItem) => Promise<number>;
  createdAt: (item: FsItem) => Promise<Date | undefined>;
  open: (item: FsItem) => Promise<void>;
  thumb: (item: FsItem) => string | undefined;
  searchDeep: (path: string, query: string) => Promise<FsItem[]>;
  /** Read a file's text. Rejects if it is missing or unreadable. */
  readText: (path: string) => Promise<string>;
  /** Write text, creating the file if it does not exist yet. */
  writeText: (path: string, content: string) => Promise<void>;
}

/* ------------------------------------------------------------------ paths */

export const basename = (path: string): string => path.split('/').filter(Boolean).pop() ?? '/';

const joinPath = (dir: string, name: string) => `${dir === '/' ? '' : dir}/${name}`;

const parentPath = (path: string) => {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? `/${parts.join('/')}` : '/';
};

/** "Report copy.pdf", then "Report copy 2.pdf" — matches how Finder words it. */
const copyName = (name: string, isDir: boolean, taken: Set<string>): string => {
  const dot = isDir ? -1 : name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let candidate = `${stem} copy${ext}`;
  let n = 2;
  while (taken.has(candidate)) candidate = `${stem} copy ${n++}${ext}`;
  return candidate;
};

/** A move/paste never silently clobbers a same-named item at the destination. */
const freeName = (name: string, isDir: boolean, taken: Set<string>): string =>
  taken.has(name) ? copyName(name, isDir, taken) : name;

export const kindOf = (item: FsItem): string => {
  if (item.isDir) return 'Folder';
  const ext = getFileExtension(item.name);
  return ext ? `${ext.toUpperCase()} file` : 'Document';
};

/* ------------------------------------------------------- real (Tauri) fs */

// ponytail: recursive walks are capped so a stray click on / cannot hang the
// window. Raise or make it incremental if anyone browses trees this deep.
const WALK_LIMIT = 20000;
const WALK_DEPTH = 12;

const toItem = (entry: { name: string; path: string; isDirectory: boolean; size?: number; modifiedAt?: Date }): FsItem => ({
  id: entry.path,
  name: entry.name,
  path: entry.path,
  isDir: entry.isDirectory,
  size: entry.size ?? 0,
  modifiedAt: entry.modifiedAt,
});

const realBackend = async (): Promise<FsBackend> => {
  const dirs = await getSpecialDirs();
  const trashDir = `${dirs.home}/.porcelain-trash`;

  const list = async (path: string) => (await readDirectory(path)).map(toItem);

  const namesIn = async (dir: string) => new Set((await list(dir)).map((i) => i.name));

  const ensureDir = async (path: string) => {
    if (!(await fileExists(path))) await createDirectory(path);
  };

  /** copyFile only handles files, so folders recurse. */
  const copyPath = async (source: string, dest: string, depth = 0): Promise<void> => {
    const stats = await getFileStats(source);
    if (!stats.isDirectory) {
      await copyFileToPath(source, dest);
      return;
    }
    await createDirectory(dest);
    if (depth >= WALK_DEPTH) return;
    for (const child of await readDirectory(source)) {
      await copyPath(child.path, `${dest}/${child.name}`, depth + 1);
    }
  };

  const walk = async (
    path: string,
    visit: (item: FsItem) => void,
    depth = 0,
    counter = { n: 0 }
  ): Promise<void> => {
    if (depth >= WALK_DEPTH || counter.n >= WALK_LIMIT) return;
    for (const entry of await readDirectory(path)) {
      if (counter.n >= WALK_LIMIT) return;
      counter.n++;
      const item = toItem(entry);
      visit(item);
      if (item.isDir) await walk(item.path, visit, depth + 1, counter);
    }
  };

  const moveInto = async (sourcePath: string, destDir: string) => {
    const name = freeName(basename(sourcePath), false, await namesIn(destDir));
    await renameRealFile(sourcePath, `${destDir}/${name}`);
  };

  return {
    isReal: true,
    home: dirs.home,
    trashDir,
    favorites: [
      { id: 'home', name: 'Home', icon: 'home', path: dirs.home },
      { id: 'desktop', name: 'Desktop', icon: 'computer', path: dirs.desktop },
      { id: 'documents', name: 'Documents', icon: 'document', path: dirs.documents },
      { id: 'downloads', name: 'Downloads', icon: 'download', path: dirs.downloads },
      { id: 'pictures', name: 'Pictures', icon: 'image', path: dirs.pictures },
      { id: 'music', name: 'Music', icon: 'music', path: dirs.music },
      { id: 'movies', name: 'Movies', icon: 'video', path: dirs.videos },
    ],
    locations: [
      { id: 'computer', name: 'Computer', icon: 'computer', path: '/' },
      { id: 'trash', name: 'Trash', icon: 'trash', path: trashDir },
    ],
    list,
    parent: parentPath,
    join: joinPath,

    mkdir: async (dir, name) => {
      await createDirectory(`${dir}/${freeName(name, true, await namesIn(dir))}`);
    },

    rename: async (item, newName) => {
      await renameRealFile(item.path, `${parentPath(item.path)}/${newName}`);
    },

    copyInto: async (sourcePath, destDir) => {
      const stats = await getFileStats(sourcePath);
      const name = freeName(basename(sourcePath), stats.isDirectory, await namesIn(destDir));
      await copyPath(sourcePath, `${destDir}/${name}`);
    },

    moveInto,

    duplicate: async (item) => {
      const dir = parentPath(item.path);
      const name = copyName(item.name, item.isDir, await namesIn(dir));
      await copyPath(item.path, `${dir}/${name}`);
    },

    trash: async (item) => {
      // Move, never delete — the Trash app has to be able to hand it back.
      await ensureDir(trashDir);
      await moveInto(item.path, trashDir);
    },

    dirSize: async (item) => {
      if (!item.isDir) return item.size;
      let total = 0;
      await walk(item.path, (child) => {
        if (!child.isDir) total += child.size;
      });
      return total;
    },

    createdAt: async (item) => {
      try {
        const stats = await getFileStats(item.path);
        return stats.birthtime ? new Date(stats.birthtime) : undefined;
      } catch {
        return undefined;
      }
    },

    open: async (item) => {
      await invoke('open_file_with_default_app', { path: item.path });
    },

    thumb: (item) => (!item.isDir && isImageFile(item.name) ? convertFileSrc(item.path) : undefined),

    searchDeep: async (path, query) => {
      const q = query.toLowerCase();
      const hits: FsItem[] = [];
      await walk(path, (item) => {
        if (item.name.toLowerCase().includes(q)) hits.push(item);
      });
      return hits;
    },

    readText: (path) => readFileText(path),

    writeText: (path, content) => writeTextFile(path, content),
  };
};

/* ---------------------------------------------------------- virtual fs */

const fsStore = () => useFileSystemStore.getState();

const nodeToItem = (node: FileNode): FsItem => ({
  id: node.id,
  name: node.name,
  path: node.path,
  isDir: node.type === 'folder',
  size: node.size,
  modifiedAt: node.modifiedAt ? new Date(node.modifiedAt) : undefined,
});

const childNodes = (path: string): FileNode[] => {
  const store = fsStore();
  const folder = store.getFileByPath(path);
  return folder ? store.getChildren(folder.id) : [];
};

const VIRTUAL_TRASH = '/Trash';

const virtualBackend = (): FsBackend => {
  const list = async (path: string) => childNodes(path).map(nodeToItem);

  const namesIn = (dir: string) => new Set(childNodes(dir).map((n) => n.name));

  /** Folders the virtual tree does not ship with (Trash) are made on demand. */
  const ensureDir = (path: string): FileNode => {
    const store = fsStore();
    const existing = store.getFileByPath(path);
    if (existing) return existing;
    const parent = store.getFileByPath(parentPath(path)) ?? store.getFileByPath('/')!;
    const id = store.createFolder(basename(path), parent.id);
    return fsStore().getFile(id)!;
  };

  const nodeAt = (path: string) => fsStore().getFileByPath(path);

  const sizeOf = (node: FileNode): number => {
    if (node.type !== 'folder') return node.size;
    return fsStore()
      .getChildren(node.id)
      .reduce((sum, child) => sum + sizeOf(child), 0);
  };

  return {
    isReal: false,
    home: '/',
    trashDir: VIRTUAL_TRASH,
    favorites: [
      { id: 'home', name: 'Home', icon: 'home', path: '/' },
      { id: 'desktop', name: 'Desktop', icon: 'computer', path: '/Desktop' },
      { id: 'documents', name: 'Documents', icon: 'document', path: '/Documents' },
      { id: 'downloads', name: 'Downloads', icon: 'download', path: '/Downloads' },
      { id: 'pictures', name: 'Pictures', icon: 'image', path: '/Pictures' },
      { id: 'music', name: 'Music', icon: 'music', path: '/Music' },
      { id: 'movies', name: 'Movies', icon: 'video', path: '/Videos' },
    ],
    locations: [
      { id: 'computer', name: 'Computer', icon: 'computer', path: '/' },
      { id: 'trash', name: 'Trash', icon: 'trash', path: VIRTUAL_TRASH },
    ],
    list,
    parent: parentPath,
    join: joinPath,

    mkdir: async (dir, name) => {
      const parent = nodeAt(dir);
      if (parent) fsStore().createFolder(freeName(name, true, namesIn(dir)), parent.id);
    },

    rename: async (item, newName) => {
      fsStore().renameFile(item.id, newName);
    },

    copyInto: async (sourcePath, destDir) => {
      const source = nodeAt(sourcePath);
      const dest = nodeAt(destDir);
      if (!source || !dest) return;
      // Keep the name unless the destination already has one.
      const name = freeName(source.name, source.type === 'folder', namesIn(destDir));
      fsStore().copyFile(source.id, dest.id, name);
    },

    moveInto: async (sourcePath, destDir) => {
      const source = nodeAt(sourcePath);
      const dest = destDir === VIRTUAL_TRASH ? ensureDir(VIRTUAL_TRASH) : nodeAt(destDir);
      if (source && dest) fsStore().moveFile(source.id, dest.id);
    },

    duplicate: async (item) => {
      const node = fsStore().getFile(item.id);
      if (!node?.parentId) return;
      const dir = parentPath(node.path);
      fsStore().copyFile(node.id, node.parentId, copyName(node.name, node.type === 'folder', namesIn(dir)));
    },

    trash: async (item) => {
      const trash = ensureDir(VIRTUAL_TRASH);
      fsStore().moveFile(item.id, trash.id);
    },

    dirSize: async (item) => {
      const node = fsStore().getFile(item.id);
      return node ? sizeOf(node) : item.size;
    },

    createdAt: async (item) => {
      const node = fsStore().getFile(item.id);
      return node?.createdAt ? new Date(node.createdAt) : undefined;
    },

    open: async () => {
      // Nothing to hand off to in browser mode; folders navigate, files are inert.
    },

    thumb: () => undefined,

    searchDeep: async (path, query) => {
      const q = query.toLowerCase();
      const hits: FsItem[] = [];
      const visit = (nodePath: string, depth: number) => {
        if (depth >= WALK_DEPTH) return;
        for (const child of childNodes(nodePath)) {
          const item = nodeToItem(child);
          if (item.name.toLowerCase().includes(q)) hits.push(item);
          if (item.isDir) visit(item.path, depth + 1);
        }
      };
      visit(path, 0);
      return hits;
    },

    readText: async (path) => {
      const node = nodeAt(path);
      if (!node || node.type === 'folder') throw new Error(`No such file: ${path}`);
      return typeof node.content === 'string' ? node.content : '';
    },

    writeText: async (path, content) => {
      const store = fsStore();
      const existing = nodeAt(path);
      if (existing) {
        store.updateFileContent(existing.id, content);
        return;
      }
      const parent = nodeAt(parentPath(path));
      if (!parent) throw new Error(`No such folder: ${parentPath(path)}`);
      const ext = getFileExtension(path);
      const mime =
        ext === 'html' ? 'text/html' : ext === 'md' ? 'text/markdown' : 'text/plain';
      store.createFile(basename(path), parent.id, content, mime);
    },
  };
};

export const createBackend = async (): Promise<FsBackend> =>
  isTauri() ? realBackend() : virtualBackend();
