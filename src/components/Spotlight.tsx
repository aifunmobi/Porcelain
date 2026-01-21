import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icons';
import { appRegistry } from '../apps/registry';
import { useWindowStore } from '../stores/windowStore';
import { useSettingsStore } from '../stores/settingsStore';
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

export const Spotlight: React.FC<SpotlightProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openWindow } = useWindowStore();
  const { desktopIcons } = useSettingsStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search apps
    Object.values(appRegistry).forEach((app: AppDefinition) => {
      if (app.name.toLowerCase().includes(q) || app.id.toLowerCase().includes(q)) {
        searchResults.push({
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

    // Search desktop icons (files/folders)
    desktopIcons.forEach((icon: DesktopIcon) => {
      if (icon.name.toLowerCase().includes(q)) {
        // Skip app shortcuts - they're already in the apps search
        if (icon.appId) return;

        searchResults.push({
          id: `icon-${icon.id}`,
          type: 'file',
          name: icon.name,
          icon: icon.icon,
          description: icon.isFile ? 'File' : 'Folder',
          action: () => {
            // For now, just open file manager
            const fileManager = appRegistry['file-manager'];
            if (fileManager) {
              openWindow(fileManager);
            }
            onClose();
          },
        });
      }
    });

    // Add some quick actions / settings
    const settingsKeywords = [
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
    ];

    settingsKeywords.forEach(({ keywords, name, icon, appId }) => {
      if (keywords.some(k => k.includes(q)) && !searchResults.some(r => r.name === name)) {
        const app = appRegistry[appId];
        if (app) {
          searchResults.push({
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

    setResults(searchResults.slice(0, 8)); // Limit to 8 results
    setSelectedIndex(0);
  }, [openWindow, onClose, desktopIcons]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  }, [performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Close on click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

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
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  className="spotlight__clear"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
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
                    className={`spotlight__result ${index === selectedIndex ? 'spotlight__result--selected' : ''}`}
                    onClick={result.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="spotlight__result-icon">
                      <Icon name={result.icon} size={24} />
                    </div>
                    <div className="spotlight__result-info">
                      <div className="spotlight__result-name">{result.name}</div>
                      {result.description && (
                        <div className="spotlight__result-description">{result.description}</div>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <div className="spotlight__result-hint">
                        <Icon name="arrow-right" size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {query && results.length === 0 && (
              <div className="spotlight__empty">
                <Icon name="search" size={32} color="var(--color-porcelain-300)" />
                <p>No results found</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Spotlight;
