import React, { useState, useEffect } from 'react';
import { withExtension, type SaveFormat } from '../services/saveAs';
import './SaveDialog.css';

interface SaveDialogProps {
  /** Suggested filename, extension included. */
  initialName: string;
  /** Folder the file lands in. */
  folder: string;
  formats: SaveFormat[];
  onCancel: () => void;
  onSave: (name: string, format: SaveFormat) => void;
  busy?: boolean;
  /** Set when the chosen name is already taken; asks before overwriting. */
  confirmOverwrite?: boolean;
}

/**
 * One save sheet for every app. Rendered in-app rather than via window.prompt,
 * which would freeze the whole shell behind a browser modal.
 */
export const SaveDialog: React.FC<SaveDialogProps> = ({
  initialName,
  folder,
  formats,
  onCancel,
  onSave,
  busy = false,
  confirmOverwrite = false,
}) => {
  const initialFormat =
    formats.find((f) => initialName.toLowerCase().endsWith(`.${f.ext}`)) ?? formats[0];
  const [format, setFormat] = useState<SaveFormat>(initialFormat);
  const [name, setName] = useState(() => withExtension(initialName, initialFormat));

  // The filename always carries the chosen format's extension.
  useEffect(() => {
    setName((current) => withExtension(current, format));
  }, [format]);

  const submit = () => {
    if (!name.trim() || busy) return;
    onSave(name.trim(), format);
  };

  return (
    <div className="save-dialog__backdrop" onClick={onCancel}>
      <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="save-dialog__title">{confirmOverwrite ? 'Replace file?' : 'Save As'}</div>

        {confirmOverwrite ? (
          <p className="save-dialog__message">
            “{name}” already exists in {folder}. Replacing it cannot be undone.
          </p>
        ) : (
          <>
            <label className="save-dialog__field">
              <span>Save as</span>
              <input
                className="save-dialog__input"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') submit();
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </label>

            <label className="save-dialog__field">
              <span>Format</span>
              <select
                className="save-dialog__select"
                value={format.ext}
                onChange={(e) =>
                  setFormat(formats.find((f) => f.ext === e.target.value) ?? formats[0])
                }
              >
                {formats.map((f) => (
                  <option key={f.ext} value={f.ext}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="save-dialog__where">Where: {folder}</div>
          </>
        )}

        <div className="save-dialog__actions">
          <button onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={confirmOverwrite ? 'is-danger' : 'is-primary'}
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Saving…' : confirmOverwrite ? 'Replace' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDialog;
