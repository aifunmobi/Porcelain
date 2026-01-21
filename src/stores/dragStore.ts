import { create } from 'zustand';

// Shared drag state for cross-component file dragging
interface DragData {
  name: string;
  path: string;
  isDirectory: boolean;
  source: string;
}

interface Position {
  x: number;
  y: number;
}

interface DragStore {
  isDragging: boolean;
  dragData: DragData | null;
  mousePosition: Position | null;
  startPosition: Position | null;
  startDrag: (data: DragData, startPos: Position) => void;
  updateMousePosition: (pos: Position) => void;
  endDrag: () => { dragData: DragData | null; mousePosition: Position | null };
}

export const useDragStore = create<DragStore>((set, get) => ({
  isDragging: false,
  dragData: null,
  mousePosition: null,
  startPosition: null,

  startDrag: (data, startPos) => {
    console.log('[DragStore] startDrag:', data, 'at', startPos);
    set({
      isDragging: true,
      dragData: data,
      mousePosition: startPos,
      startPosition: startPos
    });
  },

  updateMousePosition: (pos) => {
    set({ mousePosition: pos });
  },

  endDrag: () => {
    const state = get();
    console.log('[DragStore] endDrag at position:', state.mousePosition);
    const result = { dragData: state.dragData, mousePosition: state.mousePosition };
    set({ isDragging: false, dragData: null, mousePosition: null, startPosition: null });
    return result;
  },
}));
