import { lazy } from 'react';
import type { AppDefinition } from '../types';

/* Each app is its own chunk. The shell — window manager, dock, menu bar — is
 * all the desktop needs to paint; an app's code is fetched when its window
 * first opens. Statically importing all eighteen put every app in the initial
 * bundle, so the desktop waited on Camera and the archive codec to appear.
 * WindowManager renders these inside a <Suspense> boundary. */
const FileManager = lazy(() => import('./file-manager/FileManager').then((m) => ({ default: m.FileManager })));
const Settings = lazy(() => import('./settings/Settings').then((m) => ({ default: m.Settings })));
const Calculator = lazy(() => import('./calculator/Calculator').then((m) => ({ default: m.Calculator })));
const Notes = lazy(() => import('./notes/Notes').then((m) => ({ default: m.Notes })));
const Calendar = lazy(() => import('./calendar/Calendar').then((m) => ({ default: m.Calendar })));
const Clock = lazy(() => import('./clock/Clock').then((m) => ({ default: m.Clock })));
const Terminal = lazy(() => import('./terminal/Terminal').then((m) => ({ default: m.Terminal })));
const MusicPlayer = lazy(() => import('./music-player/MusicPlayer').then((m) => ({ default: m.MusicPlayer })));
const VideoPlayer = lazy(() => import('./video-player/VideoPlayer').then((m) => ({ default: m.VideoPlayer })));
const Camera = lazy(() => import('./camera/Camera').then((m) => ({ default: m.Camera })));
const PhotoViewer = lazy(() => import('./photo-viewer/PhotoViewer').then((m) => ({ default: m.PhotoViewer })));
const Browser = lazy(() => import('./browser/Browser').then((m) => ({ default: m.Browser })));
const Weather = lazy(() => import('./weather/Weather').then((m) => ({ default: m.Weather })));
const Trash = lazy(() => import('./trash/Trash').then((m) => ({ default: m.Trash })));
const TextEditor = lazy(() => import('./text-editor/TextEditor').then((m) => ({ default: m.TextEditor })));
const Preview = lazy(() => import('./preview/Preview').then((m) => ({ default: m.Preview })));
const Archive = lazy(() => import('./archive/Archive').then((m) => ({ default: m.Archive })));
const Screenshot = lazy(() => import('./screenshot/Screenshot').then((m) => ({ default: m.Screenshot })));

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
  trash: {
    id: 'trash',
    name: 'Trash',
    icon: 'trash',
    component: Trash,
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 350, height: 300 },
    singleInstance: true,
  },
  'text-editor': {
    id: 'text-editor',
    name: 'Text Editor',
    icon: 'file-text',
    component: TextEditor,
    defaultSize: { width: 700, height: 500 },
    minSize: { width: 400, height: 300 },
  },
  preview: {
    id: 'preview',
    name: 'Preview',
    icon: 'preview',
    component: Preview,
    defaultSize: { width: 760, height: 560 },
    minSize: { width: 380, height: 300 },
  },
  archive: {
    id: 'archive',
    name: 'Archive Utility',
    icon: 'archive',
    component: Archive,
    defaultSize: { width: 660, height: 460 },
    minSize: { width: 420, height: 320 },
  },
  screenshot: {
    id: 'screenshot',
    name: 'Screenshot',
    icon: 'screenshot',
    component: Screenshot,
    defaultSize: { width: 620, height: 440 },
    minSize: { width: 480, height: 360 },
    singleInstance: true,
  },
};

export const getAppById = (id: string): AppDefinition | undefined => {
  return appRegistry[id];
};

export const getAllApps = (): AppDefinition[] => {
  return Object.values(appRegistry);
};
