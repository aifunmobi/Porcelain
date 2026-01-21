import React, { useState, useCallback, useEffect } from 'react';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './TextEditor.css';

// Check if running in Tauri
let invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;

const initTauri = async () => {
  // Check if we're actually running in Tauri (not just if package is installed)
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      const core = await import('@tauri-apps/api/core');
      invoke = core.invoke;
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

interface TextEditorProps extends AppProps {
  filePath?: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({ filePath }) => {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [currentPath, setCurrentPath] = useState<string | null>(filePath || null);
  const [isModified, setIsModified] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Initialize Tauri
  useEffect(() => {
    initTauri().then(setIsTauri);
  }, []);

  // Load file if path provided
  useEffect(() => {
    const loadFile = async () => {
      if (filePath && isTauri && invoke) {
        try {
          const text = await invoke('read_text_file', { path: filePath }) as string;
          setContent(text);
          setOriginalContent(text);
          setCurrentPath(filePath);
          setIsModified(false);
        } catch (err) {
          console.error('Error loading file:', err);
        }
      }
    };
    loadFile();
  }, [filePath, isTauri]);

  // Track modifications
  useEffect(() => {
    setIsModified(content !== originalContent);
  }, [content, originalContent]);

  const handleOpen = useCallback(async () => {
    console.log('[TextEditor] handleOpen called, isTauri:', isTauri);
    if (isTauri) {
      // Tauri mode - use native dialog
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          filters: [
            { name: 'Text Files', extensions: ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'xml', 'yaml', 'yml'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (selected && typeof selected === 'string' && invoke) {
          const text = await invoke('read_text_file', { path: selected }) as string;
          setContent(text);
          setOriginalContent(text);
          setCurrentPath(selected);
          setIsModified(false);
        }
      } catch (err) {
        console.error('Error opening file:', err);
      }
    } else {
      // Browser mode - use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.json,.js,.ts,.css,.html,.xml,.yaml,.yml,text/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          setContent(text);
          setOriginalContent(text);
          setCurrentPath(file.name);
          setIsModified(false);
        }
      };
      input.click();
    }
  }, [isTauri]);

  // Browser download helper
  const downloadFile = useCallback((filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSaveAs = useCallback(async () => {
    console.log('[TextEditor] handleSaveAs called, isTauri:', isTauri);
    if (isTauri) {
      // Tauri mode - use native dialog
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selected = await save({
          filters: [
            { name: 'Text Files', extensions: ['txt', 'md'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (selected && invoke) {
          await invoke('write_text_file', { path: selected, content });
          setCurrentPath(selected);
          setOriginalContent(content);
          setIsModified(false);
        }
      } catch (err) {
        console.error('Error saving file:', err);
      }
    } else {
      // Browser mode - prompt for filename and download
      const filename = prompt('Save as:', currentPath || 'untitled.txt');
      if (filename) {
        downloadFile(filename, content);
        setCurrentPath(filename);
        setOriginalContent(content);
        setIsModified(false);
      }
    }
  }, [isTauri, content, currentPath, downloadFile]);

  const handleSave = useCallback(async () => {
    console.log('[TextEditor] handleSave called, isTauri:', isTauri, 'currentPath:', currentPath);
    if (isTauri && invoke) {
      // Tauri mode
      if (currentPath) {
        try {
          await invoke('write_text_file', { path: currentPath, content });
          setOriginalContent(content);
          setIsModified(false);
        } catch (err) {
          console.error('Error saving file:', err);
        }
      } else {
        handleSaveAs();
      }
    } else {
      // Browser mode - download file
      const filename = currentPath || 'untitled.txt';
      downloadFile(filename, content);
      setOriginalContent(content);
      setIsModified(false);
    }
  }, [isTauri, currentPath, content, downloadFile, handleSaveAs]);

  const handleNew = useCallback(() => {
    console.log('[TextEditor] handleNew called, isModified:', isModified);
    if (isModified && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    setContent('');
    setOriginalContent('');
    setCurrentPath(null);
    setIsModified(false);
  }, [isModified]);

  // Keyboard shortcuts and menu commands
  // Note: Using Alt/Option key to avoid browser shortcut conflicts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt/Option + key combinations (don't conflict with browser)
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNew();
            break;
          case 'o':
            e.preventDefault();
            handleOpen();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
        }
      }
    };

    const handleMenuCommand = (e: CustomEvent<string>) => {
      switch (e.detail) {
        case 'new':
          handleNew();
          break;
        case 'open':
          handleOpen();
          break;
        case 'save':
          handleSave();
          break;
        case 'saveAs':
          handleSaveAs();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('text-editor-command', handleMenuCommand as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('text-editor-command', handleMenuCommand as EventListener);
    };
  }, [handleNew, handleOpen, handleSave, handleSaveAs]);

  const getFileName = () => {
    if (!currentPath) return 'Untitled';
    const parts = currentPath.split('/');
    return parts[parts.length - 1];
  };

  const getLineCount = () => content.split('\n').length;
  const getCharCount = () => content.length;

  const handleFontSizeChange = (delta: number) => {
    setFontSize((prev) => Math.max(10, Math.min(24, prev + delta)));
  };

  return (
    <div className="text-editor">
      <div className="text-editor__toolbar">
        <div className="text-editor__toolbar-left">
          <button
            className="text-editor__btn"
            onClick={handleNew}
            title="New (⌥N)"
          >
            <Icon name="file" size={16} />
          </button>
          <button
            className="text-editor__btn"
            onClick={handleOpen}
            title="Open (⌥O)"
          >
            <Icon name="folder" size={16} />
          </button>
          <button
            className="text-editor__btn"
            onClick={handleSave}
            title="Save (⌥S)"
          >
            <Icon name="save" size={16} />
          </button>
          <div className="text-editor__separator" />
          <button
            className="text-editor__btn"
            onClick={() => handleFontSizeChange(-1)}
            title="Decrease font size"
          >
            <Icon name="minus" size={14} />
          </button>
          <span className="text-editor__font-size">{fontSize}px</span>
          <button
            className="text-editor__btn"
            onClick={() => handleFontSizeChange(1)}
            title="Increase font size"
          >
            <Icon name="plus" size={14} />
          </button>
          <div className="text-editor__separator" />
          <button
            className={`text-editor__btn ${wordWrap ? 'text-editor__btn--active' : ''}`}
            onClick={() => setWordWrap(!wordWrap)}
            title="Word wrap"
          >
            <Icon name="align-left" size={14} />
          </button>
          <button
            className={`text-editor__btn ${showLineNumbers ? 'text-editor__btn--active' : ''}`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Line numbers"
          >
            <Icon name="list" size={14} />
          </button>
        </div>
        <div className="text-editor__file-name">
          {isModified && <span className="text-editor__modified">*</span>}
          {getFileName()}
        </div>
      </div>

      <div className="text-editor__content">
        {showLineNumbers && (
          <div className="text-editor__line-numbers" style={{ fontSize }}>
            {content.split('\n').map((_, i) => (
              <div key={i} className="text-editor__line-number">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <textarea
          className="text-editor__textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            fontSize,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
          }}
          spellCheck={false}
          placeholder="Start typing..."
        />
      </div>

      <div className="text-editor__statusbar">
        <span>Lines: {getLineCount()}</span>
        <span>Characters: {getCharCount()}</span>
        {currentPath && <span className="text-editor__path">{currentPath}</span>}
      </div>
    </div>
  );
};

export default TextEditor;
