import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../stores/notificationStore';
import { Icon } from './Icons';
import type { Notification } from '../types';
import './Notifications.css';

// Toast Container - displays temporary notification popups
export const ToastContainer: React.FC = () => {
  const toasts = useNotificationStore((state) => state.toasts);
  const dismissToast = useNotificationStore((state) => state.dismissToast);

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} notification={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  return (
    <motion.div
      className="toast"
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      layout
    >
      <div className="toast__icon">
        <Icon name={notification.icon || 'info'} size={20} />
      </div>
      <div className="toast__content">
        <div className="toast__title">{notification.title}</div>
        <div className="toast__message">{notification.message}</div>
      </div>
      <button className="toast__close" onClick={onDismiss}>
        <Icon name="x" size={14} />
      </button>
    </motion.div>
  );
};

// Notification Center - dropdown showing all notifications
interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const doNotDisturb = useNotificationStore((state) => state.doNotDisturb);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const setDoNotDisturb = useNotificationStore((state) => state.setDoNotDisturb);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="notification-center__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="notification-center"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="notification-center__header">
              <h3 className="notification-center__title">
                Notifications
                {unreadCount > 0 && (
                  <span className="notification-center__badge">{unreadCount}</span>
                )}
              </h3>
              <div className="notification-center__actions">
                {notifications.length > 0 && (
                  <>
                    <button
                      className="notification-center__action"
                      onClick={markAllAsRead}
                      title="Mark all as read"
                    >
                      <Icon name="check-circle" size={14} />
                    </button>
                    <button
                      className="notification-center__action notification-center__action--danger"
                      onClick={clearAll}
                      title="Clear all"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="notification-center__dnd">
              <label className="notification-center__dnd-label">
                <input
                  type="checkbox"
                  checked={doNotDisturb}
                  onChange={(e) => setDoNotDisturb(e.target.checked)}
                />
                <span className="notification-center__dnd-toggle" />
                <span>Do Not Disturb</span>
              </label>
            </div>

            <div className="notification-center__list">
              {notifications.length === 0 ? (
                <div className="notification-center__empty">
                  <Icon name="bell" size={32} color="var(--color-text-tertiary)" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'notification-item--unread' : ''}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="notification-item__icon">
                      <Icon name={notification.icon || 'info'} size={18} />
                    </div>
                    <div className="notification-item__content">
                      <div className="notification-item__title">{notification.title}</div>
                      <div className="notification-item__message">{notification.message}</div>
                      <div className="notification-item__time">{formatTime(notification.timestamp)}</div>
                    </div>
                    <button
                      className="notification-item__remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Bell icon with badge for MenuBar
interface NotificationBellProps {
  onClick: () => void;
  isActive: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onClick, isActive }) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`notification-bell ${isActive ? 'notification-bell--active' : ''}`}
      onClick={onClick}
    >
      <Icon name="bell" size={14} />
      {unreadCount > 0 && (
        <span className="notification-bell__badge">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};
