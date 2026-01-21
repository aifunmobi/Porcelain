import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  toasts: Notification[];
  doNotDisturb: boolean;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  dismissToast: (id: string) => void;
  setDoNotDisturb: (dnd: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      toasts: [],
      doNotDisturb: false,

      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          // Only show toast if not in DND mode
          toasts: state.doNotDisturb
            ? state.toasts
            : [...state.toasts, newNotification],
        }));

        // Auto-dismiss toast after 5 seconds
        if (!get().doNotDisturb) {
          setTimeout(() => {
            get().dismissToast(id);
          }, 5000);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () =>
        set({ notifications: [] }),

      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      setDoNotDisturb: (doNotDisturb) =>
        set({ doNotDisturb }),
    }),
    {
      name: 'porcelain-notifications',
      partialize: (state) => ({
        notifications: state.notifications,
        doNotDisturb: state.doNotDisturb,
      }),
      // Custom serialization for Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state?.notifications) {
            parsed.state.notifications = parsed.state.notifications.map((n: Notification) => ({
              ...n,
              timestamp: new Date(n.timestamp),
            }));
          }
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// Helper hook for sending notifications
export const useNotify = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return {
    notify: (title: string, message: string, options?: { icon?: string; appId?: string }) => {
      return addNotification({
        title,
        message,
        icon: options?.icon,
        appId: options?.appId,
      });
    },
    success: (title: string, message: string) => {
      return addNotification({
        title,
        message,
        icon: 'check-circle',
      });
    },
    error: (title: string, message: string) => {
      return addNotification({
        title,
        message,
        icon: 'alert-circle',
      });
    },
    warning: (title: string, message: string) => {
      return addNotification({
        title,
        message,
        icon: 'alert-triangle',
      });
    },
    info: (title: string, message: string) => {
      return addNotification({
        title,
        message,
        icon: 'info',
      });
    },
  };
};
