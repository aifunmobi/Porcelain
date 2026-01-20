import React, { useCallback } from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { Icon } from '../../components/Icons';
import type { AppProps } from '../../types';
import './Notes.css';

export const Notes: React.FC<AppProps> = () => {
  const {
    notes,
    activeNoteId,
    createNote,
    updateNote,
    deleteNote,
    setActiveNote,
    getAllNotes,
  } = useNotesStore();

  const allNotes = getAllNotes();
  const activeNote = activeNoteId ? notes[activeNoteId] : null;

  const handleCreateNote = useCallback(() => {
    createNote();
  }, [createNote]);

  const handleDeleteNote = useCallback(() => {
    if (activeNoteId) {
      deleteNote(activeNoteId);
    }
  }, [activeNoteId, deleteNote]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeNoteId) {
        updateNote(activeNoteId, { title: e.target.value });
      }
    },
    [activeNoteId, updateNote]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (activeNoteId) {
        updateNote(activeNoteId, { content: e.target.value });
      }
    },
    [activeNoteId, updateNote]
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPreview = (content: string) => {
    const lines = content.split('\n').filter((line) => line.trim());
    return lines.slice(0, 2).join(' ').slice(0, 100) || 'No content';
  };

  return (
    <div className="notes">
      <div className="notes__sidebar">
        <div className="notes__sidebar-header">
          <button className="notes__new-btn" onClick={handleCreateNote}>
            <Icon name="plus" size={16} />
            New Note
          </button>
        </div>
        <div className="notes__list">
          {allNotes.map((note) => (
            <div
              key={note.id}
              className={`notes__item ${activeNoteId === note.id ? 'notes__item--active' : ''}`}
              onClick={() => setActiveNote(note.id)}
            >
              <div className="notes__item-title">{note.title || 'Untitled'}</div>
              <div className="notes__item-preview">{getPreview(note.content)}</div>
              <div className="notes__item-date">{formatDate(note.modifiedAt)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="notes__editor">
        {activeNote ? (
          <>
            <div className="notes__editor-header">
              <input
                type="text"
                className="notes__title-input"
                value={activeNote.title}
                onChange={handleTitleChange}
                placeholder="Note title"
              />
              <button className="notes__delete-btn" onClick={handleDeleteNote}>
                <Icon name="trash" size={16} />
              </button>
            </div>
            <div className="notes__editor-meta">
              <span>Last edited {formatDate(activeNote.modifiedAt)}</span>
            </div>
            <textarea
              className="notes__content"
              value={activeNote.content}
              onChange={handleContentChange}
              placeholder="Start typing..."
            />
          </>
        ) : (
          <div className="notes__empty">
            <Icon name="notepad" size={48} color="var(--color-porcelain-300)" />
            <p>Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;
