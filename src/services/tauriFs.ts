/**
 * Tauri File System Service
 * Provides real file system access when running in Tauri,
 * falls back to mock data when running in browser
 */

import {
  readDir,
  readFile,
  writeFile,
  mkdir,
  remove,
  rename,
  copyFile,
  exists,
  stat,
} from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { homeDir, desktopDir, documentDir, downloadDir, pictureDir, videoDir, audioDir } from '@tauri-apps/api/path';

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size?: number;
  modifiedAt?: Date;
  children?: FileEntry[];
}

// Check if running in Tauri
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' &&
    (('__TAURI__' in window) || ('__TAURI_INTERNALS__' in window));
};

// Get special directories
export const getSpecialDirs = async () => {
  if (!isTauri()) {
    return {
      home: '/home/user',
      desktop: '/home/user/Desktop',
      documents: '/home/user/Documents',
      downloads: '/home/user/Downloads',
      pictures: '/home/user/Pictures',
      videos: '/home/user/Videos',
      music: '/home/user/Music',
    };
  }

  try {
    const [home, desktop, documents, downloads, pictures, videos, music] = await Promise.all([
      homeDir(),
      desktopDir(),
      documentDir(),
      downloadDir(),
      pictureDir(),
      videoDir(),
      audioDir(),
    ]);

    return {
      home,
      desktop,
      documents,
      downloads,
      pictures,
      videos,
      music,
    };
  } catch (error) {
    console.error('Error getting special directories:', error);
    return {
      home: '/home/user',
      desktop: '/home/user/Desktop',
      documents: '/home/user/Documents',
      downloads: '/home/user/Downloads',
      pictures: '/home/user/Pictures',
      videos: '/home/user/Videos',
      music: '/home/user/Music',
    };
  }
};

// Read directory contents
export const readDirectory = async (path: string): Promise<FileEntry[]> => {
  if (!isTauri()) {
    console.log('Not in Tauri environment, returning empty array');
    return [];
  }

  try {
    const entries = await readDir(path);
    const fileEntries: FileEntry[] = [];

    for (const entry of entries) {
      const fullPath = `${path}/${entry.name}`;
      try {
        const fileStat = await stat(fullPath);
        fileEntries.push({
          name: entry.name,
          path: fullPath,
          isDirectory: fileStat.isDirectory,
          isFile: fileStat.isFile,
          size: fileStat.size,
          modifiedAt: fileStat.mtime ? new Date(fileStat.mtime) : undefined,
        });
      } catch {
        // If stat fails, still include the entry with basic info
        fileEntries.push({
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory || false,
          isFile: !entry.isDirectory,
        });
      }
    }

    // Sort: directories first, then files, both alphabetically
    return fileEntries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
};

// Read file as text
export const readFileText = async (path: string): Promise<string> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  const contents = await readFile(path);
  return new TextDecoder().decode(contents);
};

// Read file as binary
export const readFileBinary = async (path: string): Promise<Uint8Array> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  return await readFile(path);
};

// Write text file
export const writeTextFile = async (path: string, content: string): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await writeFile(path, new TextEncoder().encode(content));
};

// Write binary file
export const writeBinaryFile = async (path: string, content: Uint8Array): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await writeFile(path, content);
};

// Create directory
export const createDirectory = async (path: string): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await mkdir(path, { recursive: true });
};

// Delete file or directory
export const deleteFile = async (path: string): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await remove(path, { recursive: true });
};

// Rename/move file or directory
export const renameFile = async (oldPath: string, newPath: string): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await rename(oldPath, newPath);
};

// Copy file
export const copyFileToPath = async (source: string, destination: string): Promise<void> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  await copyFile(source, destination);
};

// Check if file/directory exists
export const fileExists = async (path: string): Promise<boolean> => {
  if (!isTauri()) {
    return false;
  }

  return await exists(path);
};

// Get file stats
export const getFileStats = async (path: string) => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  return await stat(path);
};

// Open file dialog
export const openFileDialog = async (options?: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
  directory?: boolean;
}): Promise<string | string[] | null> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  return await open({
    title: options?.title,
    filters: options?.filters,
    multiple: options?.multiple,
    directory: options?.directory,
  });
};

// Save file dialog
export const saveFileDialog = async (options?: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
}): Promise<string | null> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  return await save({
    title: options?.title,
    filters: options?.filters,
    defaultPath: options?.defaultPath,
  });
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

// Check if file is an image
export const isImageFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
};

// Check if file is a video
export const isVideoFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv'].includes(ext);
};

// Check if file is an audio file
export const isAudioFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext);
};

// Check if file is a text file
export const isTextFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'sh', 'bash', 'zsh', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp'].includes(ext);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get icon for file type
export const getFileIcon = (filename: string, isDirectory: boolean): string => {
  if (isDirectory) return 'folder';

  const ext = getFileExtension(filename);

  // Images
  if (isImageFile(filename)) return 'image';

  // Videos
  if (isVideoFile(filename)) return 'video';

  // Audio
  if (isAudioFile(filename)) return 'music';

  // Documents
  if (['pdf'].includes(ext)) return 'file-text';
  if (['doc', 'docx'].includes(ext)) return 'file-text';
  if (['xls', 'xlsx'].includes(ext)) return 'file-text';
  if (['ppt', 'pptx'].includes(ext)) return 'file-text';

  // Code
  if (isTextFile(filename)) return 'file-code';

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return 'archive';

  // Default
  return 'file';
};

// Convert file path to URL for display (images, videos, etc.)
export const filePathToUrl = async (path: string): Promise<string> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  // For Tauri, we need to convert the path to an asset protocol URL
  // This allows the webview to access local files
  return `asset://localhost/${encodeURIComponent(path)}`;
};

// Read file as base64 data URL
export const readFileAsDataUrl = async (path: string): Promise<string> => {
  if (!isTauri()) {
    throw new Error('Not in Tauri environment');
  }

  const contents = await readFile(path);
  const ext = getFileExtension(path);

  // Determine MIME type
  let mimeType = 'application/octet-stream';
  if (isImageFile(path)) {
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
    };
    mimeType = mimeTypes[ext] || 'image/png';
  } else if (isVideoFile(path)) {
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
    };
    mimeType = mimeTypes[ext] || 'video/mp4';
  } else if (isAudioFile(path)) {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
    };
    mimeType = mimeTypes[ext] || 'audio/mpeg';
  }

  // Convert to base64
  const base64 = btoa(
    contents.reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  return `data:${mimeType};base64,${base64}`;
};
