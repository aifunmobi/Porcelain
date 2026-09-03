import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesktopIcon } from '../types';

/**
 * One trash, not two. The filesystem's trash folder (`backend.trashDir`) is
 * the source of truth for files; this store only remembers what the folder
 * cannot: where each file came from, when it was trashed, and the desktop
 * icon that pointed at it. Desktop icons with no file behind them (app
 * shortcuts, untitled folders) have nowhere else to go, so they are kept
 * here in full.
 */

export interface TrashRecord {
  /** The path the file had before it was trashed. */
  originalPath: string;
  /** ISO timestamp — Date objects do not survive persist. */
  deletedAt: string;
  /** A desktop icon that pointed at the file, restored with it. */
  icon?: DesktopIcon;
}

export interface IconOnlyItem extends DesktopIcon {
  deletedAt: string;
}

interface TrashState {
  /** Keyed by the path inside the trash folder. */
  records: Record<string, TrashRecord>;
  iconOnly: IconOnlyItem[];

  recordTrashed: (trashedPath: string, originalPath: string, icon?: DesktopIcon) => void;
  forget: (trashedPath: string) => void;
  addIconOnly: (icon: DesktopIcon) => void;
  removeIconOnly: (id: string) => void;
  clear: () => void;
}

/** The icon fields alone, without the trash bookkeeping. */
export const toDesktopIcon = (item: DesktopIcon): DesktopIcon => ({
  id: item.id,
  appId: item.appId,
  fileId: item.fileId,
  filePath: item.filePath,
  name: item.name,
  icon: item.icon,
  position: item.position,
  isFile: item.isFile,
  mimeType: item.mimeType,
});

/** The shape this store had before the two trash models were merged. */
interface LegacyTrashItem extends DesktopIcon {
  deletedAt: string | Date;
  originalPosition: { x: number; y: number };
  trashedPath?: string;
}

export const useTrashStore = create<TrashState>()(
  persist(
    (set) => ({
      records: {},
      iconOnly: [],

      recordTrashed: (trashedPath, originalPath, icon) =>
        set((state) => ({
          records: {
            ...state.records,
            [trashedPath]: { originalPath, deletedAt: new Date().toISOString(), icon },
          },
        })),

      forget: (trashedPath) =>
        set((state) => {
          const records = { ...state.records };
          delete records[trashedPath];
          return { records };
        }),

      addIconOnly: (icon) =>
        set((state) => ({
          iconOnly: [
            ...state.iconOnly.filter((i) => i.id !== icon.id),
            { ...icon, thumbnail: undefined, deletedAt: new Date().toISOString() },
          ],
        })),

      removeIconOnly: (id) =>
        set((state) => ({ iconOnly: state.iconOnly.filter((i) => i.id !== id) })),

      clear: () => set({ records: {}, iconOnly: [] }),
    }),
    {
      name: 'porcelain-trash',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version >= 2) return persisted as TrashState;
        const legacy = (persisted as { items?: LegacyTrashItem[] })?.items ?? [];
        const records: Record<string, TrashRecord> = {};
        const iconOnly: IconOnlyItem[] = [];
        for (const item of legacy) {
          const deletedAt = new Date(item.deletedAt).toISOString();
          const restored: DesktopIcon = { ...toDesktopIcon(item), position: item.originalPosition };
          if (item.trashedPath && item.filePath) {
            records[item.trashedPath] = { originalPath: item.filePath, deletedAt, icon: restored };
          } else {
            iconOnly.push({ ...restored, deletedAt });
          }
        }
        return { records, iconOnly } as TrashState;
      },
    }
  )
);
