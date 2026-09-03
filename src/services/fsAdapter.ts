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
  readFileBinary,
  writeBinaryFile,
  deleteFile as deleteRealFile,
} from './tauriFs';
import { useFileSystemStore } from '../stores/fileSystemStore';
import { blobStore, isIdbMarker, idbMarkerFor, IDB_MARKER } from './blobStore';
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
  /** Move into the trash folder; resolves to where the item now lives. */
  trash: (item: FsItem) => Promise<string>;
  /** Delete for good. Folders go recursively. */
  remove: (path: string) => Promise<void>;
  dirSize: (item: FsItem) => Promise<number>;
  createdAt: (item: FsItem) => Promise<Date | undefined>;
  open: (item: FsItem) => Promise<void>;
  thumb: (item: FsItem) => string | undefined;
  searchDeep: (path: string, query: string) => Promise<FsItem[]>;
  /** Read a file's text. Rejects if it is missing or unreadable. */
  readText: (path: string) => Promise<string>;
  /** Bytes, for archives and images. The virtual tree keeps these as base64. */
  readBinary: (path: string) => Promise<Uint8Array>;
  writeBinary: (path: string, data: Uint8Array) => Promise<void>;
  /** A URL the browser can render for this file, or undefined if it cannot. */
  objectUrl: (path: string) => Promise<string | undefined>;
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

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  zip: 'application/zip',
  html: 'text/html',
  md: 'text/markdown',
  txt: 'text/plain',
};

