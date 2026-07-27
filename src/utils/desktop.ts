// Desktop Utilities and Constants - Porcelain OS

// Grid and Layout Constants
export const GRID_SIZE = 90;
export const MIN_X = 20;
export const MIN_Y = 20;
export const ICON_WIDTH = 80;
export const ICON_HEIGHT = 100;
export const DOCK_HEIGHT = 80;
export const MENUBAR_HEIGHT = 28;

/**
 * The icon size level, as a multiplier. Icons render at `stored position ×
 * scale`, so stored positions stay in one scale-independent space and changing
 * the size setting never rewrites anybody's desktop arrangement.
 */
export const iconScale = (): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--icon-scale');
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/**
 * Snaps a position to the desktop grid.
 *
 * Takes screen coordinates and returns a stored position. Every write of an
 * icon position goes through here, which is why the scale division lives here
 * and not at the seven call sites.
 */
export const snapToGrid = (x: number, y: number): { x: number; y: number } => {
  // Safety check for window dimensions
  const winWidth = window.innerWidth || 1920;
  const winHeight = window.innerHeight || 1080;

  // Into the unscaled space that positions are stored in
  const scale = iconScale();
  x /= scale;
  y /= scale;

  // Desktop area is window minus menubar at top and dock at bottom
  const desktopHeight = (winHeight - MENUBAR_HEIGHT - DOCK_HEIGHT) / scale;
  const desktopWidth = winWidth / scale;

  // Calculate valid grid boundaries (ensure at least 0)
  const maxGridX = Math.max(0, Math.floor((desktopWidth - ICON_WIDTH - MIN_X) / GRID_SIZE));
  const maxGridY = Math.max(0, Math.floor((desktopHeight - ICON_HEIGHT - MIN_Y) / GRID_SIZE));

  // Snap to nearest grid position
  let gridX = Math.round((x - MIN_X) / GRID_SIZE);
  let gridY = Math.round((y - MIN_Y) / GRID_SIZE);

  // Clamp to valid grid range
  gridX = Math.max(0, Math.min(maxGridX, gridX));
  gridY = Math.max(0, Math.min(maxGridY, gridY));

  // Convert back to pixel coordinates
  return {
    x: gridX * GRID_SIZE + MIN_X,
    y: gridY * GRID_SIZE + MIN_Y
  };
};

/**
 * Tidy the desktop: pack every icon onto the grid with no gaps or overlaps.
 *
 * This is a clean-up, not a sort — icons keep the order they are already in
 * (reading left to right, then top to bottom), so a deliberate arrangement
 * survives while the crooked spacing does not. Columns fill downward, which is
 * the shape the desktop already ships in.
 *
 * Positions are stored unscaled, so the icon size level only affects how many
 * rows fit on screen — see the note on snapToGrid.
 */
export const arrangeIcons = <T extends { position: { x: number; y: number } }>(
  icons: T[]
): T[] => {
  const scale = iconScale();
  const usableHeight = ((window.innerHeight || 1080) - MENUBAR_HEIGHT - DOCK_HEIGHT) / scale;
  const rows = Math.max(1, Math.floor((usableHeight - MIN_Y) / GRID_SIZE));

  return [...icons]
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    .map((icon, i) => ({
      ...icon,
      position: {
        x: Math.floor(i / rows) * GRID_SIZE + MIN_X,
        y: (i % rows) * GRID_SIZE + MIN_Y,
      },
    }));
};

/**
 * Checks if a file is an image based on extension
 */
export const isImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext);
};

/**
 * Checks if a file is an audio file based on extension
 */
export const isAudioFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext);
};

/**
 * Checks if a file is a video file based on extension
 */
export const isVideoFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
};

/**
 * Gets the appropriate icon for a file based on its extension
 */
export const getFileIcon = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';

  if (isImageFile(filename)) return 'image';
  if (isAudioFile(filename)) return 'music';
  if (isVideoFile(filename)) return 'video';
  if (['pdf'].includes(ext)) return 'file-text';
  if (['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) return 'file-text';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'file-spreadsheet';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'rs'].includes(ext)) return 'code';

  return 'file';
};

/**
 * Gets the MIME type category for a file
 */
export const getFileMimeCategory = (filename: string): string | null => {
  if (isImageFile(filename)) return 'image';
  if (isAudioFile(filename)) return 'audio';
  if (isVideoFile(filename)) return 'video';
  return null;
};

// Custom Event Types for type-safe event communication
export interface DesktopDropEventDetail {
  name: string;
  path: string;
  isDirectory: boolean;
  iconId?: string;
}

export interface DesktopIconMoveEventDetail {
  iconId: string;
  position: { x: number; y: number };
}

// Type-safe custom event creators
export const createDropToFileManagerEvent = (detail: DesktopDropEventDetail): CustomEvent => {
  return new CustomEvent('porcelain-drop-to-filemanager', { detail });
};

export const createDesktopIconMoveEvent = (detail: DesktopIconMoveEventDetail): CustomEvent => {
  return new CustomEvent('porcelain-icon-move', { detail });
};

// Type-safe event listener helpers
export const addDropToFileManagerListener = (
  callback: (e: CustomEvent<DesktopDropEventDetail>) => void
): (() => void) => {
  const handler = (e: Event) => callback(e as CustomEvent<DesktopDropEventDetail>);
  window.addEventListener('porcelain-drop-to-filemanager', handler);
  return () => window.removeEventListener('porcelain-drop-to-filemanager', handler);
};

export const addDesktopIconMoveListener = (
  callback: (e: CustomEvent<DesktopIconMoveEventDetail>) => void
): (() => void) => {
  const handler = (e: Event) => callback(e as CustomEvent<DesktopIconMoveEventDetail>);
  window.addEventListener('porcelain-icon-move', handler);
  return () => window.removeEventListener('porcelain-icon-move', handler);
};
