import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  isImageFile,
  readFileAsDataUrl,
  openFileDialog,
} from '../../services/tauriFs';
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

export const PhotoViewer: React.FC<AppProps> = () => {
  const [isInTauri, setIsInTauri] = useState(false);
  const [images, setImages] = useState<ImageFile[]>(sampleImages);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(sampleImages[0]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingImage, setLoadingImage] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const tauriEnv = isTauri();
      setIsInTauri(tauriEnv);

      if (tauriEnv) {
        // Load images from Pictures folder
        await loadImagesFromPictures();
      }
    };
    init();
  }, []);

  // Load images from Pictures folder
  const loadImagesFromPictures = async () => {
    setIsLoading(true);
    try {
      const dirs = await getSpecialDirs();
      if (dirs.pictures) {
        const entries = await readDirectory(dirs.pictures);
        const imageFiles = entries.filter(
          (entry) => entry.isFile && isImageFile(entry.name)
        );

        const loadedImages: ImageFile[] = [];
        for (const file of imageFiles.slice(0, 50)) {
          // Limit to 50 images
          loadedImages.push({
            id: file.path,
            name: file.name,
            url: '', // Will load on demand
            path: file.path,
          });
        }

        if (loadedImages.length > 0) {
          setImages(loadedImages);
          // Load the first image
          const firstImage = loadedImages[0];
          const url = await loadImageUrl(firstImage.path);
          setImages((prev) =>
            prev.map((img) =>
              img.id === firstImage.id ? { ...img, url } : img
            )
          );
          setSelectedImage({ ...firstImage, url });
        } else {
          setImages([]);
          setSelectedImage(null);
        }
      }
    } catch (err) {
      console.error('Error loading images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load image URL
  const loadImageUrl = async (path: string): Promise<string> => {
    try {
      return await readFileAsDataUrl(path);
    } catch (err) {
      console.error('Error loading image:', err);
      return '';
    }
  };

  // Select image
  const handleSelectImage = async (img: ImageFile) => {
    setZoom(1);
    setRotation(0);

    if (isInTauri && !img.url && img.path) {
      setLoadingImage(img.id);
      const url = await loadImageUrl(img.path);
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, url } : i))
      );
      setSelectedImage({ ...img, url });
      setLoadingImage(null);
    } else {
      setSelectedImage(img);
    }
  };

  // Open file dialog
  const handleOpenFile = async () => {
    if (!isInTauri) return;

    try {
      const selected = await openFileDialog({
        title: 'Open Image',
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
        const newImages: ImageFile[] = [];

        for (const path of paths) {
          const name = path.split('/').pop() || 'image';
          newImages.push({
            id: path,
            name,
            url: '',
            path,
          });
        }

        if (newImages.length > 0) {
          // Load first new image
          const firstImage = newImages[0];
          const url = await loadImageUrl(firstImage.path);
          newImages[0] = { ...firstImage, url };

          setImages((prev) => [...prev, ...newImages]);
          setSelectedImage(newImages[0]);
        }
      }
    } catch (err) {
      console.error('Error opening file:', err);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Navigate to next/previous image
  const handlePrevious = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex > 0) {
      handleSelectImage(images[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage.id);
    if (currentIndex < images.length - 1) {
      handleSelectImage(images[currentIndex + 1]);
    }
  };

  return (
    <div className="photo-viewer">
      <div className="photo-viewer__sidebar">
        <div className="photo-viewer__sidebar-header">
          <span>Library</span>
          {isInTauri && (
            <button
              className="photo-viewer__open-btn"
              onClick={handleOpenFile}
              title="Open Image"
            >
              <Icon name="plus" size={14} />
            </button>
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
                } ${loadingImage === img.id ? 'photo-viewer__thumbnail--loading' : ''}`}
                onClick={() => handleSelectImage(img)}
                title={img.name}
              >
                {img.url ? (
                  <img src={img.url} alt={img.name} />
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
            <p>{isInTauri ? 'No images in Pictures folder' : 'Drop images here to add'}</p>
            {isInTauri && (
              <button className="photo-viewer__browse-btn" onClick={handleOpenFile}>
                Browse Files
              </button>
            )}
          </div>
        )}

        {isInTauri && (
          <div className="photo-viewer__sidebar-footer">
            📁 Real File System
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
    </div>
  );
};

export default PhotoViewer;
