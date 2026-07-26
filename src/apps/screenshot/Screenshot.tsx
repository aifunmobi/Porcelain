import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icons';
import { useWindowStore } from '../../stores/windowStore';
import { createBackend } from '../../services/fsAdapter';
import type { FsBackend } from '../../services/fsAdapter';
import {
  rasterise,
  canvasToPngBytes,
  copyCanvasToClipboard,
  screenshotName,
  type Rect,
} from '../../services/capture';
import type { AppProps } from '../../types';
import './Screenshot.css';

interface ScreenshotProps extends AppProps {
  /** Set by the ⌘⇧3 / ⌘⇧4 shortcuts, which capture without a further click. */
  autoCapture?: 'desktop' | 'region';
}

type Mode = 'desktop' | 'window' | 'region';
const DELAYS = [0, 5, 10] as const;

/**
 * The whole shell, not `.desktop` — windows live in a sibling layer, so
 * capturing the desktop alone would produce a wallpaper with no windows on it.
 */
const desktopElement = () =>
  (document.getElementById('root') as HTMLElement | null) ??
  (document.querySelector('.desktop') as HTMLElement | null);

export const Screenshot: React.FC<ScreenshotProps> = ({ windowId, autoCapture }) => {
  const [backend, setBackend] = useState<FsBackend | null>(null);
  const [mode, setMode] = useState<Mode>(autoCapture === 'region' ? 'region' : 'desktop');
  const [delay, setDelay] = useState<(typeof DELAYS)[number]>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shot, setShot] = useState<{ url: string; path?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [region, setRegion] = useState<Rect | null>(null);
  const [targetWindow, setTargetWindow] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Subscribe to the Map itself: a selector that builds an array returns a new
  // reference every render, which zustand treats as a changed snapshot — that
  // is an infinite update loop, not a re-render.
  const windowMap = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    createBackend().then(setBackend);
  }, []);

  const others = useMemo(
    () => Array.from(windowMap.values()).filter((w) => w.id !== windowId),
    [windowMap, windowId]
  );

  /* ------------------------------------------------------------- capture */

  const persist = useCallback(
    async (canvas: HTMLCanvasElement) => {
      canvasRef.current = canvas;
      const url = canvas.toDataURL('image/png');
      if (!backend) {
        setShot({ url });
        return;
      }
      try {
        const bytes = await canvasToPngBytes(canvas);
        const pictures = backend.favorites.find((f) => f.id === 'pictures')?.path ?? backend.home;
        const target = backend.join(pictures, screenshotName(new Date()));
        await backend.writeBinary(target, bytes);
        setShot({ url, path: target });
        setStatus(`Saved to ${target}`);
      } catch (err) {
        setShot({ url });
        setError(err instanceof Error ? err.message : 'The capture could not be saved.');
      }
    },
    [backend]
  );

  const runCapture = useCallback(
    async (which: Mode, clip?: Rect) => {
      setError(null);
      setStatus(null);
      const root = desktopElement();
      if (!root) return setError('The desktop could not be found.');
      try {
        if (which === 'window') {
          const el = targetWindow
            ? (document.querySelector(`[data-window-id="${targetWindow}"]`) as HTMLElement | null)
            : null;
          if (!el) return setError('Choose a window to capture first.');
          await persist(await rasterise(el));
          return;
        }
        await persist(await rasterise(root, clip));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The capture failed.');
      }
    },
    [persist, targetWindow]
  );

  const captureWithDelay = useCallback(
    async (which: Mode, clip?: Rect) => {
      const tick = async (remaining: number) => {
        if (remaining <= 0) {
          setCountdown(null);
          await runCapture(which, clip);
          return;
        }
        setCountdown(remaining);
        window.setTimeout(() => void tick(remaining - 1), 1000);
      };
      await tick(delay);
    },
    [delay, runCapture]
  );

  /**
   * Keep this window out of its own screenshots. Minimising would do it too,
   * but a minimised window unmounts — taking the capture in progress with it —
   * so the shutter marks the window instead and the rasteriser drops it.
   */
  useEffect(() => {
    const own = rootRef.current?.closest('[data-window-id]');
    own?.setAttribute('data-capture-ignore', '');
  }, []);

  // ⌘⇧3 / ⌘⇧4 open this app already asking for a capture.
  const auto = useRef(false);
  useEffect(() => {
    if (!autoCapture || auto.current || !backend) return;
    auto.current = true;
    if (autoCapture === 'desktop') void captureWithDelay('desktop');
    else setSelecting(true);
  }, [autoCapture, backend, captureWithDelay]);

  /* -------------------------------------------------------- region select */

  useEffect(() => {
    if (!selecting) return;
    let start: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY };
      setRegion({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    };
    const onMove = (e: PointerEvent) => {
      if (!start) return;
      setRegion({
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        width: Math.abs(e.clientX - start.x),
        height: Math.abs(e.clientY - start.y),
      });
    };
    const onUp = (e: PointerEvent) => {
      if (!start) return;
      const rect = {
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        width: Math.abs(e.clientX - start.x),
        height: Math.abs(e.clientY - start.y),
      };
      start = null;
      setSelecting(false);
      setRegion(null);
      if (rect.width < 4 || rect.height < 4) return;
      void captureWithDelay('region', rect);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelecting(false);
        setRegion(null);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [selecting, captureWithDelay]);

  /* -------------------------------------------------------------- actions */

  const capture = useCallback(() => {
    if (mode === 'region') {
      setSelecting(true);
      return;
    }
    void captureWithDelay(mode);
  }, [mode, captureWithDelay]);

  const copy = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      await copyCanvasToClipboard(canvasRef.current);
      setStatus('Copied to the clipboard');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copying failed.');
    }
  }, []);

  const openInPreview = useCallback(() => {
    if (!shot?.path) return;
    void import('../registry').then(({ appRegistry }) => {
      const app = appRegistry['preview'];
      if (app) openWindow(app, { filePath: shot.path });
    });
  }, [shot, openWindow]);

  /* --------------------------------------------------------------- render */

  return (
    <div className="screenshot" ref={rootRef}>
      <div className="screenshot__controls">
        <div className="screenshot__group">
          <span className="screenshot__label">Capture</span>
          <div className="screenshot__segments">
            {(['desktop', 'window', 'region'] as Mode[]).map((m) => (
              <button
                key={m}
                className={`screenshot__segment ${mode === m ? 'screenshot__segment--active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'desktop' ? 'Whole Desktop' : m === 'window' ? 'Window' : 'Region'}
              </button>
            ))}
          </div>
        </div>

        <div className="screenshot__group">
          <span className="screenshot__label">Timer</span>
          <div className="screenshot__segments">
            {DELAYS.map((d) => (
              <button
                key={d}
                className={`screenshot__segment ${delay === d ? 'screenshot__segment--active' : ''}`}
                onClick={() => setDelay(d)}
              >
                {d === 0 ? 'None' : `${d}s`}
              </button>
            ))}
          </div>
        </div>

        {mode === 'window' && (
          <div className="screenshot__group">
            <span className="screenshot__label">Window</span>
            <select
              className="screenshot__select"
              value={targetWindow ?? ''}
              onChange={(e) => setTargetWindow(e.target.value || null)}
            >
              <option value="">Choose…</option>
              {others.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button className="screenshot__shutter" onClick={capture}>
          <Icon name="screenshot" size={16} />
          {mode === 'region' ? 'Select Region' : 'Capture'}
        </button>
      </div>

      {error && (
        <div className="screenshot__error">
          <Icon name="alert-triangle" size={15} />
          <span>{error}</span>
        </div>
      )}
      {status && !error && (
        <div className="screenshot__status">
          <Icon name="check-circle" size={15} />
          <span>{status}</span>
        </div>
      )}

      <div className="screenshot__result">
        {shot ? (
          <>
            <img src={shot.url} alt="Screenshot preview" className="screenshot__thumb" />
            <div className="screenshot__actions">
              <button onClick={() => void copy()}>
                <Icon name="copy" size={14} />
                Copy
              </button>
              <button onClick={openInPreview} disabled={!shot.path}>
                <Icon name="preview" size={14} />
                Open in Preview
              </button>
            </div>
          </>
        ) : (
          <div className="screenshot__empty">
            <Icon name="screenshot" size={48} color="var(--color-porcelain-300)" />
            <p>Captures the Porcelain desktop and saves them to Pictures.</p>
          </div>
        )}
      </div>

      {/* Portalled to <body>: the window is transformed by react-rnd, which
          would otherwise anchor these to the window instead of the viewport.
          Both are excluded from the capture itself. */}
      {selecting &&
        createPortal(
          <div className="screenshot__overlay" data-capture-ignore>
            <div className="screenshot__hint">Drag to choose a region · Esc to cancel</div>
            {region && (
              <div
                className="screenshot__marquee"
                style={{ left: region.x, top: region.y, width: region.width, height: region.height }}
              />
            )}
          </div>,
          document.body
        )}
      {countdown !== null &&
        createPortal(
          <div className="screenshot__countdown" data-capture-ignore>
            <span>{countdown}</span>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Screenshot;
