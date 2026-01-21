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
 * Snaps a position to the desktop grid
 */
export const snapToGrid = (x: number, y: number): { x: number; y: number } => {
  // Safety check for window dimensions
  const winWidth = window.innerWidth || 1920;
  const winHeight = window.innerHeight || 1080;

  // Desktop area is window minus menubar at top and dock at bottom
  const desktopHeight = winHeight - MENUBAR_HEIGHT - DOCK_HEIGHT;
  const desktopWidth = winWidth;

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
