import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent } from '../types';

interface CalendarState {
  events: Record<string, CalendarEvent>;
  selectedDate: Date;
  viewMode: 'month' | 'week' | 'day';

  // Actions
  createEvent: (event: Omit<CalendarEvent, 'id'>) => string;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEvent: (id: string) => CalendarEvent | undefined;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
}

const eventColors = ['#a8b5c4', '#9cb89c', '#d4c4a8', '#c9a8a8', '#b4a8c9'];

const createDefaultEvents = (): Record<string, CalendarEvent> => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    'welcome-event': {
      id: 'welcome-event',
      title: 'Welcome to Porcelain OS',
      description: 'Explore all the features of your new desktop environment!',
      startDate: now,
      endDate: new Date(now.getTime() + 60 * 60 * 1000),
      allDay: false,
      color: eventColors[0],
    },
  };
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: createDefaultEvents(),
      selectedDate: new Date(),
      viewMode: 'month',

      createEvent: (event) => {
        const id = uuidv4();

        set((state) => ({
          events: {
            ...state.events,
            [id]: { ...event, id },
          },
        }));

        return id;
      },

      updateEvent: (id, updates) => {
        const event = get().events[id];
        if (!event) return;

        set((state) => ({
          events: {
            ...state.events,
            [id]: { ...event, ...updates },
          },
        }));
      },

      deleteEvent: (id) => {
        set((state) => {
          const newEvents = { ...state.events };
          delete newEvents[id];
          return { events: newEvents };
        });
      },

      getEvent: (id) => get().events[id],

      getEventsForDate: (date) => {
        const events = Object.values(get().events);
        return events.filter((event) => {
          const eventDate = new Date(event.startDate);
          return (
            eventDate.getFullYear() === date.getFullYear() &&
            eventDate.getMonth() === date.getMonth() &&
            eventDate.getDate() === date.getDate()
          );
        });
      },

      getEventsForMonth: (year, month) => {
        const events = Object.values(get().events);
        return events.filter((event) => {
          const eventDate = new Date(event.startDate);
          return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        });
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: 'porcelain-calendar',
      partialize: (state) => ({
        events: Object.fromEntries(
          Object.entries(state.events).map(([id, event]) => [
            id,
            {
              ...event,
              startDate: event.startDate.toISOString(),
              endDate: event.endDate.toISOString(),
            },
          ])
        ),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.events = Object.fromEntries(
            Object.entries(state.events).map(([id, event]) => [
              id,
              {
                ...event,
                startDate: new Date(event.startDate),
                endDate: new Date(event.endDate),
              },
            ])
          );
        }
      },
    }
  )
);
