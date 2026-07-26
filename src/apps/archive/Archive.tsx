import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icons';
import { createBackend, basename } from '../../services/fsAdapter';
import type { FsBackend, FsItem } from '../../services/fsAdapter';
import {
  listArchive,
  createArchive,
  extractArchive,
  archiveNameFor,
  ArchiveError,
  type ArchiveEntry,
  type Progress,
} from '../../services/archive';
import { formatFileSize, getFileExtension } from '../../services/tauriFs';
import type { AppProps } from '../../types';
import './Archive.css';

interface ArchiveProps extends AppProps {
  /** Paths handed over by Files' "Compress". */
  compressPaths?: string[];
  /** A .zip handed over by Files' "Extract" or a double-click. */
  archivePath?: string;
}

type Picker = { kind: 'items' | 'archives'; options: FsItem[] } | null;

export const Archive: React.FC<ArchiveProps> = ({ compressPaths, archivePath }) => {
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [staged, setStaged] = useState<FsItem[]>([]);
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [openArchive, setOpenArchive] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>(null);

  useEffect(() => {
    createBackend().then(setBackend);
  }, []);

  const fail = useCallback((err: unknown) => {
    setProgress(null);
    setError(
      err instanceof ArchiveError
        ? err.message
        : `Something went wrong: ${err instanceof Error ? err.message : String(err)}`
    );
  }, []);

  /* ------------------------------------------------------------- loading */

  const inspect = useCallback(
    async (path: string) => {
      if (!backend) return;
      setError(null);
      setMessage(null);
      try {
        const data = await backend.readBinary(path);
        setEntries(await listArchive(data));
        setOpenArchive(path);
        setStaged([]);
      } catch (err) {
        setEntries(null);
        setOpenArchive(path);
        fail(err);
      }
    },
    [backend, fail]
  );

  useEffect(() => {
    if (archivePath && backend) void inspect(archivePath);
  }, [archivePath, backend, inspect]);

  useEffect(() => {
    if (!compressPaths?.length || !backend) return;
    (async () => {
      const items: FsItem[] = [];
      for (const path of compressPaths) {
        const siblings = await backend.list(backend.parent(path));
        const found = siblings.find((s) => s.path === path);
        if (found) items.push(found);
      }
      setStaged(items);
      setEntries(null);
      setOpenArchive(null);
    })();
  }, [compressPaths, backend]);

  /* ------------------------------------------------------------ actions */

  const compress = useCallback(async () => {
    if (!backend || !staged.length) return;
    setError(null);
    setMessage(null);
    try {
      const data = await createArchive(backend, staged, setProgress);
      const folder = backend.parent(staged[0].path);
      const target = backend.join(folder, archiveNameFor(staged));
      await backend.writeBinary(target, data);
      setProgress(null);
      // Show the new archive's contents first — inspect() clears any message,
      // so the confirmation has to be set after it, not before.
      await inspect(target);
      setMessage(`Created ${basename(target)} (${formatFileSize(data.length)}) in ${folder}`);
    } catch (err) {
      fail(err);
    }
  }, [backend, staged, inspect, fail]);

  const extract = useCallback(async () => {
    if (!backend || !openArchive) return;
    setError(null);
    setMessage(null);
    try {
      const data = await backend.readBinary(openArchive);
      const folder = backend.parent(openArchive);
      const base = basename(openArchive).replace(/\.zip$/i, '');
      // A new folder beside the archive. The free name has to be settled here,
      // not left to mkdir: mkdir would quietly rename around a collision and the
      // extraction would then pour into whatever folder already had that name.
      const siblings = await backend.list(folder);
      let name = base;
      for (let n = 2; siblings.some((s) => s.name === name); n++) name = `${base} ${n}`;
      await backend.mkdir(folder, name);
      const destination = backend.join(folder, name);
      const written = await extractArchive(backend, data, destination, setProgress);
      setProgress(null);
      setMessage(`Extracted ${written.length} file${written.length === 1 ? '' : 's'} to ${destination}`);
    } catch (err) {
      fail(err);
    }
  }, [backend, openArchive, fail]);

  const showPicker = useCallback(
    async (kind: 'items' | 'archives') => {
      if (!backend) return;
      const found = await backend.searchDeep(backend.home, '');
      const options =
        kind === 'archives' ? found.filter((f) => getFileExtension(f.name) === 'zip') : found;
      setPicker({ kind, options: options.slice(0, 100) });
    },
    [backend]
  );

  /* ------------------------------------------------------------- render */

  const total = entries?.reduce((sum, e) => sum + e.size, 0) ?? 0;
  const packed = entries?.reduce((sum, e) => sum + e.compressedSize, 0) ?? 0;

  return (
    <div className="archive">
      <div className="archive__toolbar">
        <button className="archive__btn" onClick={() => void showPicker('items')}>
          <Icon name="plus" size={14} />
          Add Files
        </button>
        <button className="archive__btn" onClick={() => void showPicker('archives')}>
          <Icon name="archive" size={14} />
          Open Archive
        </button>
        <div className="archive__separator" />
        <button className="archive__btn" onClick={() => void compress()} disabled={!staged.length}>
          Compress
        </button>
        <button className="archive__btn" onClick={() => void extract()} disabled={!entries?.length}>
          Extract
        </button>
        <div className="archive__title">
          {openArchive ? basename(openArchive) : staged.length ? `${staged.length} selected` : 'Archive Utility'}
        </div>
      </div>

      {progress && (
        <div className="archive__progress">
          <div className="archive__progress-bar">
            <div
              className="archive__progress-fill"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <span className="archive__progress-label">
            {progress.done} / {progress.total} {progress.current && `— ${progress.current}`}
          </span>
        </div>
      )}

      {error && (
        <div className="archive__error">
          <Icon name="alert-triangle" size={15} />
          <span>{error}</span>
        </div>
      )}
      {message && !error && (
        <div className="archive__message">
          <Icon name="check-circle" size={15} />
          <span>{message}</span>
        </div>
      )}

      <div className="archive__body">
        {entries ? (
          <table className="archive__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Compressed</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.name}>
                  <td>
                    <Icon name={entry.isDir ? 'folder' : 'file'} size={14} />
                    {entry.name}
                  </td>
                  <td>{entry.isDir ? '--' : formatFileSize(entry.size)}</td>
                  <td>{entry.isDir ? '--' : formatFileSize(entry.compressedSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : staged.length ? (
          <ul className="archive__staged">
            {staged.map((item) => (
              <li key={item.path}>
                <Icon name={item.isDir ? 'folder' : 'file'} size={15} />
                <span>{item.name}</span>
                <span className="archive__staged-path">{item.path}</span>
                <button
                  className="pcl-bare archive__remove"
                  onClick={() => setStaged((s) => s.filter((x) => x.path !== item.path))}
                  title="Remove"
                >
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="archive__empty">
            <Icon name="archive" size={48} color="var(--color-porcelain-300)" />
            <p>Add files to compress, or open a .zip to inspect it.</p>
          </div>
        )}
      </div>

      <div className="archive__statusbar">
        {entries ? (
          <>
            <span>{entries.length} entries</span>
            <span>{formatFileSize(total)} uncompressed</span>
            <span>{formatFileSize(packed)} compressed</span>
          </>
        ) : (
          <span>{staged.length} item{staged.length === 1 ? '' : 's'} staged</span>
        )}
      </div>

      {picker && (
        <div className="archive__picker-backdrop" onClick={() => setPicker(null)}>
          <div className="archive__picker" onClick={(e) => e.stopPropagation()}>
            <div className="archive__picker-title">
              {picker.kind === 'archives' ? 'Open Archive' : 'Add Files'}
            </div>
            <div className="archive__picker-list">
              {picker.options.length === 0 && <div className="archive__empty-row">Nothing found</div>}
              {picker.options.map((option) => (
                <button
                  key={option.path}
                  className="pcl-bare archive__picker-item"
                  onClick={() => {
                    if (picker.kind === 'archives') {
                      setPicker(null);
                      void inspect(option.path);
                    } else {
                      setStaged((s) => (s.some((x) => x.path === option.path) ? s : [...s, option]));
                      setEntries(null);
                      setOpenArchive(null);
                    }
                  }}
                >
                  <Icon name={option.isDir ? 'folder' : 'file'} size={14} />
                  {option.name}
                  <span className="archive__staged-path">{option.path}</span>
                </button>
              ))}
            </div>
            <div className="archive__picker-actions">
              <button onClick={() => setPicker(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Archive;
