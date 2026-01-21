import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// Porcelain-style icons matching the uploaded design
export const FolderIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 7C3 5.89543 3.89543 5 5 5H9.58579C9.851 5 10.1054 5.10536 10.2929 5.29289L12 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FileIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 2V8H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path
      d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
  </svg>
);

export const GearIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path
      d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74485 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66515 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95234 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87234 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74485 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83445 4.66515 4.21 4.29C4.58515 3.91445 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66485 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95234 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87234 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58515 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66485 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M3 6H5H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 9L12 2L21 9V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 21V12H15V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M17 8L12 3L7 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 3V15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M7 10L12 15L17 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15V3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="11" cy="11" r="7" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path d="M21 21L16.5 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ComputerIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="2"
      y="3"
      width="20"
      height="14"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M8 21H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 17V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const GlobeIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <ellipse cx="12" cy="12" rx="4" ry="10" stroke={color} strokeWidth="1.5" />
    <path d="M2 12H22" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const UsbIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="6"
      y="2"
      width="12"
      height="20"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <rect x="9" y="5" width="2" height="3" fill={color} />
    <rect x="13" y="5" width="2" height="3" fill={color} />
  </svg>
);

export const NotepadIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="4"
      y="2"
      width="16"
      height="20"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M8 6H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 10H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 14H12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 2V4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 2V4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 2V4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CalculatorIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="4"
      y="2"
      width="16"
      height="20"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <rect x="6" y="4" width="12" height="4" rx="1" stroke={color} strokeWidth="1.5" />
    <circle cx="8" cy="12" r="1" fill={color} />
    <circle cx="12" cy="12" r="1" fill={color} />
    <circle cx="16" cy="12" r="1" fill={color} />
    <circle cx="8" cy="16" r="1" fill={color} />
    <circle cx="12" cy="16" r="1" fill={color} />
    <circle cx="16" cy="16" r="1" fill={color} />
    <circle cx="8" cy="20" r="1" fill={color} />
    <circle cx="12" cy="20" r="1" fill={color} />
    <circle cx="16" cy="20" r="1" fill={color} />
  </svg>
);

export const PaletteIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C12.83 22 13.5 21.33 13.5 20.5C13.5 20.11 13.35 19.76 13.11 19.49C12.88 19.23 12.73 18.88 12.73 18.5C12.73 17.67 13.4 17 14.23 17H16C19.31 17 22 14.31 22 11C22 6.03 17.52 2 12 2Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <circle cx="6.5" cy="11.5" r="1.5" fill={color} />
    <circle cx="9.5" cy="7.5" r="1.5" fill={color} />
    <circle cx="14.5" cy="7.5" r="1.5" fill={color} />
    <circle cx="17.5" cy="11.5" r="1.5" fill={color} />
  </svg>
);

export const MusicIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 18V5L21 3V16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="6" cy="18" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <circle cx="18" cy="16" r="3" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const VideoIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M10 8L16 12L10 16V8Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const PrinterIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M6 9V2H18V9"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 18H4C2.89543 18 2 17.1046 2 16V11C2 9.89543 2.89543 9 4 9H20C21.1046 9 22 9.89543 22 11V16C22 17.1046 21.1046 18 20 18H18"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="6" y="14" width="12" height="8" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const CloudIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M18 10H17.74C17.3659 7.68539 15.3775 6 13 6C11.4087 6 9.88258 6.63214 8.75736 7.75736C7.63214 8.88258 7 10.4087 7 12H6C4.93913 12 3.92172 12.4214 3.17157 13.1716C2.42143 13.9217 2 14.9391 2 16C2 17.0609 2.42143 18.0783 3.17157 18.8284C3.92172 19.5786 4.93913 20 6 20H18C19.3261 20 20.5979 19.4732 21.5355 18.5355C22.4732 17.5979 23 16.3261 23 15C23 13.6739 22.4732 12.4021 21.5355 11.4645C20.5979 10.5268 19.3261 10 18 10Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M16 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M3 10H21" stroke={color} strokeWidth="1.5" />
    <rect x="7" y="14" width="3" height="3" rx="0.5" fill={color} fillOpacity="0.3" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path d="M12 6V12L16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BatteryIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="2"
      y="7"
      width="18"
      height="10"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M22 10V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="4" y="9" width="10" height="6" rx="1" fill={color} fillOpacity="0.4" />
  </svg>
);

export const VolumeIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M19.07 4.93C20.9447 6.80528 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const MicrophoneIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="9"
      y="2"
      width="6"
      height="11"
      rx="3"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path
      d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M12 19V23" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 23H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const HelpIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path
      d="M9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9C15 10.6569 13.6569 12 12 12V14"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="18" r="1" fill={color} />
  </svg>
);

export const TerminalIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <path d="M6 8L10 12L6 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 16H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const WordIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <text x="12" y="16" fontSize="10" fontWeight="600" fill={color} textAnchor="middle">
      W
    </text>
  </svg>
);

export const ExcelIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <text x="12" y="16" fontSize="10" fontWeight="600" fill={color} textAnchor="middle">
      X
    </text>
  </svg>
);