export const mimeForPath = (path: string): string =>
  MIME_BY_EXT[getFileExtension(path)] ?? 'application/octet-stream';

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
    // A colliding folder "My.Folder" must become "My.Folder copy", not "My copy.Folder".
    const isDir = await getFileStats(sourcePath).then((s) => s.isDirectory).catch(() => false);
    const name = freeName(basename(sourcePath), isDir, await namesIn(destDir));
    const dest = `${destDir}/${name}`;
    await renameRealFile(sourcePath, dest);
    return dest;
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

    moveInto: async (sourcePath, destDir) => {
      await moveInto(sourcePath, destDir);
    },

    duplicate: async (item) => {
      const dir = parentPath(item.path);
      const name = copyName(item.name, item.isDir, await namesIn(dir));
      await copyPath(item.path, `${dir}/${name}`);
    },

    trash: async (item) => {
      // Move, never delete — the Trash app has to be able to hand it back.
      await ensureDir(trashDir);
      return moveInto(item.path, trashDir);
    },

    remove: async (path) => {
      await deleteRealFile(path);
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

    readBinary: (path) => readFileBinary(path),

    writeBinary: (path, data) => writeBinaryFile(path, data),

    objectUrl: async (path) => convertFileSrc(path),
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

const dataUrlBytes = (content: string): Uint8Array => {
  const base64 = content.slice(content.indexOf(',') + 1);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

const textToDataUrl = (path: string, text: string) =>
  `data:${mimeForPath(path)};base64,${btoa(unescape(encodeURIComponent(text)))}`;

/**
 * Binaries written before IndexedDB was the byte store sit in localStorage as
 * data URLs. Move them over once, so the quota they were eating is freed.
 */
const migrateInlineBinaries = async () => {
  const store = fsStore();
  const inline = Object.values(store.files).filter(
    (n) => n.type === 'file' && typeof n.content === 'string' && n.content.startsWith('data:')
  );
  for (const node of inline) {
    const content = node.content as string;
    const bytes = content.includes(';base64,')
      ? dataUrlBytes(content)
      : new TextEncoder().encode(decodeURIComponent(content.slice(content.indexOf(',') + 1)));
    await blobStore.put(node.id, bytes, mimeForPath(node.path));
    fsStore().updateFileContent(node.id, idbMarkerFor(node.id), bytes.length);
  }
};

const virtualBackend = (): FsBackend => {
  /**
   * `thumb` is synchronous, so listing a folder warms the object-URL cache
   * for every image held in IndexedDB before the items are handed back.
   */
  const list = async (path: string) => {
    const nodes = childNodes(path);
    await Promise.all(
      nodes
        .filter((n) => n.type === 'file' && isImageFile(n.name) && isIdbMarker(n.content))
        .map((n) => blobStore.objectUrl(n.id))
    );
    return nodes.map(nodeToItem);
  };

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
      await blobStore.settle();
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
      await blobStore.settle();
    },

    trash: async (item) => {
      const trash = ensureDir(VIRTUAL_TRASH);
      fsStore().moveFile(item.id, trash.id);
      return fsStore().getFile(item.id)?.path ?? joinPath(VIRTUAL_TRASH, item.name);
    },

    remove: async (path) => {
      const node = nodeAt(path);
      if (node) fsStore().deleteFile(node.id);
      await blobStore.settle();
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

    /**
     * The image is already in the node as a data URL, so it can be its own
     * thumbnail. Returning undefined here is what left every picture in Files
     * showing the generic file glyph.
     */
    thumb: (item) => {
      if (item.isDir || !isImageFile(item.name)) return undefined;
      const node = fsStore().getFile(item.id);
      const content = typeof node?.content === 'string' ? node.content : '';
      if (isIdbMarker(content)) return blobStore.cachedUrl(node!.id);
      if (content.startsWith('data:')) return content;
      // SVG kept as plain markup still renders once wrapped as a data URL.
      if (!content) return undefined;
      return textToDataUrl(item.path, content);
    },

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
      const content = typeof node.content === 'string' ? node.content : '';
      if (isIdbMarker(content)) {
        const bytes = await blobStore.get(node.id);
        return bytes ? new TextDecoder().decode(bytes) : '';
      }
      // Anything written through writeBinary — an extracted archive entry, say —
      // is held as a data URL. Text callers want the text back, not the wrapper.
      if (content.startsWith('data:')) {
        const [header, payload] = [content.slice(0, content.indexOf(',')), content.slice(content.indexOf(',') + 1)];
        if (!header.includes(';base64')) return decodeURIComponent(payload);
        try {
          return new TextDecoder().decode(
            Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
          );
        } catch {
          return content;
        }
      }
      return content;
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

    readBinary: async (path) => {
      const node = nodeAt(path);
      if (!node || node.type === 'folder') throw new Error(`No such file: ${path}`);
      const content = typeof node.content === 'string' ? node.content : '';
      if (isIdbMarker(content)) return (await blobStore.get(node.id)) ?? new Uint8Array();
      // Legacy binaries are data URLs; anything else is text, encoded as-is.
      if (content.startsWith('data:')) return dataUrlBytes(content);
      return new TextEncoder().encode(content);
    },

    writeBinary: async (path, data) => {
      const mime = mimeForPath(path);
      const store = fsStore();
      const existing = nodeAt(path);
      let id = existing?.id;
      if (!id) {
        const parent = nodeAt(parentPath(path));
        if (!parent) throw new Error(`No such folder: ${parentPath(path)}`);
        id = store.createFile(basename(path), parent.id, '', mime, data.length);
      }
      await blobStore.put(id, data, mime);
      fsStore().updateFileContent(id, idbMarkerFor(id), data.length);
    },

    objectUrl: async (path) => {
      const node = nodeAt(path);
      if (!node || typeof node.content !== 'string') return undefined;
      if (isIdbMarker(node.content)) return blobStore.objectUrl(node.id);
      if (node.content.startsWith('data:')) return node.content;
      // Text held verbatim still needs a URL an <object>/<img> can load.
      return textToDataUrl(path, node.content);
    },
  };
};

export const createBackend = async (): Promise<FsBackend> => {
  if (isTauri()) return realBackend();
  const backend = virtualBackend();
  try {
    await migrateInlineBinaries();
  } catch (err) {
    console.error('[fs] Could not move inline binaries to IndexedDB:', err);
  }
  return backend;
};

let shared: Promise<FsBackend> | null = null;

/**
 * The backend every window shares. The choice of backend cannot change while
 * the page is alive, so building it once is enough; a failed build is
 * forgotten so the next caller retries.
 */
export const getBackend = (): Promise<FsBackend> => {
  if (!shared) {
    shared = createBackend().catch((err) => {
      shared = null;
      throw err;
    });
  }
  return shared;
};

/**
 * A thumbnail URL for a path in whichever backend is live, or undefined.
 * Callers on the shell (desktop icons) do not hold a backend of their own.
 */
export const thumbForPath = async (path: string, name = basename(path)): Promise<string | undefined> => {
  if (!path || !isImageFile(name)) return undefined;
  try {
    const backend = await getBackend();
    const items = await backend.list(backend.parent(path));
    const item = items.find((i) => i.path === path) ?? { id: path, name, path, isDir: false, size: 0 };
    const url = backend.thumb(item);
    if (!url) return undefined;
    // Desktop icons are persisted, and a blob: URL dies with the page, so
    // shrink the image to a small data URL. Where the canvas is tainted
    // (asset: in Tauri) the original URL is stable across reloads anyway.
    if (url.startsWith(IDB_MARKER) || url.startsWith('blob:') || url.startsWith('data:')) {
      return (await shrinkToDataUrl(url, 128)) ?? (url.startsWith('blob:') ? undefined : url);
    }
    return url;
  } catch {
    return undefined;
  }
};

const shrinkToDataUrl = (url: string, edge: number): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
