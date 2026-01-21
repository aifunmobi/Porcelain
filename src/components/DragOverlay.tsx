import React, { useEffect, useCallback } from 'react';
import { useDragStore } from '../stores/dragStore';
import { Icon } from './Icons';
import './DragOverlay.css';

interface DragOverlayProps {
  onDropToDesktop: (data: { name: string; path: string; isDirectory: boolean }, x: number, y: number) => void;
  onDropToFileManager: (data: { name: string; path: string; isDirectory: boolean; iconId?: string }) => void;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ onDropToDesktop, onDropToFileManager }) => {
  const { isDragging, dragData, mousePosition, updateMousePosition, setDropTarget, dropTarget, endDrag, cancelDrag } = useDragStore();

  // Handle mouse move during drag
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;

    updateMousePosition({ x: e.clientX, y: e.clientY });

    // IMPORTANT: Hide the overlay temporarily to detect elements below
    // This is the key trick from https://javascript.info/mouse-drag-and-drop
    const overlay = document.querySelector('.drag-overlay') as HTMLElement;
    if (overlay) overlay.style.display = 'none';

    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);

    if (overlay) overlay.style.display = '';

    if (!elemBelow) {
      setDropTarget(null);
      return;
    }

    const isOverFileManager = elemBelow.closest('.file-manager') !== null;
    const isOverWindow = elemBelow.closest('.window') !== null;
    const isOverDock = elemBelow.closest('.dock') !== null;
    const isOverMenuBar = elemBelow.closest('.menu-bar') !== null;

    // Determine drop target based on drag source and hover location
    if (dragData?.source === 'desktop' && isOverFileManager) {
      setDropTarget('file-manager');
    } else if (dragData?.source === 'file-manager' && !isOverWindow && !isOverDock && !isOverMenuBar) {
      setDropTarget('desktop');
    } else {
      setDropTarget(null);
    }
  }, [isDragging, dragData?.source, updateMousePosition, setDropTarget]);

  // Handle mouse up (drop)
  const handlePointerUp = useCallback((e: PointerEvent) => {
    console.log('[DragOverlay] pointerup fired! isDragging:', isDragging, 'dragData:', dragData);
    if (!isDragging || !dragData) return;

    const dropX = e.clientX;
    const dropY = e.clientY - 28; // Adjust for menu bar

    // IMPORTANT: Hide the overlay temporarily to detect elements below
    const overlay = document.querySelector('.drag-overlay') as HTMLElement;
    if (overlay) overlay.style.display = 'none';

    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);

    if (overlay) overlay.style.display = '';

    const isOverFileManager = elemBelow?.closest('.file-manager') !== null;
    const isOverWindow = elemBelow?.closest('.window') !== null;
    const isOverDock = elemBelow?.closest('.dock') !== null;
    const isOverMenuBar = elemBelow?.closest('.menu-bar') !== null;

    console.log('[DragOverlay] drop - source:', dragData.source);
    console.log('[DragOverlay] drop - elemBelow:', elemBelow?.tagName, elemBelow?.className);
    console.log('[DragOverlay] drop - closest .file-manager:', elemBelow?.closest('.file-manager'));
    console.log('[DragOverlay] drop - isOverFileManager:', isOverFileManager, 'isOverWindow:', isOverWindow);

    if (dragData.source === 'file-manager') {
      // Dragging FROM file manager
      if (!isOverWindow && !isOverDock && !isOverMenuBar) {
        // Drop on desktop - create icon
        console.log('[DragOverlay] dropping to desktop:', dragData);
        onDropToDesktop(dragData, dropX, dropY);
      }
    } else if (dragData.source === 'desktop') {
      // Dragging FROM desktop
      if (isOverFileManager) {
        // Drop on file manager - copy file
        console.log('[DragOverlay] dropping to file manager:', dragData);
        onDropToFileManager(dragData);
      } else if (!isOverWindow && !isOverDock && !isOverMenuBar) {
        // Dropped back on desktop - update position of existing icon
        console.log('[DragOverlay] repositioning desktop icon:', dragData);
        // Dispatch event to update icon position
        window.dispatchEvent(new CustomEvent('porcelain-reposition-desktop-icon', {
          detail: { iconId: dragData.iconId, x: dropX, y: dropY }
        }));
      }
      // If dropped on window/dock/menu, just cancel
    }

    endDrag();
  }, [isDragging, dragData, endDrag, onDropToDesktop, onDropToFileManager]);

  // Handle escape key to cancel drag
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isDragging) {
      cancelDrag();
    }
  }, [isDragging, cancelDrag]);

  // Add global event listeners when dragging
  // Use capture phase to ensure we get events before any other handlers can stop them
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove, { capture: true });
      document.addEventListener('pointerup', handlePointerUp, { capture: true });
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove, { capture: true });
        document.removeEventListener('pointerup', handlePointerUp, { capture: true });
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp, handleKeyDown]);

  if (!isDragging || !dragData || !mousePosition) {
    return null;
  }

  // Only show drop zone message when dragging TO file manager (more important feedback)
  const showDropZone = dropTarget === 'file-manager';

  return (
    <div className="drag-overlay">
      {/* Drop zone indicator - only show when dropping to file manager */}
      {showDropZone && (
        <div className="drag-overlay__drop-zone drag-overlay__drop-zone--active">
          <Icon name="check" size={32} />
          <span>Drop to copy to folder</span>
        </div>
      )}

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
