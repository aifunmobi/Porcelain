import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../types';

interface NotesState {
  notes: Record<string, Note>;
  activeNoteId: string | null;

  // Actions
  createNote: (title?: string, content?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  getNote: (id: string) => Note | undefined;
  getAllNotes: () => Note[];
  searchNotes: (query: string) => Note[];
}

const createDefaultNotes = (): Record<string, Note> => {
  const now = new Date();
  return {
    'welcome-note': {
      id: 'welcome-note',
      title: 'Welcome to Notes',
      content: 'Welcome to the Notes app!\n\nYou can create, edit, and organize your notes here.\n\n• Click the + button to create a new note\n• Your notes are saved automatically\n• Use tags to organize your notes',
      createdAt: now,
      modifiedAt: now,
      tags: ['welcome'],
      color: '#a8b5c4',
    },
  };
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: createDefaultNotes(),
      activeNoteId: 'welcome-note',

      createNote: (title = 'Untitled Note', content = '') => {
        const id = uuidv4();
        const now = new Date();

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              id,
              title,
              content,
              createdAt: now,
              modifiedAt: now,
              tags: [],
            },
          },
          activeNoteId: id,
        }));

        return id;
      },

      updateNote: (id, updates) => {
        const note = get().notes[id];
        if (!note) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              ...updates,
              modifiedAt: new Date(),
            },
          },
        }));
      },

      deleteNote: (id) => {
        set((state) => {
          const newNotes = { ...state.notes };
          delete newNotes[id];

          const noteIds = Object.keys(newNotes);
          const newActiveId = state.activeNoteId === id
            ? (noteIds.length > 0 ? noteIds[0] : null)
            : state.activeNoteId;

          return {
            notes: newNotes,
            activeNoteId: newActiveId,
          };
        });
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      getNote: (id) => get().notes[id],

      getAllNotes: () => {
        const notes = Object.values(get().notes);
        return notes.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
      },

      searchNotes: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().getAllNotes().filter(
          (note) =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery) ||
            note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },
    }),
    {
      name: 'porcelain-notes',
      partialize: (state) => ({
        notes: Object.fromEntries(
          Object.entries(state.notes).map(([id, note]) => [
            id,
            {
              ...note,
              createdAt: note.createdAt.toISOString(),
              modifiedAt: note.modifiedAt.toISOString(),
            },
          ])
        ),
        activeNoteId: state.activeNoteId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notes = Object.fromEntries(
            Object.entries(state.notes).map(([id, note]) => [
              id,
              {
                ...note,
                createdAt: new Date(note.createdAt),
                modifiedAt: new Date(note.modifiedAt),
              },
            ])
          );
        }
      },
    }
  )
);
