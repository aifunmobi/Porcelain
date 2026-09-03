import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesktopIcon } from '../types';

export interface TrashItem extends DesktopIcon {
  deletedAt: Date;
  originalPosition: { x: number; y: number };
  /**
   * Where the file lives now, for items that were really moved into the
   * trash folder by Files. Desktop-only icons (no file behind them) omit it.
   */
  trashedPath?: string;
}

interface TrashState {
  items: TrashItem[];
  // Actions
  moveToTrash: (icon: DesktopIcon & { trashedPath?: string }) => void;
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
            // Trashing the same path twice must not leave two entries with
            // one id; the newer one wins.
            ...state.items.filter((i) => i.id !== icon.id),
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
        const restoredIcon: DesktopIcon & Partial<Pick<TrashItem, 'deletedAt' | 'originalPosition' | 'trashedPath'>> = {
          ...item,
          position: item.originalPosition,
        };
        delete restoredIcon.deletedAt;
        delete restoredIcon.originalPosition;
        delete restoredIcon.trashedPath;
        return restoredIcon;
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
