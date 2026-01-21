import React, { useEffect, useCallback } from 'react';
import { useDragStore } from '../stores/dragStore';
import { Icon } from './Icons';
import './DragOverlay.css';

interface DragOverlayProps {
  onDrop: (data: { name: string; path: string; isDirectory: boolean }, x: number, y: number) => void;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ onDrop }) => {
  const { isDragging, dragData, mousePosition, updateMousePosition, endDrag } = useDragStore();

  // Handle mouse move during drag
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging) {
      updateMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, updateMousePosition]);

  // Handle mouse up (drop)
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (isDragging && dragData) {
      const dropX = e.clientX;
      const dropY = e.clientY - 28; // Adjust for menu bar

      // Check if dropping on desktop (not on a window)
      const target = e.target as HTMLElement;
      const isOverWindow = target.closest('.window');
      const isOverDock = target.closest('.dock');
      const isOverMenuBar = target.closest('.menu-bar');

      console.log('[DragOverlay] drop at:', dropX, dropY, 'target:', target.className);
      console.log('[DragOverlay] isOverWindow:', !!isOverWindow, 'isOverDock:', !!isOverDock);

      if (!isOverWindow && !isOverDock && !isOverMenuBar) {
        // Drop on desktop
        onDrop(dragData, dropX, dropY);
      }

      endDrag();
    }
  }, [isDragging, dragData, endDrag, onDrop]);

  // Add global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  if (!isDragging || !dragData || !mousePosition) {
    return null;
  }

  return (
    <div className="drag-overlay">
      {/* Drop zone indicator */}
      <div className="drag-overlay__drop-zone">
        <Icon name="plus" size={32} />
        <span>Drop to add to Desktop</span>
      </div>

      {/* Dragged item preview following cursor */}
      <div
        className="drag-overlay__preview"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
        }}
      >
        <Icon name={dragData.isDirectory ? 'folder' : 'file'} size={24} />
        <span>{dragData.name}</span>
      </div>
    </div>
  );
};

export default DragOverlay;
