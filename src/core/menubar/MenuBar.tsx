import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWindowStore } from '../../stores/windowStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { appRegistry } from '../../apps/registry';
import { Icon } from '../../components/Icons';
import './MenuBar.css';

export const MenuBar: React.FC = () => {
  const { activeWindowId, windows } = useWindowStore();
  const { volume, showSeconds, use24Hour } = useSettingsStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAppleMenu, setShowAppleMenu] = useState(false);

  const activeWindow = activeWindowId ? windows.get(activeWindowId) : null;
  const activeApp = activeWindow ? appRegistry[activeWindow.appId] : null;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    let period = '';

    if (!use24Hour) {
      period = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const timeStr = use24Hour
      ? `${hours.toString().padStart(2, '0')}:${minutes}`
      : `${hours}:${minutes}`;

    return showSeconds ? `${timeStr}:${seconds}${period}` : `${timeStr}${period}`;
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return 'volume';
    return 'volume';
  };

  return (
    <motion.div
      className="menubar"
      initial={{ y: -28 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="menubar__left">
        <div
          className="menubar__apple"
          onClick={() => setShowAppleMenu(!showAppleMenu)}
        >
          <svg width="14" height="17" viewBox="0 0 14 17" fill="currentColor">
            <path d="M13.2 12.8c-.3.7-.5 1-.9 1.6-.6.8-1.4 1.8-2.4 1.9-1 0-1.2-.6-2.5-.6-1.3 0-1.6.6-2.5.7-1 0-1.8-1-2.4-1.9C1.2 12.5.5 10.2.9 8.5c.3-1.2 1-2.2 1.9-2.9.8-.6 1.9-1 2.9-.9.9 0 1.8.5 2.3.5s1.5-.6 2.7-.5c.5 0 1.8.2 2.6 1.4-2.2 1.3-1.8 4.6.6 5.5-.5 1.3-.7 1.9-1.7 3.2zM9.2 0c.1.8-.2 1.6-.7 2.2-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.6.8-2.1C7.6.5 8.5.1 9.2 0z" />
          </svg>
        </div>
        <div className="menubar__app-name">
          {activeApp?.name || 'Porcelain OS'}
        </div>
        <div className="menubar__menus">
          <button className="menubar__menu">File</button>
          <button className="menubar__menu">Edit</button>
          <button className="menubar__menu">View</button>
          <button className="menubar__menu">Window</button>
          <button className="menubar__menu">Help</button>
        </div>
      </div>

      <div className="menubar__right">
        <div className="menubar__status-item">
          <Icon name="bluetooth" size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name="wifi" size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name={getVolumeIcon()} size={14} />
        </div>
        <div className="menubar__status-item">
          <Icon name="battery" size={18} />
        </div>
        <div className="menubar__datetime">
          <span className="menubar__date">{formatDate(currentTime)}</span>
          <span className="menubar__time">{formatTime(currentTime)}</span>
        </div>
      </div>

      {showAppleMenu && (
        <>
          <div
            className="menubar__overlay"
            onClick={() => setShowAppleMenu(false)}
          />
          <motion.div
            className="menubar__dropdown"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="menubar__dropdown-item">
              <strong>About Porcelain OS</strong>
            </div>
            <div className="menubar__dropdown-divider" />
            <div className="menubar__dropdown-item">System Preferences...</div>
            <div className="menubar__dropdown-divider" />
            <div className="menubar__dropdown-item">Force Quit...</div>
            <div className="menubar__dropdown-divider" />
            <div className="menubar__dropdown-item">Sleep</div>
            <div className="menubar__dropdown-item">Restart...</div>
            <div className="menubar__dropdown-item">Shut Down...</div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default MenuBar;
