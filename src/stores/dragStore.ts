import { create } from 'zustand';

// Shared drag state for cross-component file dragging
interface DragData {
  name: string;
  path: string;
  isDirectory: boolean;
  source: string;
}

interface DragStore {
  isDragging: boolean;
  dragData: DragData | null;
  startDrag: (data: DragData) => void;
  endDrag: () => void;
}

export const useDragStore = create<DragStore>((set) => ({
  isDragging: false,
  dragData: null,

  startDrag: (data) => {
    console.log('[DragStore] startDrag:', data);
    set({ isDragging: true, dragData: data });
  },

  endDrag: () => {
    console.log('[DragStore] endDrag');
    set({ isDragging: false, dragData: null });
  },
}));
