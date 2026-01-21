import { create } from 'zustand';

// Shared drag state for cross-component file dragging
export interface DragData {
  name: string;
  path: string;
  isDirectory: boolean;
  source: 'file-manager' | 'desktop';
  iconId?: string;
}

interface Position {
  x: number;
  y: number;
}

interface DragStore {
  // Cross-component drag state (file manager <-> desktop)
  isDragging: boolean;
  dragData: DragData | null;
  mousePosition: Position | null;
  dropTarget: 'desktop' | 'file-manager' | null;

  // Actions
  startDrag: (data: DragData, pos: Position) => void;
  updateMousePosition: (pos: Position) => void;
  setDropTarget: (target: 'desktop' | 'file-manager' | null) => void;
  endDrag: () => DragData | null;
  cancelDrag: () => void;
}

export const useDragStore = create<DragStore>((set, get) => ({
  isDragging: false,
  dragData: null,
  mousePosition: null,
  dropTarget: null,

  startDrag: (data, pos) => {
    console.log('[DragStore] startDrag:', data.name, 'from', data.source);
    set({
      isDragging: true,
      dragData: data,
      mousePosition: pos,
      dropTarget: null,
    });
  },

  updateMousePosition: (pos) => {
    set({ mousePosition: pos });
  },

  setDropTarget: (target) => {
    set({ dropTarget: target });
  },

  endDrag: () => {
    const { dragData, dropTarget } = get();
    console.log('[DragStore] endDrag - dropTarget:', dropTarget);
    set({
      isDragging: false,
      dragData: null,
      mousePosition: null,
      dropTarget: null,
    });
    return dragData;
  },

  cancelDrag: () => {
    console.log('[DragStore] cancelDrag');
    set({
      isDragging: false,
      dragData: null,
      mousePosition: null,
      dropTarget: null,
    });
  },
}));
