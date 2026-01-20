import React, { useState } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './VideoPlayer.css';

export const VideoPlayer: React.FC<AppProps> = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`video-player ${isFullscreen ? 'video-player--fullscreen' : ''}`}>
      <div className="video-player__screen">
        <div className="video-player__placeholder">
          <Icon name="video" size={64} color="var(--color-porcelain-400)" />
          <p>No video loaded</p>
          <button className="video-player__load-btn">
            <Icon name="upload" size={16} />
            Open Video
          </button>
        </div>
      </div>

      <div className="video-player__controls">
        <div className="video-player__progress-bar">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            className="video-player__progress"
          />
        </div>

        <div className="video-player__toolbar">
          <div className="video-player__left-controls">
            <button
              className="video-player__btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
            </button>
            <button className="video-player__btn">
              <Icon name="skip-back" size={16} />
            </button>
            <button className="video-player__btn">
              <Icon name="skip-forward" size={16} />
            </button>
            <div className="video-player__volume-group">
              <button className="video-player__btn">
                <Icon name="volume" size={16} />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="video-player__volume"
              />
            </div>
            <span className="video-player__time">
              {formatTime(progress)} / {formatTime(100)}
            </span>
          </div>

          <div className="video-player__right-controls">
            <button className="video-player__btn">
              <Icon name="gear" size={16} />
            </button>
            <button
              className="video-player__btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Icon name="maximize" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