export const ImageIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    <circle cx="8.5" cy="8.5" r="1.5" fill={color} />
    <path
      d="M21 15L16 10L5 21"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const WifiIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M5 12.55C7.31619 10.2278 10.5795 8.9902 13.9675 9.0826C17.3555 9.175 20.5457 10.5892 22.72 12.99"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.4"
    />
    <path
      d="M1.42 9C4.34267 6.10927 8.31049 4.45605 12.46 4.39C16.6095 4.32395 20.6292 5.85042 23.64 8.65"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.2"
    />
    <path
      d="M8.53 16.11C9.52614 15.1112 10.8697 14.5469 12.27 14.5369C13.6703 14.5269 15.0219 15.0721 16.032 16.057"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="20" r="1" fill={color} />
  </svg>
);

export const BluetoothIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M5 3L19 12L5 21V3Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PauseIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const SkipForwardIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 4L15 12L5 20V4Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path d="M19 5V19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SkipBackIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M19 20L9 12L19 4V20Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path d="M5 19V5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 5V19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const MinusIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const MaximizeIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const MinimizeIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 12H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M15 18L9 12L15 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 15L12 9L6 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6 9L12 15L18 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GridIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const ListIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M8 6H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 12H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 18H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="4" cy="6" r="1" fill={color} />
    <circle cx="4" cy="12" r="1" fill={color} />
    <circle cx="4" cy="18" r="1" fill={color} />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M1 4V10H7"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23 20V14H17"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BrowserIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color} strokeWidth="1.5" />
    <path d="M2 12H22" stroke={color} strokeWidth="1.5" />
    <path d="M12 2V22" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const WeatherIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
    <path d="M12 1V2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 14V15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M4.22 4.22L4.93 4.93" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M19.07 4.22L18.36 4.93" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M1 8H2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M22 8H23" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M18 18H6C4.34315 18 3 16.6569 3 15C3 13.5641 4.01068 12.3583 5.35529 12.0709C5.12513 11.5886 5 11.0563 5 10.5C5 8.567 6.567 7 8.5 7C9.34196 7 10.1145 7.3009 10.7171 7.80303C11.3726 6.71078 12.5937 6 14 6C16.2091 6 18 7.79086 18 10C18 10.1718 17.9903 10.3414 17.9713 10.5083C19.7072 10.7643 21 12.2287 21 14C21 15.933 19.433 17.5 17.5 17.5"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path d="M12 16V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill={color} />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 6L6 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertCircleIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
    <path d="M12 8V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1" fill={color} />
  </svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.26 20.56 2.56 20.74C2.86 20.92 3.2 21.01 3.55 21H20.45C20.8 21.01 21.14 20.92 21.44 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.97 3.14C12.67 2.96 12.33 2.87 11.99 2.87C11.65 2.87 11.31 2.96 11.01 3.14C10.71 3.32 10.46 3.56 10.29 3.86Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 9V13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill={color} />
  </svg>
);

export const FileTextIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 2V8H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 13H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 17H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 9H8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke={color} strokeWidth="1.5" />
  </svg>
);

export const SaveIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M17 21V13H7V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 3V8H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlignLeftIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M17 10H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21 6H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21 14H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 18H3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, className, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5L19 12L12 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Icon map for dynamic access
export const iconMap: Record<string, React.FC<IconProps>> = {
  folder: FolderIcon,
  file: FileIcon,
  document: FileIcon,
  settings: GearIcon,
  gear: GearIcon,
  trash: TrashIcon,
  home: HomeIcon,
  upload: UploadIcon,
  download: DownloadIcon,
  search: SearchIcon,
  computer: ComputerIcon,
  globe: GlobeIcon,
  usb: UsbIcon,
  notepad: NotepadIcon,
  notes: NotepadIcon,
  calculator: CalculatorIcon,
  palette: PaletteIcon,
  music: MusicIcon,
  video: VideoIcon,
  camera: CameraIcon,
  printer: PrinterIcon,
  cloud: CloudIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  battery: BatteryIcon,
  volume: VolumeIcon,
  microphone: MicrophoneIcon,
  help: HelpIcon,
  terminal: TerminalIcon,
  word: WordIcon,
  excel: ExcelIcon,
  image: ImageIcon,
  wifi: WifiIcon,
  bluetooth: BluetoothIcon,
  play: PlayIcon,
  pause: PauseIcon,
  'skip-forward': SkipForwardIcon,
  'skip-back': SkipBackIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  close: CloseIcon,
  maximize: MaximizeIcon,
  minimize: MinimizeIcon,
  'chevron-left': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  'chevron-up': ChevronUpIcon,
  'chevron-down': ChevronDownIcon,
  grid: GridIcon,
  list: ListIcon,
  refresh: RefreshIcon,
  browser: BrowserIcon,
  weather: WeatherIcon,
  info: InfoIcon,
  x: XIcon,
  bell: BellIcon,
  'check-circle': CheckCircleIcon,
  'alert-circle': AlertCircleIcon,
  'alert-triangle': AlertTriangleIcon,
  'file-text': FileTextIcon,
  copy: CopyIcon,
  save: SaveIcon,
  'align-left': AlignLeftIcon,
  'arrow-right': ArrowRightIcon,
};

// Dynamic Icon component
export const Icon: React.FC<IconProps & { name: string }> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || FileIcon;
  return <IconComponent {...props} />;
};
