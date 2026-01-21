import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesktopIcon } from '../types';

export interface TrashItem extends DesktopIcon {
  deletedAt: Date;
  originalPosition: { x: number; y: number };
}

interface TrashState {
  items: TrashItem[];
  // Actions
  moveToTrash: (icon: DesktopIcon) => void;
  restoreFromTrash: (id: string) => DesktopIcon | null;
  emptyTrash: () => void;
  removeFromTrash: (id: string) => void;
  getTrashCount: () => number;
}

export const useTrashStore = create<TrashState>()(
  persist(
    (set, get) => ({
      items: [],

      moveToTrash: (icon) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...icon,
              deletedAt: new Date(),
              originalPosition: icon.position,
            },
          ],
        })),

      restoreFromTrash: (id) => {
        const state = get();
        const item = state.items.find((i) => i.id === id);
        if (!item) return null;

        // Remove from trash
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));

        // Return the restored icon with original position
        const { deletedAt, originalPosition, ...restoredIcon } = item;
        return {
          ...restoredIcon,
          position: originalPosition,
        };
      },

      emptyTrash: () => set({ items: [] }),

      removeFromTrash: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      getTrashCount: () => get().items.length,
    }),
    {
      name: 'porcelain-trash',
    }
  )
);
