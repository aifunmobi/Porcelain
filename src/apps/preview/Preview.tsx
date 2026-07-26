import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon } from '../../components/Icons';
import { createBackend, basename, mimeForPath } from '../../services/fsAdapter';
import type { FsBackend, FsItem } from '../../services/fsAdapter';
import { formatFileSize, getFileExtension } from '../../services/tauriFs';
import type { AppProps } from '../../types';
import { renderMarkdown } from './markdown';
import { useSaveAs } from '../../hooks/useSaveAs';
import {
  encodeImage,
  encodeText,
  IMAGE_FORMATS,
  TEXT_FORMATS,
  MARKDOWN_FORMATS,
} from '../../services/saveAs';
import './Preview.css';

interface PreviewProps extends AppProps {
  filePath?: string;
  filePaths?: string[];
}

type DocKind = 'image' | 'pdf' | 'markdown' | 'text' | 'unsupported';

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];

export const kindForPath = (path: string): DocKind => {
  const ext = getFileExtension(path);
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (['txt', 'json', 'js', 'ts', 'tsx', 'css', 'html', 'xml', 'yaml', 'yml', 'log'].includes(ext))
    return 'text';
  return 'unsupported';
};

/** Files Preview claims from Files' double-click, and the open picker's filter.
 *  Must cover everything docKind() can render — html in particular, since Save
 *  As writes it and a file Preview wrote should be a file Preview will open. */
export const PREVIEWABLE = [...IMAGE_EXT, 'pdf', 'md', 'markdown', 'txt', 'html'];

/**
 * Page count without a PDF library: every page object carries `/Type /Page`
 * (not `/Pages`). Fails closed to a single page for compressed object streams,
 * where paging still works, only the total is unknown.
 */
const countPdfPages = (bytes: Uint8Array): number | null => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ? matches.length : null;
};

