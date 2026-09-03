import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icons';
import { appRegistry } from '../apps/registry';
import { useWindowStore } from '../stores/windowStore';
import { useSettingsStore } from '../stores/settingsStore';
import { isImageFile, isAudioFile, isVideoFile } from '../utils/desktop';
import type { AppDefinition, DesktopIcon } from '../types';
import './Spotlight.css';

interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'setting';
  name: string;
  icon: string;
  description?: string;
  action: () => void;
}

interface SpotlightProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  { keywords: ['settings', 'preferences', 'config'], name: 'Settings', icon: 'gear', appId: 'settings' },
  { keywords: ['terminal', 'console', 'command'], name: 'Terminal', icon: 'terminal', appId: 'terminal' },
  { keywords: ['calculator', 'calc', 'math'], name: 'Calculator', icon: 'calculator', appId: 'calculator' },
  { keywords: ['notes', 'notepad', 'memo'], name: 'Notes', icon: 'notepad', appId: 'notes' },
  { keywords: ['calendar', 'schedule', 'date'], name: 'Calendar', icon: 'calendar', appId: 'calendar' },
  { keywords: ['files', 'finder', 'folder'], name: 'Files', icon: 'folder', appId: 'file-manager' },
  { keywords: ['photos', 'images', 'pictures'], name: 'Photos', icon: 'image', appId: 'photo-viewer' },
  { keywords: ['music', 'audio', 'songs'], name: 'Music', icon: 'music', appId: 'music-player' },
  { keywords: ['browser', 'web', 'internet'], name: 'Browser', icon: 'browser', appId: 'browser' },
  { keywords: ['weather', 'forecast', 'temperature'], name: 'Weather', icon: 'weather', appId: 'weather' },
  { keywords: ['screenshot', 'capture', 'screen'], name: 'Screenshot', icon: 'screenshot', appId: 'screenshot' },
  { keywords: ['preview', 'pdf', 'view'], name: 'Preview', icon: 'preview', appId: 'preview' },
  { keywords: ['zip', 'archive', 'compress'], name: 'Archive Utility', icon: 'archive', appId: 'archive' },
];

/** Which app a desktop file opens in, and with what props. */
const openerFor = (icon: DesktopIcon): { appId: string; props?: Record<string, unknown> } => {
  if (!icon.isFile) return { appId: 'file-manager' };
  if (isImageFile(icon.name)) {
    return {
      appId: icon.filePath ? 'preview' : 'photo-viewer',
      props: icon.filePath
        ? { filePath: icon.filePath }
        : icon.thumbnail
          ? { initialImage: { id: icon.id, name: icon.name, url: icon.thumbnail, path: '' } }
          : undefined,
    };
  }
  if (isAudioFile(icon.name)) return { appId: 'music-player' };
  if (isVideoFile(icon.name)) return { appId: 'video-player' };
  if (icon.filePath) return { appId: 'text-editor', props: { filePath: icon.filePath } };
  return { appId: 'file-manager' };
};

/**
 * The search panel proper. It only exists while Spotlight is open, so every
 * opening starts from a clean query without any effect having to reset state.
 */
const SpotlightPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openWindow = useWindowStore((s) => s.openWindow);
  const desktopIcons = useSettingsStore((s) => s.desktopIcons);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    Object.values(appRegistry).forEach((app: AppDefinition) => {
      if (app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)) {
        out.push({
          id: `app-${app.id}`,
          type: 'app',
          name: app.name,
          icon: app.icon,
          description: 'Application',
          action: () => {
            openWindow(app);
            onClose();
          },
        });
      }
    });

    desktopIcons.forEach((icon) => {
      // App shortcuts are already covered by the registry search.
      if (icon.appId || !icon.name.toLowerCase().includes(q)) return;
      out.push({
        id: `icon-${icon.id}`,
        type: 'file',
        name: icon.name,
        icon: icon.icon,
        description: icon.isFile ? (icon.filePath ?? 'File') : 'Folder',
        action: () => {
          // Open the file itself, not just the Files window.
          const { appId, props } = openerFor(icon);
          const app = appRegistry[appId];
          if (app) openWindow(app, props);
          onClose();
        },
      });
    });

    QUICK_ACTIONS.forEach(({ keywords, name, icon, appId }) => {
      if (keywords.some((k) => k.includes(q)) && !out.some((r) => r.name === name)) {
        const app = appRegistry[appId];
        if (app) {
          out.push({
            id: `quick-${appId}`,
            type: 'app',
            name,
            icon,
            description: 'Quick Action',
            action: () => {
              openWindow(app);
              onClose();
            },
          });
        }
      }
    });

    return out.slice(0, 8);
  }, [query, desktopIcons, openWindow, onClose]);

  // A new result list starts at the top; the index is clamped rather than
  // reset in an effect so the keyboard position never points past the end.
  const activeIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(Math.min(activeIndex + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(Math.max(activeIndex - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          results[activeIndex]?.action();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, activeIndex, onClose]
  );

  return (
    <motion.div
      className="spotlight"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="spotlight__search">
        <Icon name="search" size={20} color="var(--color-text-tertiary)" />
        <input
          ref={inputRef}
          type="text"
          className="spotlight__input"
          placeholder="Search apps, files, and more..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            className="spotlight__clear"
            onClick={() => {
              setQuery('');
              setSelectedIndex(0);
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="spotlight__results">
          {results.map((result, index) => (
            <button
              key={result.id}
              className={`spotlight__result ${index === activeIndex ? 'spotlight__result--selected' : ''}`}
              onClick={result.action}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="spotlight__result-icon">
                <Icon name={result.icon} size={36} mode="tile" />
              </div>
              <div className="spotlight__result-info">
                <div className="spotlight__result-name">{result.name}</div>
                {result.description && (
                  <div className="spotlight__result-description">{result.description}</div>
                )}
              </div>
              {index === activeIndex && (
                <div className="spotlight__result-hint">
                  <Icon name="arrow-right" size={14} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <div className="spotlight__empty">
          <Icon name="search" size={32} color="var(--color-porcelain-300)" />
          <p>No results found</p>
        </div>
      )}
    </motion.div>
  );
};

export const Spotlight: React.FC<SpotlightProps> = ({ isOpen, onClose }) => {
  // Close on click outside
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="spotlight__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleOverlayClick}
        >
          <SpotlightPanel onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Spotlight;
