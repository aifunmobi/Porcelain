import React, { useCallback, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { motion } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import type { WindowInstance } from '../../types';
import './Window.css';

interface WindowProps {
  window: WindowInstance;
  children: React.ReactNode;
}

export const Window: React.FC<WindowProps> = ({ window: win, children }) => {
  const {
    activeWindowId,
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    updateWindowPosition,
    updateWindowSize,
  } = useWindowStore();

  const isActive = activeWindowId === win.id;

  const handleClose = useCallback(() => {
    closeWindow(win.id);
  }, [closeWindow, win.id]);

  const handleMinimize = useCallback(() => {
    minimizeWindow(win.id);
  }, [minimizeWindow, win.id]);

  const handleMaximize = useCallback(() => {
    if (win.isMaximized) {
      restoreWindow(win.id);
    } else {
      maximizeWindow(win.id);
    }
  }, [maximizeWindow, restoreWindow, win.id, win.isMaximized]);

  const handleFocus = useCallback(() => {
    if (!isActive) {
      focusWindow(win.id);
    }
  }, [focusWindow, win.id, isActive]);

  const handleDragStop = useCallback(
    (_e: unknown, d: { x: number; y: number }) => {
      updateWindowPosition(win.id, { x: d.x, y: d.y });
    },
    [updateWindowPosition, win.id]
  );

  const handleResizeStop = useCallback(
    (
      _e: unknown,
      _direction: unknown,
      ref: HTMLElement,
      _delta: unknown,
      position: { x: number; y: number }
    ) => {
      updateWindowSize(win.id, {
        width: parseInt(ref.style.width, 10),
        height: parseInt(ref.style.height, 10),
      });
      updateWindowPosition(win.id, position);
    },
    [updateWindowSize, updateWindowPosition, win.id]
  );

  const windowStyle = useMemo(
    () => ({
      zIndex: win.zIndex,
      display: win.isMinimized ? 'none' : 'flex',
    }),
    [win.zIndex, win.isMinimized]
  );

  if (win.isMinimized) {
    return null;
  }


  return (
    <Rnd
      position={{ x: win.position.x, y: win.position.y }}
      size={{ width: win.size.width, height: win.size.height }}
      minWidth={win.minSize.width}
      minHeight={win.minSize.height}
      maxWidth={win.maxSize?.width}
      maxHeight={win.maxSize?.height}
      bounds="parent"
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={handleFocus}
      style={windowStyle}
      className={`window ${isActive ? 'window--active' : 'window--inactive'}`}
      dragHandleClassName="window-drag-handle"
      disableDragging={win.isMaximized}
      enableResizing={!win.isMaximized}
      enableUserSelectHack={false}
      cancel=".file-manager__grid-item,.file-manager__list-item"
    >
      <motion.div
        className="window__content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="window__titlebar window-drag-handle">
          <div className="window__controls">
            <button
              className="window__control window__control--close"
              onClick={handleClose}
              title="Close"
            >
              <span className="window__control-icon">×</span>
            </button>
            <button
              className="window__control window__control--minimize"
              onClick={handleMinimize}
              title="Minimize"
            >
              <span className="window__control-icon">−</span>
            </button>
            <button
              className="window__control window__control--maximize"
              onClick={handleMaximize}
              title={win.isMaximized ? 'Restore' : 'Maximize'}
            >
              <span className="window__control-icon">
                {win.isMaximized ? '◇' : '□'}
              </span>
            </button>
          </div>
          <div className="window__title">{win.title}</div>
          <div className="window__spacer" />
        </div>
        <div className="window__body">{children}</div>
      </motion.div>
    </Rnd>
  );
};

export default Window;
