import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWindowStore } from '../../stores/windowStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import './Desktop.css';

export const Desktop: React.FC = () => {
  const { wallpaper, wallpaperType, desktopIcons, updateDesktopIcon } = useSettingsStore();
  const { openWindow } = useWindowStore();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const getWallpaperStyle = () => {
    if (wallpaperType === 'color') {
      return { backgroundColor: wallpaper };
    }
    if (wallpaperType === 'gradient') {
      return { background: wallpaper };
    }
    return { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  };

  const handleIconDoubleClick = useCallback(
    (appId: string) => {
      const app = appRegistry[appId];
      if (app) {
        openWindow(app);
      }
    },
    [openWindow]
  );

  const handleIconClick = useCallback((iconId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIcon(iconId);
    setContextMenu(null);
  }, []);

  const handleDesktopClick = useCallback(() => {
    setSelectedIcon(null);
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      className="desktop"
      style={getWallpaperStyle()}
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
    >
      <div className="desktop__icons">
        {desktopIcons.map((icon) => (
          <motion.div
            key={icon.id}
            className={`desktop__icon ${selectedIcon === icon.id ? 'desktop__icon--selected' : ''}`}
            style={{
              left: icon.position.x,
              top: icon.position.y,
            }}
            onClick={(e) => handleIconClick(icon.id, e)}
            onDoubleClick={() => icon.appId && handleIconDoubleClick(icon.appId)}
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              updateDesktopIcon(icon.id, {
                position: {
                  x: icon.position.x + info.offset.x,
                  y: icon.position.y + info.offset.y,
                },
              });
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="desktop__icon-image">
              <Icon name={icon.icon} size={48} color="var(--color-porcelain-600)" />
            </div>
            <div className="desktop__icon-label">{icon.name}</div>
          </motion.div>
        ))}
      </div>

      {contextMenu && (
        <>
          <div
            className="desktop__context-overlay"
            onClick={() => setContextMenu(null)}
          />
          <motion.div
            className="desktop__context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            <div className="desktop__context-item">New Folder</div>
            <div className="desktop__context-divider" />
            <div className="desktop__context-item">Get Info</div>
            <div className="desktop__context-item">Change Desktop Background...</div>
            <div className="desktop__context-divider" />
            <div className="desktop__context-item">Use Stacks</div>
            <div className="desktop__context-item">Sort By</div>
            <div className="desktop__context-item">Clean Up</div>
            <div className="desktop__context-item">Clean Up By</div>
            <div className="desktop__context-divider" />
            <div className="desktop__context-item">Show View Options</div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Desktop;