interface Doc {
  path: string;
  kind: DocKind;
  url?: string;
  text?: string;
  size: number;
  pages: number | null;
}

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const Preview: React.FC<PreviewProps> = ({ filePath, filePaths }) => {
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<FsItem[] | null>(null);
  const [extraPaths, setExtraPaths] = useState<string[] | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const paths = useMemo(
    () => extraPaths ?? (filePaths?.length ? filePaths : filePath ? [filePath] : []),
    [extraPaths, filePaths, filePath]
  );

  useEffect(() => {
    createBackend().then(setBackend);
  }, []);

  useEffect(() => {
    if (!backend || !paths.length) return;
    let cancelled = false;
    (async () => {
      const loaded: Doc[] = [];
      for (const path of paths) {
        const kind = kindForPath(path);
        try {
          const doc: Doc = { path, kind, size: 0, pages: null };
          if (kind === 'image' || kind === 'pdf') {
            doc.url = await backend.objectUrl(path);
            const bytes = await backend.readBinary(path);
            doc.size = bytes.length;
            if (kind === 'pdf') doc.pages = countPdfPages(bytes);
          } else if (kind !== 'unsupported') {
            doc.text = await backend.readText(path);
            doc.size = doc.text.length;
          }
          loaded.push(doc);
        } catch {
          loaded.push({ path, kind: 'unsupported', size: 0, pages: null });
        }
      }
      if (!cancelled) {
        setDocs(loaded);
        setError(loaded.length ? null : 'Nothing to preview');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, paths]);

  const doc = docs[index];

  // A new document starts fitted, unrotated, on page one.
  useEffect(() => {
    setZoom(1);
    setFit(true);
    setRotation(0);
    setPage(1);
  }, [index]);

  const stepZoom = useCallback((delta: number) => {
    setFit(false);
    setZoom((current) => {
      const at = ZOOM_STEPS.findIndex((z) => z >= current - 0.001);
      const next = Math.min(ZOOM_STEPS.length - 1, Math.max(0, (at === -1 ? 3 : at) + delta));
      return ZOOM_STEPS[next];
    });
  }, []);

  const move = useCallback(
    (delta: number) => setIndex((i) => Math.min(docs.length - 1, Math.max(0, i + delta))),
    [docs.length]
  );

  const changePage = useCallback(
    (delta: number) =>
      setPage((p) => {
        const max = doc?.pages ?? Infinity;
        return Math.min(max, Math.max(1, p + delta));
      }),
    [doc]
  );

  const saver = useSaveAs(backend);

  /** Save As on the open document, converting to whichever format is chosen. */
  const saveAs = useCallback(() => {
    if (!doc || !backend) return;
    const formats =
      doc.kind === 'image'
        ? IMAGE_FORMATS
        : doc.kind === 'markdown'
          ? MARKDOWN_FORMATS
          : TEXT_FORMATS;
    saver.open({
      initialName: basename(doc.path),
      folder: backend.parent(doc.path),
      formats,
      produce: async (format) => {
        if (doc.kind === 'image') {
          if (!doc.url) throw new Error('This image is not loaded yet.');
          return encodeImage(doc.url, format);
        }
        return encodeText(doc.text ?? '', format, basename(doc.path));
      },
    });
  }, [doc, backend, saver]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          window.print();
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          saveAs();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        doc?.kind === 'pdf' && e.key === 'ArrowRight' ? changePage(1) : move(1);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        doc?.kind === 'pdf' && e.key === 'ArrowLeft' ? changePage(-1) : move(-1);
      }
    },
    [doc, move, changePage, saveAs]
  );

  useEffect(() => {
    rootRef.current?.focus();
  }, [docs.length]);

  /** Preview's own Open: Files hands text to the editor, so this is the way in. */
  const showPicker = useCallback(async () => {
    if (!backend) return;
    const found = await backend.searchDeep(backend.home, '');
    setPicker(
      found
        .filter((f) => !f.isDir && PREVIEWABLE.includes(getFileExtension(f.name)))
        .slice(0, 100)
    );
  }, [backend]);

  const transform = `rotate(${rotation}deg)` + (fit ? '' : ` scale(${zoom})`);

  const stage = () => {
    if (error) return <div className="preview__empty"><Icon name="alert-circle" size={40} /><p>{error}</p></div>;
    if (!doc) return <div className="preview__empty"><Icon name="preview" size={48} /><p>No document open</p></div>;

    if (doc.kind === 'image' && doc.url) {
      return (
        <img
          src={doc.url}
          alt={basename(doc.path)}
          className={`preview__image ${fit ? 'preview__image--fit' : ''}`}
          style={{ transform }}
        />
      );
    }
    if (doc.kind === 'pdf' && doc.url) {
      return (
        <object
          key={`${doc.path}#${page}`}
          className="preview__pdf"
          data={`${doc.url}#page=${page}`}
          type="application/pdf"
        >
          <div className="preview__empty">
            <Icon name="file-text" size={40} />
            <p>This PDF cannot be displayed here.</p>
          </div>
        </object>
      );
    }
    if (doc.kind === 'markdown') {
      return (
        <div className="preview__page" style={{ transform: fit ? undefined : `scale(${zoom})` }}>
          <div
            className="preview__markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.text ?? '') }}
          />
        </div>
      );
    }
    if (doc.kind === 'text') {
      return (
        <div className="preview__page" style={{ transform: fit ? undefined : `scale(${zoom})` }}>
          <pre className="preview__text">{doc.text}</pre>
        </div>
      );
    }
    return (
      <div className="preview__empty">
        <Icon name="file" size={40} />
        <p>{basename(doc.path)} cannot be previewed</p>
      </div>
    );
  };

  const showSidebar = docs.length > 1;

  return (
    <div className="preview" ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="preview__toolbar">
        <button className="preview__btn" onClick={() => void showPicker()} title="Open…">
          <Icon name="folder" size={14} />
        </button>
        <button className="preview__btn" onClick={saveAs} disabled={!doc} title="Save As… (⌘S)">
          <Icon name="save" size={14} />
        </button>
        <div className="preview__separator" />
        <button className="preview__btn" onClick={() => stepZoom(-1)} title="Zoom out">
          <Icon name="minus" size={14} />
        </button>
        <span className="preview__zoom">{fit ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
        <button className="preview__btn" onClick={() => stepZoom(1)} title="Zoom in">
          <Icon name="plus" size={14} />
        </button>
        <button
          className={`preview__btn ${fit ? 'is-selected' : ''}`}
          onClick={() => setFit(true)}
          title="Fit to window"
        >
          <span className="preview__btn-label">Fit</span>
        </button>
        <button
          className={`preview__btn ${!fit && zoom === 1 ? 'is-selected' : ''}`}
          onClick={() => {
            setFit(false);
            setZoom(1);
          }}
          title="Actual size"
        >
          <span className="preview__btn-label">1:1</span>
        </button>
        <div className="preview__separator" />
        <button className="preview__btn" onClick={() => setRotation((r) => r - 90)} title="Rotate left">
          <Icon name="refresh" size={14} className="preview__flip" />
        </button>
        <button className="preview__btn" onClick={() => setRotation((r) => r + 90)} title="Rotate right">
          <Icon name="refresh" size={14} />
        </button>
        <div className="preview__separator" />
        <button className="preview__btn" onClick={() => window.print()} title="Print (⌘P)">
          <Icon name="printer" size={14} />
        </button>

        {doc?.kind === 'pdf' && (
          <div className="preview__pager">
            <button className="preview__btn" onClick={() => changePage(-1)} title="Previous page">
              <Icon name="chevron-left" size={14} />
            </button>
            <span className="preview__page-indicator">
              Page {page}
              {doc.pages ? ` of ${doc.pages}` : ''}
            </span>
            <button className="preview__btn" onClick={() => changePage(1)} title="Next page">
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        )}

        <div className="preview__title">{doc ? basename(doc.path) : 'Preview'}</div>
      </div>

      <div className="preview__body">
        {showSidebar && (
          <div className="preview__sidebar">
            {docs.map((d, i) => (
              <button
                key={d.path}
                className={`pcl-bare preview__thumb ${i === index ? 'preview__thumb--active' : ''}`}
                onClick={() => setIndex(i)}
                title={basename(d.path)}
              >
                {d.kind === 'image' && d.url ? (
                  <img src={d.url} alt="" />
                ) : (
                  <Icon name={d.kind === 'pdf' ? 'file-text' : 'document'} size={22} />
                )}
                <span>{basename(d.path)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="preview__stage" ref={stageRef}>
          {stage()}
        </div>
      </div>

      {picker && (
        <div className="preview__picker-backdrop" onClick={() => setPicker(null)}>
          <div className="preview__picker" onClick={(e) => e.stopPropagation()}>
            <div className="preview__picker-title">Open — click several to compare them</div>
            <div className="preview__picker-list">
              {picker.length === 0 && <div className="preview__empty-row">Nothing to preview</div>}
              {picker.map((option) => (
                <button
                  key={option.path}
                  className="pcl-bare preview__picker-item"
                  onClick={() => {
                    setExtraPaths((current) =>
                      current?.includes(option.path) ? current : [...(current ?? []), option.path]
                    );
                    setIndex(0);
                  }}
                >
                  <Icon name="file" size={14} />
                  {option.name}
                  <span className="preview__picker-path">{option.path}</span>
                </button>
              ))}
            </div>
            <div className="preview__picker-actions">
              <button onClick={() => setExtraPaths(null)}>Clear</button>
              <button className="is-primary" onClick={() => setPicker(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {saver.node}

      <div className="preview__statusbar">
        {doc && (
          <>
            <span>{mimeForPath(doc.path)}</span>
            <span>{formatFileSize(doc.size)}</span>
            {docs.length > 1 && (
              <span>
                {index + 1} of {docs.length}
              </span>
            )}
            {saver.message && <span className="preview__saved">{saver.message}</span>}
            {saver.error && <span className="preview__save-error">{saver.error}</span>}
          </>
        )}
      </div>
    </div>
  );
};

export default Preview;
