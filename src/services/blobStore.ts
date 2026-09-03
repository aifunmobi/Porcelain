/**
 * Binary storage for the browser backend.
 *
 * The virtual filesystem's metadata and text live in localStorage through
 * zustand persist, which is fine for a tree of names and a few text files but
 * caps out around 5 MB — one full-desktop screenshot at 2× overran it. Bytes
 * now live here, in IndexedDB, keyed by the file node's id. A node whose
 * content is the marker `idb://<id>` points at its row in this store.
 */

import Dexie, { type Table } from 'dexie';

export const IDB_MARKER = 'idb://';

export const isIdbMarker = (content: unknown): boolean =>
  typeof content === 'string' && content.startsWith(IDB_MARKER);

export const idbMarkerFor = (id: string) => `${IDB_MARKER}${id}`;

interface BlobRow {
  id: string;
  mime: string;
  size: number;
  bytes: Blob;
}

class PorcelainDb extends Dexie {
  blobs!: Table<BlobRow, string>;

  constructor() {
    super('porcelain-blobs');
    this.version(1).stores({ blobs: 'id' });
  }
}

let db: PorcelainDb | null = null;
const open = () => (db ??= new PorcelainDb());

/** Work started by synchronous store mutations; awaited by the backend before it returns. */
const inFlight = new Set<Promise<unknown>>();
const track = <T>(p: Promise<T>): Promise<T> => {
  inFlight.add(p);
  p.finally(() => inFlight.delete(p)).catch(() => undefined);
  return p;
};

/** Object URLs handed out for rows, revoked when the row changes or goes. */
const urls = new Map<string, string>();

const dropUrl = (id: string) => {
  const url = urls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(id);
  }
};

export const blobStore = {
  async put(id: string, bytes: Uint8Array, mime: string): Promise<void> {
    dropUrl(id);
    await open().blobs.put({ id, mime, size: bytes.length, bytes: new Blob([bytes as BlobPart], { type: mime }) });
  },

  async get(id: string): Promise<Uint8Array | null> {
    const row = await open().blobs.get(id);
    return row ? new Uint8Array(await row.bytes.arrayBuffer()) : null;
  },

  async size(id: string): Promise<number | null> {
    const row = await open().blobs.get(id);
    return row ? row.size : null;
  },

  /** A URL an <img>/<object> can load; stable until the row is replaced. */
  async objectUrl(id: string): Promise<string | undefined> {
    const known = urls.get(id);
    if (known) return known;
    const row = await open().blobs.get(id);
    if (!row) return undefined;
    const url = URL.createObjectURL(row.bytes);
    urls.set(id, url);
    return url;
  },

  /** The cached URL only — for callers that cannot await (thumbnails). */
  cachedUrl(id: string): string | undefined {
    return urls.get(id);
  },

  /** Fire-and-forget copies and deletes issued from synchronous store code. */
  copy(fromId: string, toId: string): Promise<void> {
    return track(
      (async () => {
        const row = await open().blobs.get(fromId);
        if (row) await open().blobs.put({ ...row, id: toId });
      })()
    );
  },

  remove(id: string): Promise<void> {
    dropUrl(id);
    return track(open().blobs.delete(id));
  },

  /** Resolve once every copy/delete started so far has landed. */
  async settle(): Promise<void> {
    while (inFlight.size) await Promise.allSettled([...inFlight]);
  },
};
