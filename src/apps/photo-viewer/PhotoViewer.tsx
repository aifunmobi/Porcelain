import React, { useState } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './PhotoViewer.css';

const sampleImages = [
  { id: '1', name: 'sunset.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ff7e5f"/><stop offset="100%" style="stop-color:#feb47b"/></linearGradient></defs><rect fill="url(#sky)" width="400" height="300"/><circle cx="200" cy="200" r="40" fill="#ffd700"/></svg>') },
  { id: '2', name: 'mountains.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#87ceeb" width="400" height="300"/><polygon points="0,300 150,100 300,300" fill="#6b8e23"/><polygon points="100,300 250,150 400,300" fill="#556b2f"/></svg>') },
  { id: '3', name: 'ocean.jpg', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#1e90ff" width="400" height="200"/><rect y="200" fill="#faf0e6" width="400" height="100"/></svg>') },
];

export const PhotoViewer: React.FC<AppProps> = () => {
  const [selectedImage, setSelectedImage] = useState(sampleImages[0]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="photo-viewer">
      <div className="photo-viewer__sidebar">
        <div className="photo-viewer__sidebar-header">Library</div>
        <div className="photo-viewer__thumbnails">
          {sampleImages.map((img) => (
            <div
              key={img.id}
              className={`photo-viewer__thumbnail ${selectedImage.id === img.id ? 'photo-viewer__thumbnail--active' : ''}`}
              onClick={() => {
                setSelectedImage(img);
                handleReset();
              }}
            >
              <img src={img.url} alt={img.name} />
            </div>
          ))}
        </div>
        <div className="photo-viewer__empty-hint">
          <Icon name="image" size={32} color="var(--color-porcelain-300)" />
          <p>Drop images here to add</p>
        </div>
      </div>

      <div className="photo-viewer__main">
        <div className="photo-viewer__canvas">
          <img
            src={selectedImage.url}
            alt={selectedImage.name}
            className="photo-viewer__image"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>

        <div className="photo-viewer__toolbar">
          <div className="photo-viewer__filename">{selectedImage.name}</div>
          <div className="photo-viewer__controls">
            <button className="photo-viewer__btn" onClick={handleZoomOut} title="Zoom Out">
              <Icon name="minus" size={16} />
            </button>
            <span className="photo-viewer__zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="photo-viewer__btn" onClick={handleZoomIn} title="Zoom In">
              <Icon name="plus" size={16} />
            </button>
            <div className="photo-viewer__separator" />
            <button className="photo-viewer__btn" onClick={handleRotate} title="Rotate">
              <Icon name="refresh" size={16} />
            </button>
            <button className="photo-viewer__btn" onClick={handleReset} title="Reset">
              <Icon name="maximize" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoViewer;
