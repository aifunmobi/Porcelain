/**
 * Zip support for the Archive Utility.
 *
 * One fflate implementation serves both environments: it is pure JavaScript, so
 * it runs the same in the Tauri webview as in the browser, and all file access
 * goes through FsBackend, which is what actually differs between the two. A
 * second Rust-side implementation would have to be kept in step with this one
 * for no behavioural gain.
 */

import { zip, unzip, Unzip, UnzipInflate, type Unzipped } from 'fflate';
import type { FsBackend, FsItem } from './fsAdapter';
import { basename } from './fsAdapter';

export interface ArchiveEntry {
  name: string;
  size: number;
  compressedSize: number;
  isDir: boolean;
}

export class ArchiveError extends Error {}

/** Zip's local-file signature at the start; absent means it is not a zip. */
const looksLikeZip = (data: Uint8Array) =>
  data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b;

/**
 * Sizes from the central directory. The streaming reader only sees local
 * headers, and archives written with data descriptors (Finder, most streaming
 * writers) leave the sizes there blank — the central directory always has
 * them. Returns null when the directory cannot be found (zip64, truncated).
 */
const centralDirectorySizes = (data: Uint8Array): Map<string, { size: number; compressed: number }> | null => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  // End-of-central-directory record: signature 0x06054b50, within the last 64K+22 bytes.
  const floor = Math.max(0, data.length - 65557);
  let eocd = -1;
  for (let i = data.length - 22; i >= floor; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return null;
  const count = view.getUint16(eocd + 10, true);
  const offset = view.getUint32(eocd + 16, true);
  if (offset === 0xffffffff || offset + 46 > data.length) return null;
  const out = new Map<string, { size: number; compressed: number }>();
  const decoder = new TextDecoder();
  let at = offset;
  for (let n = 0; n < count; n++) {
    if (at + 46 > data.length || view.getUint32(at, true) !== 0x02014b50) return null;
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = decoder.decode(data.subarray(at + 46, at + 46 + nameLength));
    out.set(name, {
      size: size === 0xffffffff ? 0 : size,
      compressed: compressed === 0xffffffff ? 0 : compressed,
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return out;
};

/**
 * An entry name that would land outside the extraction folder. Zip names are
 * attacker-controlled: `../../.zshrc` must never be honoured.
 */
const escapesDestination = (name: string): boolean => {
  if (/^[a-zA-Z]:/.test(name) || name.startsWith('/') || name.includes('\\')) return true;
  return name.split('/').some((segment) => segment === '..');
};

/**
 * Read the entry table without inflating anything: fflate hands us each file's
 * header, and we simply never call start() on it.
 */
export const listArchive = async (data: Uint8Array): Promise<ArchiveEntry[]> => {
  if (!looksLikeZip(data)) throw new ArchiveError('This file is not a zip archive.');
  const entries: ArchiveEntry[] = [];
  return new Promise((resolve, reject) => {
    const reader = new Unzip();
    reader.register(UnzipInflate);
    reader.onfile = (file) => {
      entries.push({
        name: file.name,
        // fflate names these from the stream's point of view: `size` is what is
        // stored in the archive, `originalSize` what it inflates back to.
        size: file.originalSize ?? 0,
        compressedSize: file.size ?? 0,
        isDir: file.name.endsWith('/'),
      });
    };
    try {
      reader.push(data, true);
      if (!entries.length) throw new ArchiveError('This archive is empty or its index is damaged.');
      const known = centralDirectorySizes(data);
      if (known) {
        for (const entry of entries) {
          const sizes = known.get(entry.name);
          if (sizes) {
            entry.size = sizes.size;
            entry.compressedSize = sizes.compressed;
          }
        }
      }
      resolve(entries);
    } catch (err) {
      reject(
        err instanceof ArchiveError
          ? err
          : new ArchiveError('This archive is damaged and cannot be read.')
      );
    }
  });
};

/** Collect a folder's files, flattened to archive-relative paths. */
const gather = async (
  backend: FsBackend,
  item: FsItem,
  prefix: string,
  out: Array<{ name: string; path: string }>,
  depth = 0
): Promise<void> => {
  if (depth > 12) return; // ponytail: matches the walk cap in fsAdapter
  if (!item.isDir) {
    out.push({ name: prefix + item.name, path: item.path });
    return;
  }
  const children = await backend.list(item.path);
  if (!children.length) out.push({ name: `${prefix}${item.name}/`, path: item.path });
  for (const child of children) {
    await gather(backend, child, `${prefix}${item.name}/`, out, depth + 1);
  }
};

export interface Progress {
  done: number;
  total: number;
  current: string;
}

export const createArchive = async (
  backend: FsBackend,
  items: FsItem[],
  onProgress?: (p: Progress) => void
): Promise<Uint8Array> => {
  const files: Array<{ name: string; path: string }> = [];
  for (const item of items) await gather(backend, item, '', files);
  if (!files.length) throw new ArchiveError('There is nothing to compress.');

  const payload: Record<string, Uint8Array> = {};
  let done = 0;
  for (const file of files) {
    onProgress?.({ done, total: files.length, current: file.name });
    payload[file.name] = file.name.endsWith('/')
      ? new Uint8Array()
      : await backend.readBinary(file.path);
    done++;
  }
  onProgress?.({ done, total: files.length, current: '' });

  return new Promise((resolve, reject) => {
    zip(payload, { level: 6 }, (err, data) => {
      if (err) reject(new ArchiveError(`Could not build the archive: ${err.message}`));
      else resolve(data);
    });
  });
};

const inflate = (data: Uint8Array): Promise<Unzipped> =>
  new Promise((resolve, reject) => {
    unzip(data, (err, files) => {
      if (err) {
        // fflate reports password-protected entries as an unknown method.
        const message = /encrypt|password/i.test(err.message)
          ? 'This archive is password-protected, which is not supported.'
          : 'This archive is damaged and cannot be extracted.';
        reject(new ArchiveError(message));
      } else resolve(files);
    });
  });

export const extractArchive = async (
  backend: FsBackend,
  data: Uint8Array,
  destination: string,
  onProgress?: (p: Progress) => void
): Promise<string[]> => {
  if (!looksLikeZip(data)) throw new ArchiveError('This file is not a zip archive.');
  const files = await inflate(data);
  const names = Object.keys(files);
  if (!names.length) throw new ArchiveError('This archive is empty.');
  const unsafe = names.find(escapesDestination);
  if (unsafe) {
    throw new ArchiveError(`This archive contains an unsafe path ("${unsafe}") and was not extracted.`);
  }

  const written: string[] = [];
  let done = 0;
  for (const name of names) {
    onProgress?.({ done, total: names.length, current: name });
    // Rebuild the directory chain, so nesting survives the round trip.
    const segments = name.split('/').filter(Boolean);
    const isDir = name.endsWith('/');
    let dir = destination;
    for (const segment of segments.slice(0, isDir ? segments.length : -1)) {
      const next = backend.join(dir, segment);
      const siblings = await backend.list(dir);
      if (!siblings.some((s) => s.name === segment && s.isDir)) await backend.mkdir(dir, segment);
      dir = next;
    }
    if (!isDir) {
      const target = backend.join(dir, segments[segments.length - 1]);
      await backend.writeBinary(target, files[name]);
      written.push(target);
    }
    done++;
  }
  onProgress?.({ done, total: names.length, current: '' });
  return written;
};

/** "Report.txt" and "Photos" -> "Report.zip" / "Photos.zip"; several -> "Archive.zip". */
export const archiveNameFor = (items: FsItem[]): string => {
  if (items.length === 1) {
    const name = basename(items[0].path);
    return `${items[0].isDir ? name : name.replace(/\.[^.]+$/, '')}.zip`;
  }
  return 'Archive.zip';
};
