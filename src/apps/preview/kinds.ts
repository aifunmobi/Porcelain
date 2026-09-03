import { getFileExtension } from '../../services/tauriFs';

export type DocKind = 'image' | 'pdf' | 'markdown' | 'text' | 'unsupported';

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];

export const kindForPath = (path: string): DocKind => {
  const ext = getFileExtension(path);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (['txt', 'json', 'js', 'ts', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml', 'log'].includes(ext))
    return 'text';
  return 'unsupported';
};

/** Files Preview claims from Files' double-click. */
export const PREVIEWABLE = [...IMAGE_EXT, 'pdf', 'md', 'markdown', 'txt'];

