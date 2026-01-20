import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  isVideoFile,
  openFileDialog,
} from '../../services/tauriFs';
import { convertFileSrc } from '@tauri-apps/api/core';
import './VideoPlayer.css';

interface VideoFile {
  id: string;
  name: string;
  path: string;
  url?: string;
}

export const VideoPlayer: React.FC<AppProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInTauri, setIsInTauri] = useState(false);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const tauriEnv = isTauri();
      setIsInTauri(tauriEnv);

      if (tauriEnv) {
        await loadVideosFromFolder();
      }
    };
    init();
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Load videos from Videos folder
  const loadVideosFromFolder = async () => {
    setIsLoading(true);
    try {
      const dirs = await getSpecialDirs();
      if (dirs.videos) {
        const entries = await readDirectory(dirs.videos);
        const videoFiles = entries.filter(
          (entry) => entry.isFile && isVideoFile(entry.name)
        );

        const loadedVideos: VideoFile[] = videoFiles.slice(0, 50).map((file) => ({
          id: file.path,
          name: file.name.replace(/\.[^/.]+$/, ''),
          path: file.path,
          url: convertFileSrc(file.path),
        }));

        setVideos(loadedVideos);
        if (loadedVideos.length > 0) {
          setCurrentVideo(loadedVideos[0]);
        }
      }
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open file dialog
  const handleOpenFile = async () => {
    if (!isInTauri) return;

    try {
      const selected = await openFileDialog({
        title: 'Open Video',
        filters: [
          {
            name: 'Video',
            extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
          },
        ],
        multiple: false,
      });

      if (selected && typeof selected === 'string') {
        const name = selected.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Video';
        const newVideo: VideoFile = {
          id: selected,
          name,
          path: selected,
          url: convertFileSrc(selected),
        };
        setVideos((prev) => [newVideo, ...prev]);
        setCurrentVideo(newVideo);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error opening file:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSelectVideo = (video: VideoFile) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    setProgress(0);
  };

  const handleSkipBack = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  return (
    <div className={`video-player ${isFullscreen ? 'video-player--fullscreen' : ''}`}>
      <div className="video-player__screen">
        {currentVideo && currentVideo.url ? (
          <video
            ref={videoRef}
            src={currentVideo.url}
            className="video-player__video"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            autoPlay={isPlaying}
          />
        ) : (
          <div className="video-player__placeholder">
            <Icon name="video" size={64} color="var(--color-porcelain-400)" />
            <p>{isLoading ? 'Loading videos...' : 'No video loaded'}</p>
            {isInTauri && !isLoading && (
              <button className="video-player__load-btn" onClick={handleOpenFile}>
                <Icon name="upload" size={16} />
                Open Video
              </button>
            )}
          </div>
        )}
      </div>

      <div className="video-player__controls">
        <div className="video-player__progress-bar">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="video-player__progress"
            disabled={!currentVideo}
          />
        </div>

        <div className="video-player__toolbar">
          <div className="video-player__left-controls">
            <button
              className="video-player__btn"
              onClick={handlePlayPause}
              disabled={!currentVideo}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
            </button>
            <button
              className="video-player__btn"
              onClick={handleSkipBack}
              disabled={!currentVideo}
            >
              <Icon name="skip-back" size={16} />
            </button>
            <button
              className="video-player__btn"
              onClick={handleSkipForward}
              disabled={!currentVideo}
            >
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
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>

          <div className="video-player__right-controls">
            {isInTauri && (
              <button className="video-player__btn" onClick={handleOpenFile}>
                <Icon name="folder" size={16} />
              </button>
            )}
            <button
              className="video-player__btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Icon name="maximize" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Video list sidebar */}
      {isInTauri && videos.length > 0 && (
        <div className="video-player__sidebar">
          <div className="video-player__sidebar-header">
            <span>Library</span>
            <button className="video-player__add-btn" onClick={handleOpenFile}>
              <Icon name="plus" size={14} />
            </button>
          </div>
          <div className="video-player__video-list">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`video-player__video-item ${
                  currentVideo?.id === video.id ? 'video-player__video-item--active' : ''
                }`}
                onClick={() => handleSelectVideo(video)}
              >
                <Icon name="video" size={16} />
                <span className="video-player__video-name">{video.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isInTauri && (
        <div className="video-player__footer">📁 Real File System</div>
      )}
    </div>
  );
};

export default VideoPlayer;
