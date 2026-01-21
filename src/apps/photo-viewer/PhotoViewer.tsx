import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  isImageFile,
  openFileDialog,
} from '../../services/tauriFs';
import { convertFileSrc } from '@tauri-apps/api/core';
import './PhotoViewer.css';

// Sample images for browser mode
const sampleImages = [
  { id: '1', name: 'sunset.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ff7e5f"/><stop offset="100%" style="stop-color:#feb47b"/></linearGradient></defs><rect fill="url(#sky)" width="400" height="300"/><circle cx="200" cy="200" r="40" fill="#ffd700"/></svg>'), path: '' },
  { id: '2', name: 'mountains.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#87ceeb" width="400" height="300"/><polygon points="0,300 150,100 300,300" fill="#6b8e23"/><polygon points="100,300 250,150 400,300" fill="#556b2f"/></svg>'), path: '' },
  { id: '3', name: 'ocean.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#1e90ff" width="400" height="200"/><rect y="200" fill="#faf0e6" width="400" height="100"/></svg>'), path: '' },
];

interface ImageFile {
  id: string;
  name: string;
  url: string;
  path: string;
}

interface PhotoViewerProps extends AppProps {
  initialImage?: ImageFile;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ initialImage }) => {
  const [isInTauri, setIsInTauri] = useState(false);
  const [images, setImages] = useState<ImageFile[]>(initialImage ? [initialImage] : sampleImages);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(initialImage || sampleImages[0]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; image: ImageFile } | null>(null);

  // Load images from a folder
  const loadImagesFromFolder = useCallback(async (folderPath: string) => {
    setIsLoading(true);
    setCurrentFolder(folderPath);

    try {
      const entries = await readDirectory(folderPath);
      const imageFiles = entries.filter(
        (entry) => !entry.isDirectory && isImageFile(entry.name)
      );

      const loadedImages: ImageFile[] = imageFiles.slice(0, 100).map((file) => ({
        id: file.path,
        name: file.name,
        url: convertFileSrc(file.path), // Use convertFileSrc for efficient loading
        path: file.path,
      }));

      if (loadedImages.length > 0) {
        setImages(loadedImages);
        setSelectedImage(loadedImages[0]);
      } else {
        setImages([]);
        setSelectedImage(null);
      }
    } catch (err) {
      console.error('Error loading images from folder:', err);
      setImages([]);
      setSelectedImage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize - auto-load from Pictures folder
  useEffect(() => {
    const init = async () => {
      const tauriEnv = isTauri();
      setIsInTauri(tauriEnv);

      if (tauriEnv) {
        // Load images from Pictures folder by default
        try {
          const dirs = await getSpecialDirs();
          if (dirs.pictures) {
            await loadImagesFromFolder(dirs.pictures);
          }
        } catch (err) {
          console.error('Error initializing:', err);
        }
      }
    };
    init();
  }, [loadImagesFromFolder]);

  // Select image
  const handleSelectImage = useCallback((img: ImageFile) => {
    setZoom(1);
    setRotation(0);
    setSelectedImage(img);
  }, []);

  // Open folder dialog
  const handleOpenFolder = useCallback(async () => {
    if (!isInTauri) return;

    try {
      const selected = await openFileDialog({
        title: 'Select Image Folder',
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        await loadImagesFromFolder(selected);
      }
    } catch (err) {
      console.error('Error opening folder:', err);
    }
  }, [isInTauri, loadImagesFromFolder]);

  // Open file dialog (for individual files)
  const handleOpenFiles = useCallback(async () => {
    if (!isInTauri) return;

    try {
      const selected = await openFileDialog({
        title: 'Open Images',
        filters: [
          {
            name: 'Images',
            extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
          },
        ],
        multiple: true,
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const newImages: ImageFile[] = paths.map((path) => {
          const name = path.split('/').pop() || 'image';
          return {
            id: path,
            name,
            url: convertFileSrc(path),
            path,
          };
        });

        if (newImages.length > 0) {
          setImages((prev) => [...prev, ...newImages]);
          setSelectedImage(newImages[0]);
        }
      }
    } catch (err) {
      console.error('Error opening files:', err);
    }
  }, [isInTauri]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Navigate to next/previous image
  const handlePrevious = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex > 0) {
      handleSelectImage(images[currentIndex - 1]);
    }
  }, [selectedImage, images, handleSelectImage]);

  const handleNext = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex < images.length - 1) {
      handleSelectImage(images[currentIndex + 1]);
    }
  }, [selectedImage, images, handleSelectImage]);

  // Get folder name from path
  const getFolderName = (path: string) => {
    if (!path) return 'Library';
    const parts = path.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Library';
  };

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, image: ImageFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, image });
  }, []);

  // Handle copy to clipboard
  const handleCopy = useCallback(async (image: ImageFile) => {
    if (!image.path) {
      console.log('[PhotoViewer] Cannot copy - no file path');
      setContextMenu(null);
      return;
    }

    const iconData = {
      type: 'porcelain-desktop-icon',
      icon: {
        id: `photo-${Date.now()}`,
        name: image.name,
        icon: 'image',
        position: { x: 20, y: 20 },
        isFile: true,
        filePath: image.path,
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(iconData));
      console.log('[PhotoViewer] Copied to clipboard:', iconData);
    } catch (err) {
      console.error('[PhotoViewer] Failed to copy:', err);
    }

    setContextMenu(null);
  }, []);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  return (
    <div className="photo-viewer">
      <div className="photo-viewer__sidebar">
        <div className="photo-viewer__sidebar-header">
          <span title={currentFolder}>{getFolderName(currentFolder)}</span>
          {isInTauri && (
            <div className="photo-viewer__header-buttons">
              <button
                className="photo-viewer__open-btn"
                onClick={handleOpenFolder}
                title="Open Folder"
              >
                <Icon name="folder" size={14} />
              </button>
              <button
                className="photo-viewer__open-btn"
                onClick={handleOpenFiles}
                title="Add Images"
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="photo-viewer__loading">
            <div className="photo-viewer__spinner" />
            <p>Loading images...</p>
          </div>
        ) : images.length > 0 ? (
          <div className="photo-viewer__thumbnails">
            {images.map((img) => (
              <div
                key={img.id}
                className={`photo-viewer__thumbnail ${
                  selectedImage?.id === img.id
                    ? 'photo-viewer__thumbnail--active'
                    : ''
                }`}
                onClick={() => handleSelectImage(img)}
                onContextMenu={(e) => handleContextMenu(e, img)}
                title={img.name}
              >
                {img.url ? (
                  <img src={img.url} alt={img.name} loading="lazy" />
                ) : (
                  <div className="photo-viewer__thumbnail-placeholder">
                    <Icon name="image" size={24} color="var(--color-porcelain-400)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="photo-viewer__empty-hint">
            <Icon name="image" size={32} color="var(--color-porcelain-300)" />
            <p>{isInTauri ? 'No images found' : 'Sample images'}</p>
            {isInTauri && (
              <>
                <button className="photo-viewer__browse-btn" onClick={handleOpenFolder}>
                  Open Folder
                </button>
                <button className="photo-viewer__browse-btn photo-viewer__browse-btn--secondary" onClick={handleOpenFiles}>
                  Add Files
                </button>
              </>
            )}
          </div>
        )}

        {isInTauri && (
          <div className="photo-viewer__sidebar-footer">
            📁 {images.length} images
          </div>
        )}
      </div>

      <div className="photo-viewer__main">
        <div className="photo-viewer__canvas">
          {selectedImage ? (
            <>
              {selectedImage.url ? (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="photo-viewer__image"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                  onContextMenu={(e) => handleContextMenu(e, selectedImage)}
                />
              ) : (
                <div className="photo-viewer__loading-main">
                  <div className="photo-viewer__spinner" />
                  <p>Loading image...</p>
                </div>
              )}

              {/* Navigation arrows */}
              <button
                className="photo-viewer__nav-btn photo-viewer__nav-btn--prev"
                onClick={handlePrevious}
                disabled={
                  images.findIndex((img) => img.id === selectedImage.id) === 0
                }
              >
                <Icon name="chevron-left" size={24} />
              </button>
              <button
                className="photo-viewer__nav-btn photo-viewer__nav-btn--next"
                onClick={handleNext}
                disabled={
                  images.findIndex((img) => img.id === selectedImage.id) ===
                  images.length - 1
                }
              >
                <Icon name="chevron-right" size={24} />
              </button>
            </>
          ) : (
            <div className="photo-viewer__no-image">
              <Icon name="image" size={64} color="var(--color-porcelain-300)" />
              <p>No image selected</p>
            </div>
          )}
        </div>

        <div className="photo-viewer__toolbar">
          <div className="photo-viewer__filename">
            {selectedImage?.name || 'No image selected'}
          </div>
          <div className="photo-viewer__controls">
            <button
              className="photo-viewer__btn"
              onClick={handleZoomOut}
              title="Zoom Out"
              disabled={!selectedImage}
            >
              <Icon name="minus" size={16} />
            </button>
            <span className="photo-viewer__zoom-level">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="photo-viewer__btn"
              onClick={handleZoomIn}
              title="Zoom In"
              disabled={!selectedImage}
            >
              <Icon name="plus" size={16} />
            </button>
            <div className="photo-viewer__separator" />
            <button
              className="photo-viewer__btn"
              onClick={handleRotate}
              title="Rotate"
              disabled={!selectedImage}
            >
              <Icon name="refresh" size={16} />
            </button>
            <button
              className="photo-viewer__btn"
              onClick={handleReset}
              title="Reset"
              disabled={!selectedImage}
            >
              <Icon name="maximize" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="photo-viewer__context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="photo-viewer__context-menu-item"
            onClick={() => handleCopy(contextMenu.image)}
            disabled={!contextMenu.image.path}
          >
            <Icon name="copy" size={14} />
            Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoViewer;
