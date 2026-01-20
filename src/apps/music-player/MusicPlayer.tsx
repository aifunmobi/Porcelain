import { useState, useMemo } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
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
}

const sampleTracks: Track[] = [
  { id: '1', title: 'Porcelain Dreams', artist: 'Ambient Collective', duration: 245 },
  { id: '2', title: 'Soft Shadows', artist: 'Mellow Beats', duration: 198 },
  { id: '3', title: 'Ceramic Sky', artist: 'Lo-Fi Lounge', duration: 312 },
  { id: '4', title: 'Gentle Waves', artist: 'Relaxation Station', duration: 267 },
  { id: '5', title: 'Morning Light', artist: 'Calm Ensemble', duration: 184 },
];

export const MusicPlayer: React.FC<AppProps> = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>(sampleTracks[0]);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    const currentIndex = sampleTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sampleTracks.length - 1;
    setCurrentTrack(sampleTracks[prevIndex]);
    setProgress(0);
  };

  const handleNext = () => {
    const currentIndex = sampleTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % sampleTracks.length;
    setCurrentTrack(sampleTracks[nextIndex]);
    setProgress(0);
  };

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
  };

  const progressPercent = (progress / currentTrack.duration) * 100;
  const barHeights = useMemo(() => generateBarHeights(40), []);

  return (
    <div className="music-player">
      <div className="music-player__now-playing">
        <div className="music-player__album-art">
          <Icon name="music" size={64} color="var(--color-porcelain-400)" />
        </div>
        <div className="music-player__track-info">
          <div className="music-player__title">{currentTrack.title}</div>
          <div className="music-player__artist">{currentTrack.artist}</div>
        </div>
      </div>

      <div className="music-player__progress">
        <div className="music-player__waveform">
          {barHeights.map((height, i) => (
            <div
              key={i}
              className={`music-player__bar ${i < (progressPercent / 100) * 40 ? 'music-player__bar--active' : ''}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="music-player__time">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={currentTrack.duration}
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            className="music-player__slider"
          />
          <span>{formatTime(currentTrack.duration)}</span>
        </div>
      </div>

      <div className="music-player__controls">
        <button
          className={`music-player__control-btn ${shuffle ? 'music-player__control-btn--active' : ''}`}
          onClick={() => setShuffle(!shuffle)}
        >
          <Icon name="refresh" size={16} />
        </button>
        <button className="music-player__control-btn" onClick={handlePrevious}>
          <Icon name="skip-back" size={20} />
        </button>
        <button className="music-player__play-btn" onClick={handlePlay}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={24} />
        </button>
        <button className="music-player__control-btn" onClick={handleNext}>
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
        <div className="music-player__playlist-header">Playlist</div>
        {sampleTracks.map((track) => (
          <div
            key={track.id}
            className={`music-player__track ${currentTrack.id === track.id ? 'music-player__track--active' : ''}`}
            onClick={() => handleTrackSelect(track)}
          >
            <div className="music-player__track-icon">
              {currentTrack.id === track.id && isPlaying ? (
                <div className="music-player__playing-indicator">
                  <span /><span /><span />
                </div>
              ) : (
                <Icon name="music" size={14} />
              )}
            </div>
            <div className="music-player__track-details">
              <div className="music-player__track-name">{track.title}</div>
              <div className="music-player__track-artist">{track.artist}</div>
            </div>
            <div className="music-player__track-duration">{formatTime(track.duration)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer;
