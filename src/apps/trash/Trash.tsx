import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Icon } from '../../components/Icons';
import { useTrashStore, toDesktopIcon } from '../../stores/trashStore';
import type { IconOnlyItem } from '../../stores/trashStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { useWindowStore } from '../../stores/windowStore';
import { getBackend, basename } from '../../services/fsAdapter';
import type { FsBackend, FsItem } from '../../services/fsAdapter';
import { getFileIcon } from '../../utils/desktop';
import type { AppProps } from '../../types';
import { useAppCommands } from '../../hooks/useAppCommands';
import './Trash.css';

/** A row in the Trash: a file in the trash folder, or an icon with no file. */
interface TrashRow {
  key: string;
  name: string;
  icon: string;
  thumbnail?: string;
  deletedAt?: string;
  origin?: string;
  file?: FsItem;
  iconOnly?: IconOnlyItem;
}

export const Trash: React.FC<AppProps> = ({ windowId }) => {
  const records = useTrashStore((s) => s.records);
  const iconOnly = useTrashStore((s) => s.iconOnly);
  const forget = useTrashStore((s) => s.forget);
  const removeIconOnly = useTrashStore((s) => s.removeIconOnly);
  const addDesktopIcon = useSettingsStore((s) => s.addDesktopIcon);
  const activeWindowId = useWindowStore((s) => s.activeWindowId);
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [files, setFiles] = useState<FsItem[]>([]);
  /** Bumped whenever the trash folder may have changed, to re-read it. */
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const isFront = activeWindowId === windowId;
  const [selected, setSelected] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: TrashRow } | null>(null);
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBackend().then((created) => {
      if (!cancelled) setBackend(created);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The trash folder is what is actually in the Trash; read it, do not
  // mirror it. Re-read on every tick and whenever this window comes to the
  // front, so files trashed elsewhere show up.
  useEffect(() => {
    if (!backend) return;
    let live = true;
    backend
      .list(backend.trashDir)
      .then((items) => live && setFiles(items))
      .catch(() => live && setFiles([])); // no trash folder yet means an empty trash
    return () => {
      live = false;
    };
  }, [backend, tick, isFront]);

  // Virtual-tree changes (browser mode) arrive through the store.
  useEffect(() => useFileSystemStore.subscribe(refresh), [refresh]);

  const rows = useMemo((): TrashRow[] => {
    const fileRows: TrashRow[] = files.map((file) => {
      const record = records[file.path];
      return {
        key: `file:${file.path}`,
        name: file.name,
        icon: file.isDir ? 'folder' : getFileIcon(file.name),
        thumbnail: backend?.thumb(file),
        deletedAt: record?.deletedAt,
        origin: record ? backend?.parent(record.originalPath) : undefined,
        file,
      };
    });
    const iconRows: TrashRow[] = iconOnly.map((icon) => ({
      key: `icon:${icon.id}`,
      name: icon.name,
      icon: icon.icon,
      deletedAt: icon.deletedAt,
      origin: 'Desktop',
      iconOnly: icon,
    }));
    return [...fileRows, ...iconRows].sort((a, b) =>
      (b.deletedAt ?? '').localeCompare(a.deletedAt ?? '') || a.name.localeCompare(b.name)
    );
  }, [files, records, iconOnly, backend]);

  const closeMenus = () => {
    setContextMenu(null);
    setSelected(null);
  };

  /**
   * Put Back. A file returns to the folder it came from (or the Desktop
   * folder when that is unknown or gone), and any desktop icon that pointed
   * at it comes back with it. An icon-only item simply returns to the desktop.
   */
  const putBack = useCallback(
    async (row: TrashRow) => {
      closeMenus();
      setError(null);
      if (row.iconOnly) {
        addDesktopIcon(toDesktopIcon(row.iconOnly));
        removeIconOnly(row.iconOnly.id);
        return;
      }
      if (!row.file || !backend) return;
      const record = records[row.file.path];
      const desktopDir = backend.favorites.find((f) => f.id === 'desktop')?.path ?? backend.home;
      let destination = record ? backend.parent(record.originalPath) : desktopDir;
      const exists = await backend
        .list(destination)
        .then(() => true)
        .catch(() => false);
      if (!exists || !record) destination = desktopDir;
      try {
        await backend.moveInto(row.file.path, destination);
      } catch (err) {
        setError(`Could not put back "${row.name}": ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      if (record?.icon) {
        addDesktopIcon({ ...record.icon, filePath: backend.join(destination, row.file.name) });
      }
      forget(row.file.path);
      refresh();
    },
    [backend, records, addDesktopIcon, removeIconOnly, forget, refresh]
  );

  /** Delete for good: the bytes go, not just the entry. */
  const deleteRow = useCallback(
    async (row: TrashRow) => {
      if (row.iconOnly) {
        removeIconOnly(row.iconOnly.id);
        return;
      }
      if (!row.file || !backend) throw new Error('The filesystem is not ready yet');
      await backend.remove(row.file.path);
      forget(row.file.path);
    },
    [backend, removeIconOnly, forget]
  );

  const handleDelete = useCallback(
    async (row: TrashRow) => {
      closeMenus();
      setError(null);
      try {
        await deleteRow(row);
      } catch (err) {
        setError(`Could not delete "${row.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
      refresh();
    },
    [deleteRow, refresh]
  );

  const handleEmptyTrash = useCallback(async () => {
    setConfirmingEmpty(false);
    closeMenus();
    setError(null);
    const failures: string[] = [];
    for (const row of rows) {
      try {
        await deleteRow(row);
      } catch {
        failures.push(row.name);
      }
    }
    if (failures.length) setError(`Could not delete: ${failures.join(', ')}`);
    refresh();
  }, [rows, deleteRow, refresh]);

  useAppCommands(
    windowId,
    useMemo(
      () => ({ emptyTrash: rows.length ? handleEmptyTrash : undefined }),
      [rows.length, handleEmptyTrash]
    )
  );

  const formatDate = (iso?: string) => {
    if (!iso) return 'earlier';
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="trash" onClick={() => setContextMenu(null)}>
      <div className="trash__toolbar">
        <div className="trash__title">
          <Icon name="trash" size={20} />
          <span>Trash</span>
          <span className="trash__count">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
        </div>
        {confirmingEmpty ? (
          <div className="trash__confirm">
            <span>Permanently delete {rows.length} item{rows.length !== 1 ? 's' : ''}?</span>
            <button className="trash__empty-btn" onClick={() => setConfirmingEmpty(false)}>
              Cancel
            </button>
            <button className="trash__empty-btn trash__empty-btn--danger" onClick={handleEmptyTrash}>
              Empty Trash
            </button>
          </div>
        ) : (
          <button
            className="trash__empty-btn"
            onClick={() => setConfirmingEmpty(true)}
            disabled={rows.length === 0}
          >
            Empty Trash
          </button>
        )}
      </div>

      {error && (
        <div className="trash__error" role="alert">
          <Icon name="alert-circle" size={14} />
          <span>{error}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="trash__empty">
          <Icon name="trash" size={64} color="var(--color-porcelain-300)" />
          <p>Trash is empty</p>
        </div>
      ) : (
        <div className="trash__items">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`trash__item ${selected === row.key ? 'trash__item--selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(row.key);
                setContextMenu(null);
              }}
              onDoubleClick={() => void putBack(row)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, row });
                setSelected(row.key);
              }}
            >
              <div className="trash__item-icon">
                {row.thumbnail ? (
                  <img src={row.thumbnail} alt={row.name} className="trash__item-thumbnail" />
                ) : (
                  <Icon name={row.icon} size={32} color="var(--color-porcelain-500)" />
                )}
              </div>
              <div className="trash__item-info">
                <div className="trash__item-name">{row.name}</div>
                <div className="trash__item-date">
                  Deleted {formatDate(row.deletedAt)}
                  {row.origin ? ` · from ${row.origin === '/' ? '/' : basename(row.origin) || row.origin}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="trash__context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="pcl-bare trash__context-menu-item" onClick={() => void putBack(contextMenu.row)}>
            <Icon name="refresh" size={14} />
            Put Back
          </button>
          <div className="trash__context-menu-divider" />
          <button
            className="pcl-bare trash__context-menu-item trash__context-menu-item--danger"
            onClick={() => void handleDelete(contextMenu.row)}
          >
            <Icon name="trash" size={14} />
            Delete Immediately
          </button>
        </div>
      )}
    </div>
  );
};

export default Trash;
