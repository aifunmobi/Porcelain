import type { AppDefinition } from '../types';
import { FileManager } from './file-manager/FileManager';
import { Settings } from './settings/Settings';
import { Calculator } from './calculator/Calculator';
import { Notes } from './notes/Notes';
import { Calendar } from './calendar/Calendar';
import { Clock } from './clock/Clock';
import { Terminal } from './terminal/Terminal';
import { MusicPlayer } from './music-player/MusicPlayer';
import { VideoPlayer } from './video-player/VideoPlayer';
import { Camera } from './camera/Camera';
import { PhotoViewer } from './photo-viewer/PhotoViewer';
import { Browser } from './browser/Browser';
import { Weather } from './weather/Weather';

export const appRegistry: Record<string, AppDefinition> = {
  'file-manager': {
    id: 'file-manager',
    name: 'Files',
    icon: 'folder',
    component: FileManager,
    defaultSize: { width: 800, height: 500 },
    minSize: { width: 400, height: 300 },
  },
  settings: {
    id: 'settings',
    name: 'Settings',
    icon: 'gear',
    component: Settings,
    defaultSize: { width: 700, height: 500 },
    minSize: { width: 500, height: 400 },
    singleInstance: true,
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    icon: 'calculator',
    component: Calculator,
    defaultSize: { width: 280, height: 420 },
    minSize: { width: 280, height: 420 },
    maxSize: { width: 400, height: 600 },
  },
  notes: {
    id: 'notes',
    name: 'Notes',
    icon: 'notepad',
    component: Notes,
    defaultSize: { width: 600, height: 450 },
    minSize: { width: 400, height: 300 },
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    icon: 'calendar',
    component: Calendar,
    defaultSize: { width: 700, height: 550 },
    minSize: { width: 500, height: 400 },
    singleInstance: true,
  },
  clock: {
    id: 'clock',
    name: 'Clock',
    icon: 'clock',
    component: Clock,
    defaultSize: { width: 350, height: 400 },
    minSize: { width: 300, height: 350 },
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    icon: 'terminal',
    component: Terminal,
    defaultSize: { width: 600, height: 400 },
    minSize: { width: 400, height: 250 },
  },
  'music-player': {
    id: 'music-player',
    name: 'Music',
    icon: 'music',
    component: MusicPlayer,
    defaultSize: { width: 400, height: 500 },
    minSize: { width: 320, height: 400 },
    singleInstance: true,
  },
  'video-player': {
    id: 'video-player',
    name: 'Video',
    icon: 'video',
    component: VideoPlayer,
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 400, height: 300 },
  },
  camera: {
    id: 'camera',
    name: 'Camera',
    icon: 'camera',
    component: Camera,
    defaultSize: { width: 500, height: 450 },
    minSize: { width: 400, height: 350 },
    singleInstance: true,
  },
  'photo-viewer': {
    id: 'photo-viewer',
    name: 'Photos',
    icon: 'image',
    component: PhotoViewer,
    defaultSize: { width: 600, height: 500 },
    minSize: { width: 400, height: 300 },
  },
  browser: {
    id: 'browser',
    name: 'Browser',
    icon: 'browser',
    component: Browser,
    defaultSize: { width: 900, height: 600 },
    minSize: { width: 600, height: 400 },
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    icon: 'weather',
    component: Weather,
    defaultSize: { width: 400, height: 550 },
    minSize: { width: 350, height: 450 },
    singleInstance: true,
  },
};

export const getAppById = (id: string): AppDefinition | undefined => {
  return appRegistry[id];
};

export const getAllApps = (): AppDefinition[] => {
  return Object.values(appRegistry);
};
