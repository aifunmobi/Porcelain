import { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import {
  isTauri,
  getSpecialDirs,
  readDirectory,
  isAudioFile,
  openFileDialog,
} from '../../services/tauriFs';
import { convertFileSrc } from '@tauri-apps/api/core';
import './MusicPlayer.css';

// Generate stable random heights for waveform bars
const generateBarHeights = (count: number) => {
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    // Use a seeded pseudo-random based on index
    heights.push(20 + (Math.sin(i * 0.7) * 0.5 + 0.5) * 60);
  }
  return heights;
};

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  path: string;
  url?: string;
}

const sampleTracks: Track[] = [
  { id: '1', title: 'Porcelain Dreams', artist: 'Ambient Collective', duration: 245, path: '' },
  { id: '2', title: 'Soft Shadows', artist: 'Mellow Beats', duration: 198, path: '' },
  { id: '3', title: 'Ceramic Sky', artist: 'Lo-Fi Lounge', duration: 312, path: '' },
  { id: '4', title: 'Gentle Waves', artist: 'Relaxation Station', duration: 267, path: '' },
  { id: '5', title: 'Morning Light', artist: 'Calm Ensemble', duration: 184, path: '' },
];

export const MusicPlayer: React.FC<AppProps> = () => {
  const [isInTauri, setIsInTauri] = useState(false);
  const [tracks, setTracks] = useState<Track[]>(sampleTracks);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(sampleTracks[0]);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize - check if in Tauri
  useEffect(() => {
    const tauriEnv = isTauri();
    setIsInTauri(tauriEnv);
  }, []);

  // Load music when in Tauri mode (after the state is set and audio element exists)
  useEffect(() => {
    if (isInTauri) {
      loadMusicFromFolder();
    }
  }, [isInTauri]);

  // Handle audio element updates
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Load music from Music folder
  const loadMusicFromFolder = async () => {
    setIsLoading(true);
    try {
      const dirs = await getSpecialDirs();
      if (dirs.music) {
        const entries = await readDirectory(dirs.music);
        // Filter for audio files - check both isFile and !isDirectory for safety
        const audioFiles = entries.filter(
          (entry) => !entry.isDirectory && isAudioFile(entry.name)
        );

        const loadedTracks: Track[] = audioFiles.slice(0, 100).map((file) => {
          // Extract title from filename
          const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          return {
            id: file.path,
            title: name,
            artist: 'Unknown Artist',
            duration: 0, // Will be updated when playing
            path: file.path,
            url: convertFileSrc(file.path),
          };
        });

        if (loadedTracks.length > 0) {
          setTracks(loadedTracks);
          setCurrentTrack(loadedTracks[0]);
          // Pre-load the first track's audio source (use setTimeout to ensure ref is ready)
          setTimeout(() => {
            if (audioRef.current && loadedTracks[0].url) {
              audioRef.current.src = loadedTracks[0].url;
              audioRef.current.load();
            }
          }, 100);
        } else {
          setTracks([]);
          setCurrentTrack(null);
        }
      }
    } catch (err) {
      console.error('Error loading music:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open file dialog
  const handleOpenFiles = async () => {
    if (!isInTauri) return;

    try {
      const selected = await openFileDialog({
        title: 'Open Music Files',
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
          },
        ],
        multiple: true,
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const newTracks: Track[] = paths.map((path) => {
          const name = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Unknown';
          return {
            id: path,
            title: name,
            artist: 'Unknown Artist',
            duration: 0,
            path,
            url: convertFileSrc(path),
          };
        });

        if (newTracks.length > 0) {
          setTracks((prev) => [...prev, ...newTracks]);
          if (!currentTrack) {
            setCurrentTrack(newTracks[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error opening files:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (!currentTrack) return;

    if (isInTauri && currentTrack.url && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
    handleTrackSelect(tracks[prevIndex]);
  };

  const handleNext = () => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    handleTrackSelect(tracks[nextIndex]);
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);

    if (isInTauri && track.url && audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && currentTrack) {
      // Update track duration
      setTracks((prev) =>
        prev.map((t) =>
          t.id === currentTrack.id
            ? { ...t, duration: audioRef.current!.duration }
            : t
        )
      );
      setCurrentTrack((prev) =>
        prev ? { ...prev, duration: audioRef.current!.duration } : prev
      );
    }
  };

  const handleEnded = () => {
    if (repeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      handleNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const progressPercent = currentTrack?.duration
    ? (progress / currentTrack.duration) * 100
    : 0;
  const barHeights = useMemo(() => generateBarHeights(40), []);

  return (
    <div className="music-player">
      {/* Hidden audio element for Tauri mode */}
      {isInTauri && (
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      <div className="music-player__now-playing">
        <div className="music-player__album-art">
          <Icon name="music" size={64} color="var(--color-porcelain-400)" />
        </div>
        <div className="music-player__track-info">
          <div className="music-player__title">
            {currentTrack?.title || 'No track selected'}
          </div>
          <div className="music-player__artist">
            {currentTrack?.artist || 'Unknown Artist'}
          </div>
        </div>
      </div>

      <div className="music-player__progress">
        <div className="music-player__waveform">
          {barHeights.map((height, i) => (
            <div
              key={i}
              className={`music-player__bar ${
                i < (progressPercent / 100) * 40 ? 'music-player__bar--active' : ''
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="music-player__time">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={currentTrack?.duration || 100}
            value={progress}
            onChange={handleSeek}
            className="music-player__slider"
            disabled={!currentTrack}
          />
          <span>{formatTime(currentTrack?.duration || 0)}</span>
        </div>
      </div>

      <div className="music-player__controls">
        <button
          className={`music-player__control-btn ${shuffle ? 'music-player__control-btn--active' : ''}`}
          onClick={() => setShuffle(!shuffle)}
        >
          <Icon name="refresh" size={16} />
        </button>
        <button
          className="music-player__control-btn"
          onClick={handlePrevious}
          disabled={!currentTrack}
        >
          <Icon name="skip-back" size={20} />
        </button>
        <button
          className="music-player__play-btn"
          onClick={handlePlay}
          disabled={!currentTrack}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} />
        </button>
        <button
          className="music-player__control-btn"
          onClick={handleNext}
          disabled={!currentTrack}
        >
          <Icon name="skip-forward" size={20} />
        </button>
        <button
          className={`music-player__control-btn ${repeat ? 'music-player__control-btn--active' : ''}`}
          onClick={() => setRepeat(!repeat)}
        >
          <Icon name="refresh" size={16} />
        </button>
      </div>

      <div className="music-player__volume">
        <Icon name="volume" size={16} color="var(--color-text-tertiary)" />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          className="music-player__volume-slider"
        />
      </div>

      <div className="music-player__playlist">
        <div className="music-player__playlist-header">
          <span>Playlist</span>
          {isInTauri && (
            <button
              className="music-player__add-btn"
              onClick={handleOpenFiles}
              title="Add music files"
            >
              <Icon name="plus" size={14} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="music-player__loading">
            <div className="music-player__spinner" />
            <p>Loading music...</p>
          </div>
        ) : tracks.length > 0 ? (
          tracks.map((track) => (
            <div
              key={track.id}
              className={`music-player__track ${
                currentTrack?.id === track.id ? 'music-player__track--active' : ''
              }`}
              onClick={() => handleTrackSelect(track)}
            >
              <div className="music-player__track-icon">
                {currentTrack?.id === track.id && isPlaying ? (
                  <div className="music-player__playing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <Icon name="music" size={14} />
                )}
              </div>
              <div className="music-player__track-details">
                <div className="music-player__track-name">{track.title}</div>
                <div className="music-player__track-artist">{track.artist}</div>
              </div>
              <div className="music-player__track-duration">
                {track.duration > 0 ? formatTime(track.duration) : '--:--'}
              </div>
            </div>
          ))
        ) : (
          <div className="music-player__empty">
            <Icon name="music" size={32} color="var(--color-porcelain-300)" />
            <p>{isInTauri ? 'No music in Music folder' : 'No tracks available'}</p>
            {isInTauri && (
              <button className="music-player__browse-btn" onClick={handleOpenFiles}>
                Browse Files
              </button>
            )}
          </div>
        )}
      </div>

      {isInTauri && (
        <div className="music-player__footer">📁 Real File System</div>
      )}
    </div>
  );
};

export default MusicPlayer;
