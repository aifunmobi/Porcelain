import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import { useTrashStore } from '../../stores/trashStore';
import type { TrashItem } from '../../stores/trashStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getBackend } from '../../services/fsAdapter';
import type { FsBackend } from '../../services/fsAdapter';
import type { AppProps } from '../../types';
import './Trash.css';

export const Trash: React.FC<AppProps> = () => {
  const { items, restoreFromTrash, emptyTrash, removeFromTrash } = useTrashStore();
  const { addDesktopIcon } = useSettingsStore();
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TrashItem } | null>(null);
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

  /**
   * Put Back. An item Files moved into the trash folder goes back to the
   * folder it came from; a desktop-only icon just reappears on the desktop.
   * Before this, "Put Back" made an icon for a file that was still in the
   * trash folder, and the file itself was never seen again.
   */
  const handleRestore = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    setContextMenu(null);
    setSelectedItem(null);
    if (!item) return;
    setError(null);

    if (item.trashedPath && item.filePath) {
      if (!backend) return;
      try {
        await backend.moveInto(item.trashedPath, backend.parent(item.filePath));
      } catch (err) {
        setError(`Could not put back "${item.name}": ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      removeFromTrash(id);
      return;
    }

    const restored = restoreFromTrash(id);
    if (restored) addDesktopIcon(restored);
  }, [items, backend, restoreFromTrash, removeFromTrash, addDesktopIcon]);

  /** Delete Immediately: the bytes go too, not just the list entry. */
  const deleteForGood = useCallback(async (item: TrashItem) => {
    if (item.trashedPath) {
      if (!backend) throw new Error('The filesystem is not ready yet');
      await backend.remove(item.trashedPath);
    }
    removeFromTrash(item.id);
  }, [backend, removeFromTrash]);

  const handleDelete = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    setContextMenu(null);
    setSelectedItem(null);
    if (!item) return;
    setError(null);
    try {
      await deleteForGood(item);
    } catch (err) {
      setError(`Could not delete "${item.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [items, deleteForGood]);

  const handleEmptyTrash = useCallback(async () => {
    setConfirmingEmpty(false);
    setContextMenu(null);
    setError(null);
    const failures: string[] = [];
    for (const item of items) {
      try {
        await deleteForGood(item);
      } catch {
        failures.push(item.name);
      }
    }
    if (failures.length) {
      setError(`Could not delete: ${failures.join(', ')}`);
    } else {
      emptyTrash();
    }
  }, [items, deleteForGood, emptyTrash]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: TrashItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
    setSelectedItem(item.id);
  }, []);

  const handleClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="trash" onClick={handleClick}>
      <div className="trash__toolbar">
        <div className="trash__title">
          <Icon name="trash" size={20} />
          <span>Trash</span>
          <span className="trash__count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>
        {confirmingEmpty ? (
          <div className="trash__confirm">
            <span>Permanently delete {items.length} item{items.length !== 1 ? 's' : ''}?</span>
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
            disabled={items.length === 0}
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

      {items.length === 0 ? (
        <div className="trash__empty">
          <Icon name="trash" size={64} color="var(--color-porcelain-300)" />
          <p>Trash is empty</p>
        </div>
      ) : (
        <div className="trash__items">
          {items.map((item) => (
            <div
              key={item.id}
              className={`trash__item ${selectedItem === item.id ? 'trash__item--selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(item.id);
                setContextMenu(null);
              }}
              onDoubleClick={() => handleRestore(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              <div className="trash__item-icon">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.name} className="trash__item-thumbnail" />
                ) : (
                  <Icon name={item.icon} size={32} color="var(--color-porcelain-500)" />
                )}
              </div>
              <div className="trash__item-info">
                <div className="trash__item-name">{item.name}</div>
                <div className="trash__item-date">
                  Deleted {formatDate(item.deletedAt)}
                  {item.filePath ? ` · from ${item.filePath}` : ''}
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
          <button
            className="trash__context-menu-item"
            onClick={() => handleRestore(contextMenu.item.id)}
          >
            <Icon name="refresh" size={14} />
            Put Back
          </button>
          <div className="trash__context-menu-divider" />
          <button
            className="trash__context-menu-item trash__context-menu-item--danger"
            onClick={() => handleDelete(contextMenu.item.id)}
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
