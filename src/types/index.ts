// Porcelain OS - TypeScript Type Definitions

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface WindowInstance {
  id: string;
  appId: string;
  title: string;
  position: Position;
  size: Size;
  minSize: Size;
  maxSize?: Size;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  props?: Record<string, unknown>;
  previousState?: {
    position: Position;
    size: Size;
  };
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType<AppProps>;
  defaultSize: Size;
  minSize: Size;
  maxSize?: Size;
  singleInstance?: boolean;
}

export interface AppProps {
  windowId: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  parentId: string | null;
  children?: string[];
  content?: string | Blob;
  mimeType?: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  icon?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
  tags: string[];
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  color: string;
  recurring?: RecurringPattern;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
}

export interface DesktopIcon {
  id: string;
  appId?: string;
  fileId?: string;
  name: string;
  icon: string;
  position: Position;
}

export interface UserSettings {
  wallpaper: string;
  wallpaperType: 'image' | 'color' | 'gradient';
  volume: number;
  brightness: number;
  accentColor: string;
  pinnedApps: string[];
  desktopIcons: DesktopIcon[];
  dockPosition: 'bottom' | 'left' | 'right';
  dockAutoHide: boolean;
  showSeconds: boolean;
  use24Hour: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  appId?: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

export type ViewMode = 'list' | 'grid' | 'columns';
export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';
