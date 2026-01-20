import React, { useState, useRef, useCallback } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Browser.css';

const DEFAULT_URL = 'https://www.wikipedia.org';
const SEARCH_ENGINE = 'https://www.google.com/search?igu=1&q=';

export const Browser: React.FC<AppProps> = () => {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [history, setHistory] = useState<string[]>([DEFAULT_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const formatUrl = (input: string): string => {
    const trimmed = input.trim();

    // If it looks like a URL (has a dot and no spaces)
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      // Add https:// if no protocol
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }

    // Otherwise, treat as search
    return `${SEARCH_ENGINE}${encodeURIComponent(trimmed)}`;
  };

  const navigate = useCallback((newUrl: string) => {
    const formattedUrl = formatUrl(newUrl);
    setUrl(formattedUrl);
    setInputValue(formattedUrl);
    setIsLoading(true);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCanGoBack(newHistory.length > 1);
    setCanGoForward(false);
  }, [history, historyIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputValue);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputValue(history[newIndex]);
      setIsLoading(true);
      setCanGoBack(newIndex > 0);
      setCanGoForward(true);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputValue(history[newIndex]);
      setIsLoading(true);
      setCanGoBack(true);
      setCanGoForward(newIndex < history.length - 1);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleHome = () => {
    navigate(DEFAULT_URL);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const bookmarks = [
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'DuckDuckGo', url: 'https://www.duckduckgo.com' },
    { name: 'GitHub', url: 'https://www.github.com' },
  ];

  return (
    <div className="browser">
      {/* Toolbar */}
      <div className="browser__toolbar">
        <div className="browser__nav-buttons">
          <button
            className="browser__nav-button"
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <button
            className="browser__nav-button"
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <button
            className="browser__nav-button"
            onClick={handleRefresh}
            title="Refresh"
          >
            <Icon name={isLoading ? 'x' : 'refresh'} size={16} />
          </button>
          <button
            className="browser__nav-button"
            onClick={handleHome}
            title="Home"
          >
            <Icon name="home" size={16} />
          </button>
        </div>

        <form className="browser__url-form" onSubmit={handleSubmit}>
          <div className="browser__url-bar">
            <Icon name="globe" size={14} color="var(--color-text-tertiary)" />
            <input
              type="text"
              className="browser__url-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search or enter URL"
              spellCheck={false}
            />
          </div>
        </form>
      </div>

      {/* Bookmarks Bar */}
      <div className="browser__bookmarks">
        {bookmarks.map((bookmark) => (
          <button
            key={bookmark.url}
            className="browser__bookmark"
            onClick={() => navigate(bookmark.url)}
          >
            {bookmark.name}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="browser__content">
        {isLoading && (
          <div className="browser__loading">
            <div className="browser__loading-spinner" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="browser__iframe"
          title="Browser"
          onLoad={handleLoad}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>

      {/* Status Bar */}
      <div className="browser__status-bar">
        <span className="browser__status-text">
          {isLoading ? 'Loading...' : 'Ready'}
        </span>
      </div>
    </div>
  );
};

export default Browser;
