import React, { useState, useCallback } from 'react';
import { Icon } from '../../components/Icons';
import { useTrashStore } from '../../stores/trashStore';
import type { TrashItem } from '../../stores/trashStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { AppProps } from '../../types';
import './Trash.css';

export const Trash: React.FC<AppProps> = () => {
  const { items, restoreFromTrash, emptyTrash, removeFromTrash } = useTrashStore();
  const { addDesktopIcon } = useSettingsStore();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TrashItem } | null>(null);

  const handleRestore = useCallback((id: string) => {
    const restored = restoreFromTrash(id);
    if (restored) {
      addDesktopIcon(restored);
    }
    setSelectedItem(null);
    setContextMenu(null);
  }, [restoreFromTrash, addDesktopIcon]);

  const handleDelete = useCallback((id: string) => {
    removeFromTrash(id);
    setSelectedItem(null);
    setContextMenu(null);
  }, [removeFromTrash]);

  const handleEmptyTrash = useCallback(() => {
    if (items.length > 0 && window.confirm(`Are you sure you want to permanently delete ${items.length} item(s)?`)) {
      emptyTrash();
    }
  }, [items.length, emptyTrash]);

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
        <button
          className="trash__empty-btn"
          onClick={handleEmptyTrash}
          disabled={items.length === 0}
        >
          Empty Trash
        </button>
      </div>

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
                <div className="trash__item-date">Deleted {formatDate(item.deletedAt)}</div>
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
