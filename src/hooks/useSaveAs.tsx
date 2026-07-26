import React, { useCallback, useState } from 'react';
import { SaveDialog } from '../components/SaveDialog';
import { createBackend } from '../services/fsAdapter';
import type { FsBackend } from '../services/fsAdapter';
import type { SaveFormat } from '../services/saveAs';
import { useNotificationStore } from '../stores/notificationStore';

export interface SaveRequest {
  /** Suggested filename, extension included. */
  initialName: string;
  /** Folder to write into. */
  folder: string;
  formats: SaveFormat[];
  /** Bytes for a binary format, a string for a text one. */
  produce: (format: SaveFormat) => Promise<Uint8Array | string> | Uint8Array | string;
}

/**
 * The whole Save As flow — sheet, overwrite check, write, result message —
 * so five apps do not each grow their own copy of it.
 */
export const useSaveAs = (backend?: FsBackend | null) => {
  const [request, setRequest] = useState<SaveRequest | null>(null);
  const [overwrite, setOverwrite] = useState<{ name: string; format: SaveFormat } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The outcome goes through the OS toast as well as the returned strings. An
  // app that renders only `node` — which was every app but Preview — would
  // otherwise save in complete silence, success and failure alike.
  const notify = useNotificationStore((s) => s.addNotification);

  const open = useCallback((next: SaveRequest) => {
    setError(null);
    setMessage(null);
    setOverwrite(null);
    setRequest(next);
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    setOverwrite(null);
    setBusy(false);
  }, []);

  const write = useCallback(
    async (name: string, format: SaveFormat) => {
      if (!request) return;
      const fs = backend ?? (await createBackend());
      setBusy(true);
      try {
        const target = fs.join(request.folder, name);
        const payload = await request.produce(format);
        if (typeof payload === 'string') await fs.writeText(target, payload);
        else await fs.writeBinary(target, payload);
        setMessage(`Saved ${name}`);
        notify({ title: 'Saved', message: `${name} — ${request.folder}`, icon: 'save' });
        close();
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'The file could not be saved.';
        setError(reason);
        notify({ title: 'Save failed', message: reason, icon: 'alert-triangle' });
        setBusy(false);
      }
    },
    [request, backend, close, notify]
  );

  const attempt = useCallback(
    async (name: string, format: SaveFormat) => {
      if (!request) return;
      const fs = backend ?? (await createBackend());
      // Ask before replacing something that is already there.
      const siblings = await fs.list(request.folder);
      if (siblings.some((s) => s.name === name)) {
        setOverwrite({ name, format });
        return;
      }
      await write(name, format);
    },
    [request, backend, write]
  );

  const node: React.ReactNode = request ? (
    <SaveDialog
      initialName={overwrite?.name ?? request.initialName}
      folder={request.folder}
      formats={request.formats}
      busy={busy}
      confirmOverwrite={!!overwrite}
      onCancel={() => (overwrite ? setOverwrite(null) : close())}
      onSave={(name, format) =>
        overwrite ? void write(overwrite.name, overwrite.format) : void attempt(name, format)
      }
    />
  ) : null;

  return { open, node, message, error, setMessage, setError };
};

export default useSaveAs;
