import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Browser.css';

// Sites that work well in iframes (don't have X-Frame-Options restrictions)
const DEFAULT_URL = 'https://en.wikipedia.org/wiki/Main_Page';
const SEARCH_ENGINE = 'https://lite.duckduckgo.com/lite/?q=';

// Known iframe-friendly sites
const IFRAME_FRIENDLY_SITES = [
  'wikipedia.org',
  'archive.org',
  'w3schools.com',
  'codepen.io',
  'jsfiddle.net',
  'lite.duckduckgo.com',
];

export const Browser: React.FC<AppProps> = () => {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [history, setHistory] = useState<string[]>([DEFAULT_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const isIframeFriendly = (urlToCheck: string): boolean => {
    try {
      const hostname = new URL(urlToCheck).hostname;
      return IFRAME_FRIENDLY_SITES.some(site => hostname.includes(site));
    } catch {
      return false;
    }
  };

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

    // Otherwise, treat as search using DuckDuckGo Lite (iframe-friendly)
    return `${SEARCH_ENGINE}${encodeURIComponent(trimmed)}`;
  };

  const navigate = useCallback((newUrl: string) => {
    const formattedUrl = formatUrl(newUrl);

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
    }

    setUrl(formattedUrl);
    setInputValue(formattedUrl);
    setIsLoading(true);
    setLoadError(null);

    // Check if this site is likely to work
    if (!isIframeFriendly(formattedUrl) && !formattedUrl.includes('duckduckgo')) {
      setLoadError(
        `Many websites block embedding for security. "${new URL(formattedUrl).hostname}" may not load. ` +
        `Try Wikipedia, Archive.org, W3Schools, or use the search for web results.`
      );
    }

    // Set a timeout to detect if the page didn't load
    loadTimeoutRef.current = window.setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        if (!loadError) {
          setLoadError(
            'Page may have been blocked from loading in this browser. ' +
            'Many sites restrict embedding. Try searching instead or visit an iframe-friendly site.'
          );
        }
      }
    }, 10000);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(formattedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCanGoBack(newHistory.length > 1);
    setCanGoForward(false);
  }, [history, historyIndex, isLoading, loadError]);

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
      setLoadError(null);
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
      setLoadError(null);
      setCanGoBack(true);
      setCanGoForward(newIndex < history.length - 1);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setLoadError(null);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleHome = () => {
    navigate(DEFAULT_URL);
  };

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError('Failed to load page. The site may block embedding.');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Bookmarks - only iframe-friendly sites
  const bookmarks = [
    { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
    { name: 'Archive.org', url: 'https://archive.org' },
    { name: 'W3Schools', url: 'https://www.w3schools.com' },
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

        {loadError && (
          <div className="browser__error-banner">
            <Icon name="alert-circle" size={16} />
            <span>{loadError}</span>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className="browser__iframe"
          title="Browser"
          onLoad={handleLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Status Bar */}
      <div className="browser__status-bar">
        <span className="browser__status-text">
          {isLoading ? 'Loading...' : loadError ? 'Page may be restricted' : 'Ready'}
        </span>
      </div>
    </div>
  );
};

export default Browser;
