import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Settings.css';

type SettingsPanel = 'wallpaper' | 'sound' | 'display' | 'dock' | 'datetime' | 'about';

const wallpapers = [
  { id: 'gradient-1', type: 'gradient' as const, value: 'linear-gradient(135deg, #f5f3ef 0%, #ebe8e2 50%, #ddd9d0 100%)', name: 'Porcelain' },
  { id: 'gradient-2', type: 'gradient' as const, value: 'linear-gradient(135deg, #e8e4df 0%, #d4cfc8 50%, #c0bab2 100%)', name: 'Stone' },
  { id: 'gradient-3', type: 'gradient' as const, value: 'linear-gradient(135deg, #f0ebe5 0%, #e2dcd4 50%, #d4cec6 100%)', name: 'Cream' },
  { id: 'gradient-4', type: 'gradient' as const, value: 'linear-gradient(180deg, #a8b5c4 0%, #8291a3 100%)', name: 'Sky' },
  { id: 'gradient-5', type: 'gradient' as const, value: 'linear-gradient(135deg, #d4c4a8 0%, #c4b498 100%)', name: 'Sand' },
  { id: 'gradient-6', type: 'gradient' as const, value: 'linear-gradient(135deg, #9cb89c 0%, #8ca88c 100%)', name: 'Sage' },
  { id: 'color-1', type: 'color' as const, value: '#f5f3ef', name: 'White' },
  { id: 'color-2', type: 'color' as const, value: '#ebe8e2', name: 'Ivory' },
  { id: 'color-3', type: 'color' as const, value: '#ddd9d0', name: 'Linen' },
];

const accentColors = [
  { id: 'blue', value: '#a8b5c4', name: 'Blue Gray' },
  { id: 'green', value: '#9cb89c', name: 'Sage' },
  { id: 'orange', value: '#d4c4a8', name: 'Sand' },
  { id: 'red', value: '#c9a8a8', name: 'Rose' },
  { id: 'purple', value: '#b4a8c9', name: 'Lavender' },
];

export const Settings: React.FC<AppProps> = () => {
  const [activePanel, setActivePanel] = useState<SettingsPanel>('wallpaper');
  const {
    wallpaper,
    volume,
    brightness,
    accentColor,
    showSeconds,
    use24Hour,
    setWallpaper,
    setVolume,
    setBrightness,
    setAccentColor,
    setShowSeconds,
    setUse24Hour,
    resetSettings,
  } = useSettingsStore();

  const panels = [
    { id: 'wallpaper' as const, name: 'Wallpaper', icon: 'image' },
    { id: 'sound' as const, name: 'Sound', icon: 'volume' },
    { id: 'display' as const, name: 'Display', icon: 'computer' },
    { id: 'dock' as const, name: 'Dock', icon: 'home' },
    { id: 'datetime' as const, name: 'Date & Time', icon: 'clock' },
    { id: 'about' as const, name: 'About', icon: 'info' },
  ];

  return (
    <div className="settings">
      <div className="settings__sidebar">
        {panels.map((panel) => (
          <div
            key={panel.id}
            className={`settings__nav-item ${activePanel === panel.id ? 'settings__nav-item--active' : ''}`}
            onClick={() => setActivePanel(panel.id)}
          >
            <Icon name={panel.icon} size={18} />
            <span>{panel.name}</span>
          </div>
        ))}
      </div>

      <div className="settings__content">
        {activePanel === 'wallpaper' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Wallpaper</h2>
            <div className="settings__wallpaper-grid">
              {wallpapers.map((wp) => (
                <div
                  key={wp.id}
                  className={`settings__wallpaper-item ${wallpaper === wp.value ? 'settings__wallpaper-item--active' : ''}`}
                  style={{ background: wp.value }}
                  onClick={() => setWallpaper(wp.value, wp.type)}
                >
                  <span className="settings__wallpaper-name">{wp.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePanel === 'sound' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Sound</h2>
            <div className="settings__section">
              <div className="settings__row">
                <label className="settings__label">
                  <Icon name="volume" size={18} />
                  Volume
                </label>
                <div className="settings__slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="settings__slider"
                  />
                  <span className="settings__slider-value">{volume}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'display' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Display</h2>
            <div className="settings__section">
              <div className="settings__row">
                <label className="settings__label">Brightness</label>
                <div className="settings__slider-container">
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                    className="settings__slider"
                  />
                  <span className="settings__slider-value">{brightness}%</span>
                </div>
              </div>
            </div>
            <div className="settings__section">
              <h3 className="settings__section-title">Accent Color</h3>
              <div className="settings__accent-colors">
                {accentColors.map((color) => (
                  <button
                    key={color.id}
                    className={`settings__accent-color ${accentColor === color.value ? 'settings__accent-color--active' : ''}`}
                    style={{ background: color.value }}
                    onClick={() => setAccentColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activePanel === 'dock' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Dock</h2>
            <div className="settings__section">
              <p className="settings__info">
                The dock appears at the bottom of the screen. Click on app icons to launch or switch to applications.
              </p>
            </div>
          </div>
        )}

        {activePanel === 'datetime' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">Date & Time</h2>
            <div className="settings__section">
              <div className="settings__row">
                <label className="settings__label">Show seconds</label>
                <button
                  className={`settings__toggle ${showSeconds ? 'settings__toggle--on' : ''}`}
                  onClick={() => setShowSeconds(!showSeconds)}
                >
                  <span className="settings__toggle-handle" />
                </button>
              </div>
              <div className="settings__row">
                <label className="settings__label">Use 24-hour format</label>
                <button
                  className={`settings__toggle ${use24Hour ? 'settings__toggle--on' : ''}`}
                  onClick={() => setUse24Hour(!use24Hour)}
                >
                  <span className="settings__toggle-handle" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activePanel === 'about' && (
          <div className="settings__panel">
            <h2 className="settings__panel-title">About</h2>
            <div className="settings__section">
              <div className="settings__about-logo">🏺</div>
              <h3 className="settings__about-name">Porcelain OS</h3>
              <p className="settings__about-version">Version 1.0.0</p>
              <p className="settings__about-description">
                A beautiful, minimal desktop environment with a soft porcelain aesthetic.
              </p>
            </div>
            <div className="settings__section">
              <h3 className="settings__section-title">Reset</h3>
              <p className="settings__info">
                Reset all settings to their default values. This will restore the default wallpaper, dock apps, and all preferences.
              </p>
              <button
                className="settings__reset-button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
                    resetSettings();
                  }
                }}
              >
                Reset All Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
